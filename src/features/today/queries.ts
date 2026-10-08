import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { composeDailyPlan, type StepStatus } from "@/features/today/plan";
import { contentLocale } from "@/lib/i18n";
import { dayKey } from "@/lib/utils/dates";
import type { DailySession, Profile, Puzzle, Story, StoryRegion, Thought } from "@/types/database";

export type TodayPlan = {
  day: string;
  session: DailySession;
  puzzle: Puzzle | null;
  story: Story | null;
  storyReason: string | null;
  thought: Thought | null;
  status: StepStatus;
};

/**
 * Loads (or creates, once per day) the player's Today plan, plus what they've already done.
 * Step status is derived from real records, never from client-side flags.
 */
export async function getToday(supabase: SupabaseClient, profile: Profile): Promise<TodayPlan> {
  const day = dayKey(new Date(), profile.timezone);
  const locale = contentLocale(profile);

  const { data: existing } = await supabase.from("daily_sessions").select("*").eq("user_id", profile.id).eq("day_key", day).maybeSingle();
  let session = existing as DailySession | null;

  if (!session) {
    const [{ data: puzzles }, { data: stories }, { data: thoughts }, { data: solved }, { data: reads }, { data: answered }] = await Promise.all([
      supabase.from("puzzles").select("id, rating, sort_order"),
      supabase.from("stories").select("id, category, region").eq("locale", locale),
      supabase.from("thoughts").select("id, sort_order").eq("locale", locale),
      supabase.from("puzzle_attempts").select("puzzle_id").eq("user_id", profile.id).eq("correct", true),
      supabase
        .from("story_reads")
        .select("story_id, completed_at, stories(category, region)")
        .eq("user_id", profile.id)
        .order("completed_at", { ascending: false })
        .limit(30),
      supabase.from("thought_answers").select("thought_id").eq("user_id", profile.id),
    ]);
    type ReadRow = { story_id: string; stories: { category: string; region: StoryRegion | null } | { category: string; region: StoryRegion | null }[] | null };
    const plan = composeDailyPlan({
      day,
      userId: profile.id,
      level: profile.chess_level,
      puzzles: (puzzles ?? []) as { id: string; rating: number; sort_order: number }[],
      solvedPuzzleIds: new Set(((solved ?? []) as { puzzle_id: string }[]).map((r) => r.puzzle_id)),
      stories: (stories ?? []) as { id: string; category: string; region: StoryRegion | null }[],
      reads: ((reads ?? []) as ReadRow[]).map((r) => {
        const s = Array.isArray(r.stories) ? r.stories[0] : r.stories;
        return { storyId: r.story_id, category: s?.category ?? "", region: s?.region ?? null };
      }),
      thoughts: (thoughts ?? []) as { id: string; sort_order: number }[],
      answeredThoughtIds: new Set(((answered ?? []) as { thought_id: string }[]).map((r) => r.thought_id)),
    });
    const admin = createAdminClient();
    const { data: created } = await admin
      .from("daily_sessions")
      .upsert({ user_id: profile.id, day_key: day, plan }, { onConflict: "user_id,day_key", ignoreDuplicates: true })
      .select("*")
      .maybeSingle();
    session =
      (created as DailySession | null) ??
      ((await supabase.from("daily_sessions").select("*").eq("user_id", profile.id).eq("day_key", day).maybeSingle()).data as DailySession | null);
    if (!session) throw new Error("Could not prepare today");
  }

  const plan = session.plan as DailySession["plan"] & { storyReason?: string | null };
  const [puzzle, story, thought, status] = await Promise.all([
    plan.puzzleId ? supabase.from("puzzles").select("*").eq("id", plan.puzzleId).maybeSingle().then((r) => r.data as Puzzle | null) : null,
    plan.storyId ? supabase.from("stories").select("*").eq("id", plan.storyId).maybeSingle().then((r) => r.data as Story | null) : null,
    plan.thoughtId ? supabase.from("thoughts").select("*").eq("id", plan.thoughtId).maybeSingle().then((r) => r.data as Thought | null) : null,
    getStepStatus(supabase, profile, day, session),
  ]);
  return { day, session, puzzle, story, storyReason: plan.storyReason ?? null, thought, status };
}

export async function getStepStatus(supabase: SupabaseClient, profile: Pick<Profile, "id" | "timezone">, day: string, session: Pick<DailySession, "reflected_at"> | null): Promise<StepStatus> {
  const [{ count: moves }, { count: reads }, { count: thoughts }, { data: games }] = await Promise.all([
    supabase.from("puzzle_attempts").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("day_key", day).in("outcome", ["solved", "revealed"]),
    supabase.from("story_reads").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("day_key", day),
    supabase.from("thought_answers").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("day_key", day),
    supabase.from("games").select("created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5),
  ]);
  const playedToday = ((games ?? []) as { created_at: string }[]).some((g) => dayKey(new Date(g.created_at), profile.timezone) === day);
  return {
    move: (moves ?? 0) > 0,
    remember: (reads ?? 0) > 0,
    think: (thoughts ?? 0) > 0,
    play: playedToday,
    reflect: Boolean(session?.reflected_at),
  };
}

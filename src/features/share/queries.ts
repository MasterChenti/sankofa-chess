import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { displayStreak } from "@/features/progress/rules";
import { dayKey } from "@/lib/utils/dates";
import type { DailySession, Profile, Puzzle, Story } from "@/types/database";

export const CARD_CODE = /^[a-z2-9]{8}$/;

export type ShareCard = {
  code: string;
  owner: { id: string; firstName: string; country: string; streak: number };
  story: {
    id: string;
    slug: string;
    symbol: string | null;
    title: string;
    place: string | null;
    era: string | null;
    excerpt: string;
    /** The story's opening situation, so a friend can decide without reading the whole story. */
    context: string[];
    question: string;
    options: { key: string; text: string }[];
  };
  ownerChoice: string | null;
  puzzle: { title: string; fen: string } | null;
};

/**
 * A shared daily card, by its unguessable code. Readable by anyone with the link, so it exposes
 * only what the card shows: first name, country, streak, the day's dilemma and position.
 * Never the private reflection.
 */
export async function getShareCard(code: string): Promise<ShareCard | null> {
  if (!CARD_CODE.test(code)) return null;
  const admin = createAdminClient();
  const { data: s } = await admin.from("daily_sessions").select("user_id, plan").eq("share_code", code).maybeSingle();
  const session = s as Pick<DailySession, "user_id" | "plan"> | null;
  if (!session?.plan?.storyId) return null;

  const [{ data: p }, { data: st }, { data: read }, { data: pz }] = await Promise.all([
    admin.from("profiles").select("id, display_name, country, streak, last_active_date, rest_week, timezone").eq("id", session.user_id).maybeSingle(),
    admin.from("stories").select("id, slug, symbol, title, place, era, excerpt, structure").eq("id", session.plan.storyId).maybeSingle(),
    admin.from("story_reads").select("think_choice").eq("user_id", session.user_id).eq("story_id", session.plan.storyId).maybeSingle(),
    session.plan.puzzleId ? admin.from("puzzles").select("title, fen").eq("id", session.plan.puzzleId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const profile = p as Pick<Profile, "id" | "display_name" | "country" | "streak" | "last_active_date" | "rest_week" | "timezone"> | null;
  const story = st as Pick<Story, "id" | "slug" | "symbol" | "title" | "place" | "era" | "excerpt" | "structure"> | null;
  if (!profile || !story?.structure) return null;

  return {
    code,
    owner: {
      id: profile.id,
      firstName: profile.display_name.split(" ")[0] || "A friend",
      country: profile.country,
      streak: displayStreak(profile.last_active_date, dayKey(new Date(), profile.timezone), profile.streak, profile.rest_week),
    },
    story: {
      id: story.id,
      slug: story.slug,
      symbol: story.symbol,
      title: story.title,
      place: story.place,
      era: story.era,
      excerpt: story.excerpt,
      context: story.structure.sections[0]?.body ?? [],
      question: story.structure.think.question,
      options: story.structure.think.options.map((o) => ({ key: o.key, text: o.text })),
    },
    ownerChoice: (read as { think_choice: string | null } | null)?.think_choice ?? null,
    puzzle: (pz as Pick<Puzzle, "title" | "fen"> | null) ?? null,
  };
}

/** How everyone answered a story's dilemma: players who read it plus people who answered from a card. */
export async function dilemmaSplit(storyId: string): Promise<{ total: number; byKey: Record<string, number> }> {
  const admin = createAdminClient();
  const [{ data: reads }, { data: votes }] = await Promise.all([
    admin.from("story_reads").select("think_choice").eq("story_id", storyId).not("think_choice", "is", null).limit(20000),
    admin.from("dilemma_votes").select("choice").eq("story_id", storyId).limit(20000),
  ]);
  const byKey: Record<string, number> = {};
  for (const r of (reads ?? []) as { think_choice: string }[]) byKey[r.think_choice] = (byKey[r.think_choice] ?? 0) + 1;
  for (const v of (votes ?? []) as { choice: string }[]) byKey[v.choice] = (byKey[v.choice] ?? 0) + 1;
  return { total: Object.values(byKey).reduce((a, b) => a + b, 0), byKey };
}

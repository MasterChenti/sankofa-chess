import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Achievement, Challenge, Profile, UserChallenge } from "@/types/database";
import { dayKey, periodKey, weekKeyFromDay } from "@/lib/utils/dates";
import { levelForXp, nextStreak, XP, type Pillar } from "@/features/progress/rules";

export type ProgressEvent =
  | { kind: "puzzle"; correct: boolean; firstAttempt: boolean; firstSolveEver: boolean; firstSolveToday: boolean }
  | { kind: "lesson"; firstCompletion: boolean }
  | { kind: "game"; outcome: "win" | "loss" | "draw"; rated: boolean; ratingAfter: number | null; xp: number; online?: boolean }
  | { kind: "review" }
  | { kind: "story"; firstRead: boolean }
  | { kind: "thought"; firstAnswer: boolean }
  | { kind: "reflection" }
  | { kind: "day" };

export type ProgressResult = {
  xpGained: number;
  totalXp: number;
  level: number;
  levelName: string;
  leveledUp: boolean;
  streak: number;
  completedChallenges: { title: string; rewardXp: number }[];
  newAchievements: { name: string; icon: string }[];
};

type XpLine = { amount: number; reason: string; pillar: Pillar | null };

const CHALLENGE_PILLAR: Record<Challenge["metric"], Pillar> = {
  puzzles_solved: "think",
  games_played: "play",
  lessons_completed: "think",
  win_after_lesson: "play",
  stories_read: "remember",
};

/**
 * Applies one validated progress event for a player: XP (by pillar), streak, counters,
 * challenge progress and achievements. Call ONLY from server code after the
 * event itself has been verified (legal moves, correct solution, etc.).
 */
export async function applyProgress(admin: SupabaseClient, userId: string, event: ProgressEvent): Promise<ProgressResult> {
  const { data: profileData, error } = await admin.from("profiles").select("*").eq("id", userId).single();
  if (error || !profileData) throw new Error("Profile not found");
  const profile = profileData as Profile;

  const now = new Date();
  const today = dayKey(now, profile.timezone);
  const patch: Partial<Profile> = {};
  const xpLines: XpLine[] = [];

  // Streak: any meaningful activity counts as sharpening your mind today.
  const s = nextStreak(profile.last_active_date, today, profile.streak, profile.rest_week);
  patch.streak = s.streak;
  patch.rest_week = s.restWeek;
  patch.best_streak = Math.max(profile.best_streak, s.streak);
  patch.last_active_date = today;

  const increments: Partial<Record<Challenge["metric"], number>> = {};
  switch (event.kind) {
    case "puzzle":
      if (event.firstAttempt) {
        patch.puzzle_first_attempts = profile.puzzle_first_attempts + 1;
        if (event.correct) patch.puzzle_first_correct = profile.puzzle_first_correct + 1;
        const run = event.correct ? profile.puzzle_run + 1 : 0;
        patch.puzzle_run = run;
        patch.best_puzzle_run = Math.max(profile.best_puzzle_run, run);
      }
      if (event.correct && event.firstSolveEver) {
        patch.puzzles_solved = profile.puzzles_solved + 1;
        xpLines.push({ amount: event.firstAttempt ? XP.puzzleFirstTry : XP.puzzleSolved, reason: "Puzzle solved", pillar: "think" });
      }
      if (event.correct && event.firstSolveToday) increments.puzzles_solved = 1;
      break;
    case "lesson":
      if (event.firstCompletion) {
        patch.lessons_completed = profile.lessons_completed + 1;
        xpLines.push({ amount: XP.lessonCompleted, reason: "Lesson completed", pillar: "think" });
        increments.lessons_completed = 1;
      }
      break;
    case "game":
      increments.games_played = 1;
      if (event.rated) {
        patch.games_played = profile.games_played + 1;
        if (event.outcome === "win") patch.wins = profile.wins + 1;
        if (event.outcome === "loss") patch.losses = profile.losses + 1;
        if (event.outcome === "draw") patch.draws = profile.draws + 1;
        if (event.ratingAfter != null) {
          patch.rating = event.ratingAfter;
          patch.peak_rating = Math.max(profile.peak_rating, event.ratingAfter);
        }
      }
      if (event.online) patch.online_games = profile.online_games + 1;
      if (event.xp > 0) xpLines.push({ amount: event.xp, reason: event.outcome === "win" ? "Game won" : "Game played", pillar: "play" });
      if (event.outcome === "win") increments.win_after_lesson = 1;
      break;
    case "review":
      patch.games_reviewed = profile.games_reviewed + 1;
      xpLines.push({ amount: XP.gameReviewed, reason: "Game reviewed", pillar: "reflect" });
      break;
    case "story":
      if (event.firstRead) {
        patch.stories_read = profile.stories_read + 1;
        xpLines.push({ amount: XP.storyRead, reason: "Story read", pillar: "remember" });
        increments.stories_read = 1;
      }
      break;
    case "thought":
      if (event.firstAnswer) {
        patch.thoughts_answered = profile.thoughts_answered + 1;
        xpLines.push({ amount: XP.thoughtAnswered, reason: "Strategic question", pillar: "think" });
      }
      break;
    case "reflection":
      patch.reflections = profile.reflections + 1;
      xpLines.push({ amount: XP.reflection, reason: "Reflection", pillar: "reflect" });
      break;
    case "day":
      patch.days_sharpened = profile.days_sharpened + 1;
      xpLines.push({ amount: XP.daySharpened, reason: "Mind sharpened today", pillar: "reflect" });
      break;
  }

  // Challenges
  const completedChallenges: ProgressResult["completedChallenges"] = [];
  const metrics = Object.keys(increments) as Challenge["metric"][];
  if (metrics.length) {
    const { data: chData } = await admin.from("challenges").select("*").eq("active", true).in("metric", metrics);
    const challenges = (chData ?? []) as Challenge[];
    const week = weekKeyFromDay(today);

    for (const ch of challenges) {
      const pk = periodKey(ch.period, today);
      if (ch.metric === "win_after_lesson") {
        // Only counts if a lesson was completed earlier this week.
        const { data: learnRows } = await admin
          .from("user_challenges")
          .select("progress, challenges!inner(metric)")
          .eq("user_id", userId)
          .eq("period_key", week)
          .eq("challenges.metric", "lessons_completed");
        const learnedThisWeek = (learnRows ?? []).some((r: { progress: number }) => r.progress > 0);
        if (!learnedThisWeek) continue;
      }
      const { data: existing } = await admin
        .from("user_challenges")
        .select("*")
        .eq("user_id", userId)
        .eq("challenge_id", ch.id)
        .eq("period_key", pk)
        .maybeSingle();
      const row = existing as UserChallenge | null;
      if (row?.completed) continue;
      const progress = Math.min(ch.target, (row?.progress ?? 0) + (increments[ch.metric] ?? 0));
      const completed = progress >= ch.target;
      await admin.from("user_challenges").upsert(
        {
          user_id: userId,
          challenge_id: ch.id,
          period_key: pk,
          progress,
          completed,
          completed_at: completed ? now.toISOString() : null,
        },
        { onConflict: "user_id,challenge_id,period_key" },
      );
      if (completed) {
        completedChallenges.push({ title: ch.title, rewardXp: ch.reward_xp });
        xpLines.push({ amount: ch.reward_xp, reason: `Challenge: ${ch.title}`, pillar: CHALLENGE_PILLAR[ch.metric] });
      }
    }
  }

  // XP and level
  const xpGained = xpLines.reduce((sum, l) => sum + l.amount, 0);
  const totalXp = profile.xp + xpGained;
  const before = levelForXp(profile.xp);
  const after = levelForXp(totalXp);
  patch.xp = totalXp;
  patch.sankofa_level = after.level;

  // Achievements (evaluated on the updated profile)
  const merged = { ...profile, ...patch } as Profile;
  const metricValue: Record<string, number> = {
    wins: merged.wins,
    puzzles_solved: merged.puzzles_solved,
    best_streak: merged.best_streak,
    games_played: merged.games_played,
    lessons_completed: merged.lessons_completed,
    games_reviewed: merged.games_reviewed,
    best_puzzle_run: merged.best_puzzle_run,
    sankofa_level: merged.sankofa_level,
    stories_read: merged.stories_read,
    thoughts_answered: merged.thoughts_answered,
    days_sharpened: merged.days_sharpened,
    online_games: merged.online_games,
  };
  const newAchievements: ProgressResult["newAchievements"] = [];
  const [{ data: achData }, { data: earnedData }] = await Promise.all([
    admin.from("achievements").select("*"),
    admin.from("user_achievements").select("achievement_id").eq("user_id", userId),
  ]);
  const earned = new Set((earnedData ?? []).map((r: { achievement_id: string }) => r.achievement_id));
  const toAward = ((achData ?? []) as Achievement[]).filter(
    (a) => !earned.has(a.id) && (metricValue[a.requirement.metric] ?? 0) >= a.requirement.count,
  );
  if (toAward.length) {
    await admin
      .from("user_achievements")
      .upsert(toAward.map((a) => ({ user_id: userId, achievement_id: a.id })), { onConflict: "user_id,achievement_id", ignoreDuplicates: true });
    newAchievements.push(...toAward.map((a) => ({ name: a.name, icon: a.icon })));
  }

  const { error: updateError } = await admin.from("profiles").update(patch).eq("id", userId);
  if (updateError) throw new Error("Could not save progress");
  if (xpLines.length) {
    await admin.from("xp_events").insert(xpLines.map((l) => ({ user_id: userId, amount: l.amount, reason: l.reason, pillar: l.pillar })));
  }

  return {
    xpGained,
    totalXp,
    level: after.level,
    levelName: after.name,
    leveledUp: after.level > before.level,
    streak: s.streak,
    completedChallenges,
    newAchievements,
  };
}

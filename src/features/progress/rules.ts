/**
 * Pure progression rules — levels, XP, rating, streaks.
 * No I/O here so every rule is unit-tested (rules.test.ts).
 */
import { previousDayKey, weekKeyFromDay } from "@/lib/utils/dates";

export const SANKOFA_LEVELS = [
  { level: 1, name: "Seed", minXp: 0 },
  { level: 2, name: "Learner", minXp: 100 },
  { level: 3, name: "Builder", minXp: 250 },
  { level: 4, name: "Strategist", minXp: 500 },
  { level: 5, name: "Challenger", minXp: 900 },
  { level: 6, name: "Competitor", minXp: 1400 },
  { level: 7, name: "Master", minXp: 2000 },
] as const;

export type LevelInfo = {
  level: number;
  name: string;
  minXp: number;
  next: { level: number; name: string; minXp: number } | null;
  /** 0–100 progress toward the next level */
  progress: number;
};

export function levelForXp(xp: number): LevelInfo {
  let current: (typeof SANKOFA_LEVELS)[number] = SANKOFA_LEVELS[0];
  for (const l of SANKOFA_LEVELS) if (xp >= l.minXp) current = l;
  const next = SANKOFA_LEVELS.find((l) => l.minXp > xp) ?? null;
  const progress = next ? Math.round((100 * (xp - current.minXp)) / (next.minXp - current.minXp)) : 100;
  return { level: current.level, name: current.name, minXp: current.minXp, next: next ? { ...next } : null, progress };
}

export const XP = {
  puzzleFirstTry: 15,
  puzzleSolved: 8,
  lessonCompleted: 25,
  gamePlayed: 10,
  gameWonBonus: 15,
  gameDrawBonus: 5,
  gameReviewed: 5,
  storyRead: 12,
  thoughtAnswered: 8,
  reflection: 6,
  daySharpened: 20,
} as const;

/** The four pillars of a Sankofa day. XP is tracked per pillar so progress means "thinking better", not just "more XP". */
export type Pillar = "play" | "think" | "remember" | "reflect";
export const PILLARS: { key: Pillar; label: string; verb: string }[] = [
  { key: "play", label: "Play", verb: "Compete" },
  { key: "think", label: "Think", verb: "Solve" },
  { key: "remember", label: "Remember", verb: "Discover" },
  { key: "reflect", label: "Reflect", verb: "Learn" },
];

export const STARTING_RATING = { beginner: 800, intermediate: 1200, advanced: 1600 } as const;

/** Standard Elo update against a computer opponent's nominal rating. */
export function eloChange(rating: number, opponentRating: number, score: 0 | 0.5 | 1, gamesPlayed: number): number {
  const k = gamesPlayed < 20 ? 40 : 32; // provisional players move faster
  const expected = 1 / (1 + 10 ** ((opponentRating - rating) / 400));
  return Math.round(k * (score - expected));
}

export function clampRating(r: number) {
  return Math.max(100, Math.min(3500, r));
}

/**
 * Streak after activity on `today`. Humane by design: one missed day per ISO week is forgiven
 * (a "rest day"), so the streak rewards habit without punishing a single busy day.
 */
export function nextStreak(
  lastActiveDay: string | null,
  today: string,
  currentStreak: number,
  restWeek: string | null = null,
): { streak: number; restWeek: string | null } {
  if (lastActiveDay === today) return { streak: Math.max(1, currentStreak), restWeek };
  if (lastActiveDay && previousDayKey(today) === lastActiveDay) return { streak: currentStreak + 1, restWeek };
  const week = weekKeyFromDay(today);
  if (lastActiveDay && previousDayKey(previousDayKey(today)) === lastActiveDay && restWeek !== week && currentStreak > 0) {
    return { streak: currentStreak + 1, restWeek: week };
  }
  return { streak: 1, restWeek };
}

/** Streak shown to the user: alive if they were active today, yesterday, or the day before with a rest day available. */
export function displayStreak(lastActiveDay: string | null, today: string, storedStreak: number, restWeek: string | null = null): number {
  if (!lastActiveDay) return 0;
  if (lastActiveDay === today || previousDayKey(today) === lastActiveDay) return storedStreak;
  if (previousDayKey(previousDayKey(today)) === lastActiveDay && restWeek !== weekKeyFromDay(today)) return storedStreak;
  return 0;
}

export function gameXp(outcome: "win" | "loss" | "draw", rated: boolean): number {
  if (!rated) return 0;
  return XP.gamePlayed + (outcome === "win" ? XP.gameWonBonus : outcome === "draw" ? XP.gameDrawBonus : 0);
}

export function puzzleAccuracy(firstAttempts: number, firstCorrect: number): number | null {
  return firstAttempts ? Math.round((100 * firstCorrect) / firstAttempts) : null;
}

export function winRate(games: number, wins: number): number | null {
  return games ? Math.round((100 * wins) / games) : null;
}

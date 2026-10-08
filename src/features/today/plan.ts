/**
 * Composes "Today": one puzzle, one story, one strategic question.
 * Pure and deterministic (same player + same day = same plan), so it is unit-tested
 * and can later be pre-computed for offline Morning Mode packages.
 *
 * Discovery is curated, not an infinite feed: we lean toward what the player enjoys,
 * but deliberately rotate regions so Africa is never one story.
 */
import type { ChessLevel, StoryRegion } from "@/types/database";

export type PlanPuzzle = { id: string; rating: number; sort_order: number };
export type PlanStory = { id: string; category: string; region: StoryRegion | null };
export type PlanThought = { id: string; sort_order: number };

export type PlanInput = {
  day: string;
  userId: string;
  level: ChessLevel;
  puzzles: PlanPuzzle[];
  solvedPuzzleIds: Set<string>;
  stories: PlanStory[];
  /** Most recent first. */
  reads: { storyId: string; category: string; region: StoryRegion | null }[];
  thoughts: PlanThought[];
  answeredThoughtIds: Set<string>;
};

export type ComposedPlan = {
  puzzleId: string | null;
  storyId: string | null;
  storyReason: string | null;
  thoughtId: string | null;
};

/** Small, stable string hash (FNV-1a). */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const BAND: Record<ChessLevel, [number, number]> = {
  beginner: [0, 850],
  intermediate: [600, 1200],
  advanced: [900, 3000],
};

export const REGION_LABEL: Record<StoryRegion, string> = {
  west: "West Africa",
  east: "East Africa",
  north: "North Africa",
  central: "Central Africa",
  southern: "Southern Africa",
  diaspora: "the diaspora",
  "pan-african": "across Africa",
};

const CATEGORY_LABEL: Record<string, string> = {
  history: "history",
  strategy: "strategy",
  thinkers: "great thinkers",
  innovation: "innovation",
  culture: "culture",
  chess: "chess",
};

export function composeDailyPlan(input: PlanInput): ComposedPlan {
  const seed = hash(`${input.day}:${input.userId}`);

  // MOVE — an unsolved puzzle in the player's band; gentle rotation for variety.
  const [lo, hi] = BAND[input.level];
  const unsolved = input.puzzles.filter((p) => !input.solvedPuzzleIds.has(p.id)).sort((a, b) => a.rating - b.rating || a.sort_order - b.sort_order);
  const inBand = unsolved.filter((p) => p.rating >= lo && p.rating <= hi);
  const pool = inBand.length ? inBand : unsolved;
  const puzzle = pool.length
    ? pool[seed % Math.min(3, pool.length)]
    : input.puzzles.length
      ? [...input.puzzles].sort((a, b) => a.sort_order - b.sort_order)[seed % input.puzzles.length]
      : null;

  // REMEMBER — curated: unread first, favour enjoyed themes, avoid repeating the last region.
  const readIds = new Set(input.reads.map((r) => r.storyId));
  const affinity = new Map<string, number>();
  input.reads.slice(0, 12).forEach((r) => affinity.set(r.category, (affinity.get(r.category) ?? 0) + 1));
  const lastRegion = input.reads[0]?.region ?? null;
  const seenRegions = new Set(input.reads.map((r) => r.region));
  const unread = input.stories.filter((s) => !readIds.has(s.id));
  let story: PlanStory | null = null;
  let storyReason: string | null = null;
  if (unread.length) {
    const scored = unread
      .map((s) => {
        let score = 1 + Math.min(3, affinity.get(s.category) ?? 0) * 0.6;
        if (s.region && s.region === lastRegion) score -= 1.5;
        if (s.region && !seenRegions.has(s.region)) score += 0.8;
        return { s, score: score + (hash(`${seed}:${s.id}`) % 100) / 1000 };
      })
      .sort((a, b) => b.score - a.score);
    story = scored[0].s;
    const fav = story.category && (affinity.get(story.category) ?? 0) >= 2;
    if (input.reads.length === 0) storyReason = "Start here";
    else if (story.region && !seenRegions.has(story.region)) storyReason = `New for you: ${REGION_LABEL[story.region]}`;
    else if (fav) storyReason = `Because you enjoy ${CATEGORY_LABEL[story.category] ?? story.category}`;
  } else if (input.stories.length) {
    story = input.stories[seed % input.stories.length];
    storyReason = "Worth revisiting";
  }

  // THINK — next unanswered question, then rotate.
  const thoughts = [...input.thoughts].sort((a, b) => a.sort_order - b.sort_order);
  const openThoughts = thoughts.filter((t) => !input.answeredThoughtIds.has(t.id));
  const thought = openThoughts[0] ?? (thoughts.length ? thoughts[seed % thoughts.length] : null);

  return { puzzleId: puzzle?.id ?? null, storyId: story?.id ?? null, storyReason, thoughtId: thought?.id ?? null };
}

export type StepKey = "move" | "remember" | "think" | "play" | "reflect";
export const STEPS: { key: StepKey; label: string; minutes: number; core: boolean }[] = [
  { key: "move", label: "Move", minutes: 3, core: true },
  { key: "remember", label: "Remember", minutes: 4, core: true },
  { key: "think", label: "Think", minutes: 2, core: true },
  { key: "play", label: "Play", minutes: 5, core: false },
  { key: "reflect", label: "Reflect", minutes: 1, core: true },
];

export type StepStatus = Record<StepKey, boolean>;

/** A day is "sharpened" when the four core steps are done. Playing is a bonus: games don't fit every commute. */
export function isDayComplete(s: StepStatus) {
  return STEPS.filter((x) => x.core).every((x) => s[x.key]);
}

export function nextStep(s: StepStatus): StepKey | "done" {
  const order: StepKey[] = ["move", "remember", "think", "reflect"];
  const pending = order.find((k) => !s[k]);
  if (!pending) return "done";
  // Offer Play right before reflecting, once, if it hasn't happened yet.
  if (pending === "reflect" && !s.play) return "play";
  return pending;
}

export function minutesLeft(s: StepStatus) {
  return STEPS.filter((x) => x.core && !s[x.key]).reduce((m, x) => m + x.minutes, 0);
}

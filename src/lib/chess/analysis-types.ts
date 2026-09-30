import type { Color } from "@/types/database";

export type MoveClass = "best" | "good" | "inaccuracy" | "mistake" | "blunder";

export const MOVE_CLASS_LABEL: Record<MoveClass, string> = {
  best: "Best",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

/** Engine layer — raw facts about each move. */
export type PlyAnalysis = {
  san: string;
  uci: string;
  color: Color;
  fenBefore: string;
  /** Evaluation after the move, White's perspective, centipawns (clamped ±1500). */
  evalWhite: number;
  /** Centipawns lost versus the engine's best move (≥ 0). */
  loss: number;
  cls: MoveClass;
  bestUci: string | null;
  bestSan: string | null;
};

/** Human layer — what the player reads. */
export type Coaching = {
  headline: string;
  what: string;
  why: string;
  next: string;
  lessonSlug: string | null;
  keyPly: number | null;
  keyMoveLabel: string | null; // e.g. "14..."
  keyMoveSan: string | null;
  keyBestSan: string | null;
  keyBestUci: string | null;
  keyFen: string | null;
};

export type GameAnalysis = {
  version: 1;
  engine: string;
  depth: number;
  accuracy: number;
  opponentAccuracy: number;
  counts: Record<MoveClass, number>;
  plies: PlyAnalysis[];
  coaching: Coaching;
};

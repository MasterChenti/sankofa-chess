/**
 * Engine abstraction. UI and coaching code depend on this interface only,
 * so Stockfish can be upgraded or replaced (server engine, cloud eval) later.
 */
import type { Persona } from "@/lib/chess/personas";

export type EngineLine = {
  /** Centipawns from the side to move's perspective (null when mate is set). */
  cp: number | null;
  /** Mate in N from side to move's perspective (negative = being mated). */
  mate: number | null;
  pv: string[]; // UCI
  depth: number;
};

export type EngineAnalysis = {
  bestMove: string | null; // UCI, null when no legal moves
  lines: EngineLine[];
};

export interface ChessEngine {
  readonly name: string;
  ready(): Promise<void>;
  analyse(fen: string, opts?: { depth?: number; movetimeMs?: number; multiPv?: number }): Promise<EngineAnalysis>;
  chooseMove(fen: string, persona: Persona): Promise<string | null>;
  dispose(): void;
}

export const MATE_SCORE = 10_000;

/** Single numeric score (cp) from the side to move's perspective; mates map to ±(10000 − N). */
export function lineScore(line: EngineLine | undefined): number {
  if (!line) return 0;
  if (line.mate != null) return line.mate > 0 ? MATE_SCORE - line.mate : -MATE_SCORE - line.mate;
  return line.cp ?? 0;
}

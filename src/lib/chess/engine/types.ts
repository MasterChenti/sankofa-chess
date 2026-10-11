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

export type SearchOptions = { depth?: number; movetimeMs?: number; multiPv?: number; skill?: number; limitElo?: number };

export interface ChessEngine {
  readonly name: string;
  /** True when the engine can no longer answer and must be replaced. */
  readonly dead?: boolean;
  ready(): Promise<void>;
  analyse(fen: string, opts?: SearchOptions): Promise<EngineAnalysis>;
  /** Resolves with a legal UCI move (null only when there is no legal move), or rejects with an EngineError. */
  chooseMove(fen: string, persona: Persona): Promise<string | null>;
  dispose(): void;
}

export type EngineErrorKind = "load" | "timeout" | "crashed" | "invalid";

/** Every engine failure is explicit, so the game can recover instead of waiting forever. */
export class EngineError extends Error {
  constructor(
    readonly kind: EngineErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "EngineError";
  }
}

export const MATE_SCORE = 10_000;

/** Single numeric score (cp) from the side to move's perspective; mates map to ±(10000 − N). */
export function lineScore(line: EngineLine | undefined): number {
  if (!line) return 0;
  if (line.mate != null) return line.mate > 0 ? MATE_SCORE - line.mate : -MATE_SCORE - line.mate;
  return line.cp ?? 0;
}

/**
 * ChessCoachService — the seam between the product and any AI provider.
 * UI code talks to /api/coach; the route picks a provider. Swap providers without touching UI.
 */
import type { GameAnalysis } from "@/lib/chess/analysis-types";
import type { GameRow } from "@/types/database";

export type CoachTurn = { role: "user" | "coach"; text: string };

export type CoachInput = {
  game: Pick<GameRow, "user_color" | "outcome" | "termination" | "opponent_name" | "opponent_rating" | "pgn" | "moves">;
  playerLevel: string;
  /** Position the player is looking at (FEN), if any. */
  position?: string | null;
  moves: string[];
  engineAnalysis: GameAnalysis;
  userQuestion: string;
  history: CoachTurn[];
  lessonTitle?: string | null;
};

export type CoachOutput = {
  /** The answer shown in the chat. */
  answer: string;
  summary: string;
  keyLesson: string;
  mistakes: { move: string; better: string | null; explanation: string }[];
  recommendations: string[];
  practicePosition: { fen: string; bestMove: string | null } | null;
  provider: "guided" | "ai";
};

export interface ChessCoachService {
  readonly id: "guided" | "ai";
  coach(input: CoachInput): Promise<CoachOutput>;
}

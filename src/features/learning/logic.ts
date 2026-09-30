import { Chess } from "chess.js";
import type { LessonContent } from "@/types/database";
import { uciToMove } from "@/lib/chess/rules";

/** A lesson exercise is passed by an accepted move, or any checkmate when the task asks for mate. */
export function checkLessonMove(content: Pick<LessonContent, "fen" | "accept" | "requireMate">, uci: string): boolean {
  const game = new Chess(content.fen);
  try {
    game.move(uciToMove(uci));
  } catch {
    return false;
  }
  if (content.requireMate) return game.isCheckmate();
  return content.accept.includes(uci);
}

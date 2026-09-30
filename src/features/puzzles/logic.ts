import { Chess } from "chess.js";
import { uciToMove } from "@/lib/chess/rules";

export type PuzzleSpec = { fen: string; solution: string[]; is_mate: boolean };

/**
 * Checks a line of moves against a puzzle.
 * Solver moves are at even indices; odd indices are the scripted replies.
 * For mate puzzles the final solver move may be ANY move that checkmates.
 */
export function checkPuzzleLine(p: PuzzleSpec, moves: string[]): "solved" | "partial" | "wrong" {
  const game = new Chess(p.fen);
  for (let i = 0; i < moves.length; i++) {
    const uci = moves[i];
    let mated = false;
    try {
      game.move(uciToMove(uci));
      mated = game.isCheckmate();
    } catch {
      return "wrong";
    }
    const solverMove = i % 2 === 0;
    const isLastSolverMove = i === p.solution.length - 1;
    if (solverMove) {
      const matches = uci === p.solution[i];
      const mateOk = p.is_mate && isLastSolverMove && mated;
      if (!matches && !mateOk) return "wrong";
    } else if (uci !== p.solution[i]) {
      return "wrong"; // replies must follow the script
    }
    if (i === p.solution.length - 1) return i === moves.length - 1 ? "solved" : "wrong";
  }
  return "partial";
}

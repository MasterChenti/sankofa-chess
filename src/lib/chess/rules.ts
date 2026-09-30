import { Chess } from "chess.js";
import type { Color } from "@/types/database";

export type Termination =
  | "checkmate"
  | "stalemate"
  | "insufficient"
  | "threefold"
  | "fifty-move"
  | "resignation"
  | "timeout"
  | "agreement";

export type GameResult = "1-0" | "0-1" | "1/2-1/2";

export const TERMINATION_LABEL: Record<Termination, string> = {
  checkmate: "checkmate",
  stalemate: "stalemate",
  insufficient: "insufficient material",
  threefold: "threefold repetition",
  "fifty-move": "the fifty-move rule",
  resignation: "resignation",
  timeout: "time",
  agreement: "agreement",
};

export function uciToMove(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined };
}

/** Replays UCI moves; returns null if any move is illegal. */
export function replay(moves: string[], startFen?: string): Chess | null {
  const game = startFen ? new Chess(startFen) : new Chess();
  for (const uci of moves) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
    try {
      game.move(uciToMove(uci));
    } catch {
      return null;
    }
  }
  return game;
}

/** Natural end state of a position, if the rules end the game. */
export function naturalEnd(game: Chess): { result: GameResult; termination: Termination } | null {
  if (game.isCheckmate()) return { result: game.turn() === "w" ? "0-1" : "1-0", termination: "checkmate" };
  if (game.isStalemate()) return { result: "1/2-1/2", termination: "stalemate" };
  if (game.isInsufficientMaterial()) return { result: "1/2-1/2", termination: "insufficient" };
  if (game.isThreefoldRepetition()) return { result: "1/2-1/2", termination: "threefold" };
  if (game.isDrawByFiftyMoves()) return { result: "1/2-1/2", termination: "fifty-move" };
  return null;
}

/** Can this side still, in principle, deliver checkmate? (FIDE timeout rule.) */
export function hasMatingMaterial(game: Chess, color: Color): boolean {
  const pieces: string[] = [];
  for (const row of game.board()) for (const sq of row) if (sq && sq.color === color && sq.type !== "k") pieces.push(sq.type);
  if (pieces.some((p) => p === "p" || p === "r" || p === "q")) return true;
  const minors = pieces.filter((p) => p === "n" || p === "b").length;
  // Simplification: a lone knight or bishop can't force mate.
  return minors >= 2;
}

/**
 * Server-side verification of a finished game. The client claims how the game ended;
 * we replay every move and only accept results consistent with the rules.
 */
export function verifyFinishedGame(input: {
  moves: string[];
  termination: Termination;
  /** For resignation/timeout: the side that resigned or flagged. */
  loser?: Color;
}): { ok: true; result: GameResult; termination: Termination; fen: string; pgn: string } | { ok: false; error: string } {
  const game = replay(input.moves);
  if (!game) return { ok: false, error: "Illegal move sequence" };
  const natural = naturalEnd(game);

  if (natural) {
    // The rules already decided this game; the claim must match.
    if (natural.termination !== input.termination) return { ok: false, error: "Result does not match the position" };
    return { ok: true, ...natural, fen: game.fen(), pgn: game.pgn() };
  }

  switch (input.termination) {
    case "resignation":
      if (!input.loser) return { ok: false, error: "Missing resigning side" };
      return { ok: true, result: input.loser === "w" ? "0-1" : "1-0", termination: "resignation", fen: game.fen(), pgn: game.pgn() };
    case "timeout": {
      if (!input.loser) return { ok: false, error: "Missing flagged side" };
      const winner: Color = input.loser === "w" ? "b" : "w";
      const result: GameResult = hasMatingMaterial(game, winner) ? (winner === "w" ? "1-0" : "0-1") : "1/2-1/2";
      return { ok: true, result, termination: "timeout", fen: game.fen(), pgn: game.pgn() };
    }
    case "agreement":
      if (input.moves.length < 2) return { ok: false, error: "Too early for a draw" };
      return { ok: true, result: "1/2-1/2", termination: "agreement", fen: game.fen(), pgn: game.pgn() };
    default:
      return { ok: false, error: "Game is not over" };
  }
}

export function outcomeFor(result: GameResult, color: Color): "win" | "loss" | "draw" {
  if (result === "1/2-1/2") return "draw";
  return (result === "1-0") === (color === "w") ? "win" : "loss";
}

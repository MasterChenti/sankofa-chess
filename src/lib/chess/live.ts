/**
 * Pure rules for games between two people. The server is the only authority:
 * it replays moves, runs the clocks and decides results. Unit-tested in live.test.ts.
 */
import { Chess } from "chess.js";
import type { LiveGame, LiveMode } from "@/types/database";
import { naturalEnd, uciToMove, type GameResult, type Termination } from "@/lib/chess/rules";

export const LIVE_MODES: Record<LiveMode, { label: string; detail: string; initialMs: number; incrementMs: number; perMove: boolean }> = {
  blitz: { label: "Blitz", detail: "3 min + 2 s", initialMs: 3 * 60_000, incrementMs: 2_000, perMove: false },
  rapid: { label: "Rapid", detail: "10 min", initialMs: 10 * 60_000, incrementMs: 0, perMove: false },
  daily: { label: "Daily", detail: "1 move a day", initialMs: 24 * 3_600_000, incrementMs: 0, perMove: true },
};

export type LiveClockState = {
  mode: LiveMode;
  moves: string[];
  white_ms: number;
  black_ms: number;
  turn_started_at: string | null;
};

export type LiveMoveOutcome =
  | {
      ok: true;
      moves: string[];
      fen: string;
      white_ms: number;
      black_ms: number;
      turn_started_at: string | null;
      end: { result: GameResult; termination: Termination } | null;
    }
  | { ok: false; reason: "not-your-turn" | "illegal" | "flagged"; flagged?: { result: GameResult; termination: Termination } };

/** Clocks start once both sides have moved (as on most platforms). */
export function clockRunning(plyCount: number) {
  return plyCount >= 2;
}

export function sideToMove(moves: string[]): "w" | "b" {
  return moves.length % 2 === 0 ? "w" : "b";
}

/** Remaining time for each side at `nowMs`, counting down the side to move. */
export function clocksAt(state: LiveClockState, nowMs: number): { w: number; b: number } {
  const turn = sideToMove(state.moves);
  const running = clockRunning(state.moves.length) && state.turn_started_at;
  const elapsed = running ? Math.max(0, nowMs - new Date(state.turn_started_at!).getTime()) : 0;
  return {
    w: state.white_ms - (turn === "w" ? elapsed : 0),
    b: state.black_ms - (turn === "b" ? elapsed : 0),
  };
}

/** If the side to move has run out of time, who lost? */
export function flagged(state: LiveClockState, nowMs: number): { result: GameResult; termination: Termination } | null {
  if (!clockRunning(state.moves.length)) return null;
  const turn = sideToMove(state.moves);
  const left = clocksAt(state, nowMs)[turn];
  if (left > 0) return null;
  return { result: turn === "w" ? "0-1" : "1-0", termination: "timeout" };
}

export function applyLiveMove(state: LiveClockState, uci: string, by: "w" | "b", nowMs: number): LiveMoveOutcome {
  if (sideToMove(state.moves) !== by) return { ok: false, reason: "not-your-turn" };
  const flag = flagged(state, nowMs);
  if (flag) return { ok: false, reason: "flagged", flagged: flag };
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return { ok: false, reason: "illegal" };

  const game = new Chess();
  try {
    for (const m of state.moves) game.move(uciToMove(m));
    game.move(uciToMove(uci));
  } catch {
    return { ok: false, reason: "illegal" };
  }

  const cfg = LIVE_MODES[state.mode];
  const clocks = { w: state.white_ms, b: state.black_ms };
  if (clockRunning(state.moves.length)) {
    const left = clocksAt(state, nowMs)[by];
    clocks[by] = cfg.perMove ? cfg.initialMs : left + cfg.incrementMs;
  } else if (cfg.perMove) {
    clocks[by] = cfg.initialMs;
  }
  const moves = [...state.moves, uci];
  return {
    ok: true,
    moves,
    fen: game.fen(),
    white_ms: clocks.w,
    black_ms: clocks.b,
    turn_started_at: clockRunning(moves.length) ? new Date(nowMs).toISOString() : null,
    end: naturalEnd(game),
  };
}

/** Elo for a game between two people (both ratings move). */
export function liveRatingChanges(white: { rating: number; games: number }, black: { rating: number; games: number }, result: GameResult) {
  const sw = result === "1-0" ? 1 : result === "0-1" ? 0 : 0.5;
  const k = (g: number) => (g < 20 ? 40 : 32);
  const expW = 1 / (1 + 10 ** ((black.rating - white.rating) / 400));
  return {
    white: Math.round(k(white.games) * (sw - expW)),
    black: Math.round(k(black.games) * (1 - sw - (1 - expW))),
  };
}

export function formatPerMove(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `${h} h`;
  const m = Math.max(0, Math.floor(ms / 60_000));
  return `${m} min`;
}

/** Short human code for invite links: no ambiguous characters. */
export function inviteCode(rand: () => number = Math.random) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => alphabet[Math.floor(rand() * alphabet.length)]).join("");
}

/** Short status for lists of ongoing games. */
export function liveTurnLabel(game: Pick<LiveGame, "status" | "moves" | "white_id" | "black_id">, meId: string) {
  if (game.status === "waiting") return "Waiting for opponent";
  const mine = (sideToMove(game.moves) === "w" ? game.white_id : game.black_id) === meId;
  return mine ? "Your move" : "Their move";
}

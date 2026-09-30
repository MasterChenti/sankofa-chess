"use client";

import { Chess, type Move } from "chess.js";
import type { Persona } from "@/lib/chess/personas";
import type { ChessEngine, EngineAnalysis } from "@/lib/chess/engine/types";

const VALUE: Record<string, number> = { p: 100, n: 310, b: 320, r: 500, q: 900, k: 0 };

function material(game: Chess): number {
  // from side to move's perspective
  let s = 0;
  for (const row of game.board()) for (const sq of row) if (sq) s += (sq.color === game.turn() ? 1 : -1) * VALUE[sq.type];
  return s;
}

function scoreMove(game: Chess, m: Move): number {
  game.move(m);
  let score: number;
  if (game.isCheckmate()) score = 100_000;
  else if (game.isDraw()) score = 0;
  else {
    // opponent's best material reply (1-ply lookahead)
    let worst = Infinity;
    for (const r of game.moves({ verbose: true })) {
      game.move(r);
      const v = game.isCheckmate() ? -100_000 : material(game);
      game.undo();
      worst = Math.min(worst, v);
    }
    score = worst === Infinity ? 0 : worst;
  }
  game.undo();
  return score + Math.random() * 8;
}

/**
 * Lightweight backup opponent used only if the Stockfish worker can't start
 * (very old browsers, blocked WASM). Plays sensible, material-aware moves.
 */
export class FallbackEngine implements ChessEngine {
  readonly name = "Sankofa basic engine";
  async ready() {}

  async analyse(fen: string): Promise<EngineAnalysis> {
    const game = new Chess(fen);
    const moves = game.moves({ verbose: true });
    if (!moves.length) return { bestMove: null, lines: [] };
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const s = scoreMove(game, m);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    const uci = best.from + best.to + (best.promotion ?? "");
    const mate = bestScore >= 100_000 ? 1 : null;
    return { bestMove: uci, lines: [{ cp: mate ? null : Math.round(bestScore), mate, pv: [uci], depth: 2 }] };
  }

  async chooseMove(fen: string, persona: Persona): Promise<string | null> {
    const game = new Chess(fen);
    const moves = game.moves({ verbose: true });
    if (!moves.length) return null;
    if (Math.random() < persona.play.blunderRate * 2) {
      const m = moves[Math.floor(Math.random() * moves.length)];
      return m.from + m.to + (m.promotion ?? "");
    }
    return (await this.analyse(fen)).bestMove;
  }

  dispose() {}
}

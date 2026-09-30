"use client";

import { Chess } from "chess.js";
import type { Color } from "@/types/database";
import type { ChessEngine } from "@/lib/chess/engine/types";
import { lineScore, MATE_SCORE } from "@/lib/chess/engine/types";
import type { GameAnalysis, MoveClass, PlyAnalysis } from "@/lib/chess/analysis-types";
import { accuracyOf, buildCoaching, classify } from "@/lib/chess/coaching";
import { uciToMove } from "@/lib/chess/rules";

const CLAMP = 1500;
const clamp = (s: number) => Math.max(-CLAMP, Math.min(CLAMP, s));

/**
 * Engine pass over a finished game. Evaluates every position once (depth-limited),
 * derives per-move loss and classification, then hands off to the coaching layer.
 */
export async function analyzeGame(
  engine: ChessEngine,
  input: { moves: string[]; userColor: Color; outcome: "win" | "loss" | "draw"; termination: string },
  onProgress?: (done: number, total: number) => void,
  opts: { depth?: number; movetimeMs?: number } = { depth: 11, movetimeMs: 220 },
): Promise<GameAnalysis> {
  const game = new Chess();
  const fens: string[] = [game.fen()];
  const sans: string[] = [];
  for (const uci of input.moves) {
    const m = game.move(uciToMove(uci));
    sans.push(m.san);
    fens.push(game.fen());
  }

  // score[i] = eval of fens[i] from side-to-move perspective; best[i] = engine best move there
  const score: number[] = [];
  const best: (string | null)[] = [];
  const mateFlags: boolean[] = [];
  for (let i = 0; i < fens.length; i++) {
    const g = new Chess(fens[i]);
    if (g.isCheckmate()) {
      score.push(-MATE_SCORE);
      best.push(null);
      mateFlags.push(true);
    } else if (g.isDraw()) {
      score.push(0);
      best.push(null);
      mateFlags.push(false);
    } else {
      const a = await engine.analyse(fens[i], opts);
      score.push(lineScore(a.lines[0]));
      best.push(a.bestMove);
      mateFlags.push(a.lines[0]?.mate != null && a.lines[0].mate > 0);
    }
    onProgress?.(i + 1, fens.length);
  }

  const plies: PlyAnalysis[] = input.moves.map((uci, i) => {
    const color: Color = i % 2 === 0 ? "w" : "b";
    const bestScore = clamp(score[i]);
    const got = clamp(-score[i + 1]);
    const loss = Math.max(0, bestScore - got);
    let bestSan: string | null = null;
    if (best[i]) {
      try {
        bestSan = new Chess(fens[i]).move(uciToMove(best[i]!)).san;
      } catch {
        bestSan = null;
      }
    }
    return {
      san: sans[i],
      uci,
      color,
      fenBefore: fens[i],
      evalWhite: color === "w" ? got : -got,
      loss: best[i] === uci ? 0 : loss,
      cls: best[i] === uci ? "best" : classify(loss),
      bestUci: best[i],
      bestSan,
    };
  });

  const mine = plies.filter((p) => p.color === input.userColor);
  const theirs = plies.filter((p) => p.color !== input.userColor);
  const counts: Record<MoveClass, number> = { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
  mine.forEach((p) => counts[p.cls]++);

  // Opponent's best reply after the key move = engine best move in the following position.
  let keyIdx = -1;
  let worst = 0;
  plies.forEach((p, i) => {
    if (p.color === input.userColor && p.loss > worst) {
      worst = p.loss;
      keyIdx = i;
    }
  });
  const coaching = buildCoaching(plies, {
    userColor: input.userColor,
    outcome: input.outcome,
    termination: input.termination,
    replyAfterKey: keyIdx >= 0 ? best[keyIdx + 1] : null,
    replyIsMate: keyIdx >= 0 ? mateFlags[keyIdx + 1] : false,
  });

  return {
    version: 1,
    engine: engine.name,
    depth: opts.depth ?? 0,
    accuracy: accuracyOf(mine),
    opponentAccuracy: accuracyOf(theirs),
    counts,
    plies,
    coaching,
  };
}

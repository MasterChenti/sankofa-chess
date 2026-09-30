/**
 * Deterministic coaching layer: turns engine facts into "what happened → why → what next".
 * Pure and unit-tested; the AI coach builds on top of this, never replaces it.
 */
import { Chess, type Square } from "chess.js";
import type { Color } from "@/types/database";
import type { Coaching, GameAnalysis, MoveClass, PlyAnalysis } from "@/lib/chess/analysis-types";
import { uciToMove } from "@/lib/chess/rules";

const PIECE_NAME: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

export function classify(loss: number): MoveClass {
  if (loss <= 20) return "best";
  if (loss <= 60) return "good";
  if (loss <= 120) return "inaccuracy";
  if (loss <= 250) return "mistake";
  return "blunder";
}

export function accuracyOf(plies: PlyAnalysis[]): number {
  if (!plies.length) return 100;
  return Math.round(plies.reduce((s, p) => s + 100 * Math.exp(-Math.min(p.loss, 1000) / 260), 0) / plies.length);
}

function minorsAtHome(fen: string, color: Color): number {
  const g = new Chess(fen);
  const squares = color === "w" ? ["b1", "g1", "c1", "f1"] : ["b8", "g8", "c8", "f8"];
  return squares.filter((s) => {
    const p = g.get(s as Square);
    return p && p.color === color && (p.type === "n" || p.type === "b");
  }).length;
}

export type CoachingContext = {
  userColor: Color;
  outcome: "win" | "loss" | "draw";
  termination: string;
  /** Engine's best reply for the opponent right after the key move (UCI). */
  replyAfterKey?: string | null;
  replyIsMate?: boolean;
};

export function buildCoaching(plies: PlyAnalysis[], ctx: CoachingContext): Coaching {
  const me = ctx.userColor;
  const mine = plies.map((p, i) => ({ ...p, i })).filter((p) => p.color === me);
  const castled = mine.some((p) => p.san.startsWith("O-O"));
  const earlyQueen = mine.slice(0, 4).some((p) => p.san.startsWith("Q"));
  let keyIdx = -1;
  let worst = 0;
  mine.forEach((p) => {
    if (p.loss > worst) {
      worst = p.loss;
      keyIdx = p.i;
    }
  });

  const base: Coaching = {
    headline: "",
    what: "",
    why: "",
    next: "",
    lessonSlug: null,
    keyPly: null,
    keyMoveLabel: null,
    keyMoveSan: null,
    keyBestSan: null,
    keyBestUci: null,
    keyFen: null,
  };

  if (keyIdx < 0 || worst < 90) {
    const out = { ...base };
    out.headline = "You played a clean game.";
    out.what = "No serious mistakes: your moves stayed close to the best options throughout.";
    out.why = castled
      ? "You kept your king safe and your pieces coordinated, which kept the position easy to play."
      : "You avoided tactical errors even without castling — but that is harder to keep up against stronger opponents.";
    out.next =
      ctx.outcome === "win"
        ? "Try the next difficulty level. Clean games against stronger opponents are where rating comes from."
        : "Look for moments where you could have been more ambitious — a clean game can still be passive.";
    if (ctx.termination === "resignation" && ctx.outcome === "loss") {
      out.headline = "You resigned a position that was still playable.";
      out.why = "The engine found no serious mistakes in your moves. Resigning early turns a fair fight into a loss.";
      out.next = "Play on. Make your opponent prove the win — at every level, players miss chances when the game goes long.";
    }
    out.lessonSlug = castled ? "fork" : "king-safety";
    return out;
  }

  const k = plies[keyIdx];
  const moveNo = Math.floor(keyIdx / 2) + 1;
  const label = `${moveNo}${me === "w" ? "." : "..."}`;

  // What the opponent could do next
  let replyText = "";
  let replyCaptured: string | null = null;
  if (ctx.replyAfterKey) {
    try {
      const g = new Chess(k.fenBefore);
      g.move(uciToMove(k.uci));
      const r = g.move(uciToMove(ctx.replyAfterKey));
      replyCaptured = r.captured ?? null;
      if (ctx.replyIsMate) replyText = `It allowed a forced mate starting with ${r.san}.`;
      else if (r.captured) replyText = `It left your ${PIECE_NAME[r.captured]} on ${r.to} exposed — ${r.san} wins it.`;
      else replyText = `It handed your opponent the initiative: ${r.san} became strong.`;
    } catch {
      replyText = "";
    }
  }

  const out: Coaching = {
    ...base,
    keyPly: keyIdx,
    keyMoveLabel: label,
    keyMoveSan: k.san,
    keyBestSan: k.bestSan,
    keyBestUci: k.bestUci,
    keyFen: k.fenBefore,
    headline: `Move ${moveNo}: ${k.san} was the turning point.`,
    what: `${replyText} ${k.bestSan ? `${k.bestSan} was the stronger move here.` : ""}`.trim(),
  };

  const undeveloped = minorsAtHome(k.fenBefore, me);
  if (moveNo <= 16 && undeveloped >= 2) {
    out.why = `You started action while ${undeveloped} of your minor pieces were still at home. With fewer pieces in play, you had fewer defenders when things got sharp.`;
    out.next = "Before your first attack, count your developed pieces. Aim for all four minor pieces out and your king castled.";
    out.lessonSlug = "develop-your-pieces";
  } else if (!castled && moveNo >= 10) {
    out.why = "Your king was still in the centre, so every open line became dangerous for you and your pieces were tied to defence.";
    out.next = "Castle within the first ten moves in most openings. A safe king frees your pieces to play.";
    out.lessonSlug = "king-safety";
  } else if (earlyQueen) {
    out.why = "Your queen came out early. It became a target, and your opponent developed with tempo by chasing it.";
    out.next = "Develop knights and bishops first; bring the queen out once the minor pieces support it.";
    out.lessonSlug = "opening-principles";
  } else if (replyCaptured) {
    out.why = "The move didn’t check what your opponent could capture next. Most games at every level are decided by pieces left undefended.";
    out.next = "Before each move, run a blunder check: what are all of my opponent’s checks and captures after this move?";
    out.lessonSlug = "double-attack";
  } else {
    out.why = "The move didn’t fit the needs of the position — it gave your opponent time to improve without cost.";
    out.next = "At each turn, ask what your opponent wants to do, then choose a move that stops it or makes your own plan faster.";
    out.lessonSlug = "fork";
  }
  return out;
}

/** Guided coach answers used when no AI provider is configured (or as its fallback). */
export function guidedAnswer(question: string, analysis: GameAnalysis, lessonTitle?: string | null): string {
  const c = analysis.coaching;
  const q = question.toLowerCase();
  if (/why|bad|wrong|mistake|blunder|lose|lost/.test(q)) {
    return c.keyMoveSan
      ? `${c.keyMoveSan} on move ${c.keyMoveLabel} was the costly one. ${c.what}\n\n${c.why}`
      : `Honestly, none of your moves was a real mistake in this game. ${c.why}`;
  }
  if (/practi|next|improve|train|study|lesson/.test(q)) {
    return `${c.next}\n\nRecommended: the “${lessonTitle ?? "Fork"}” lesson, then three puzzles today.`;
  }
  if (/should|instead|better|what.*do|alternative/.test(q)) {
    return c.keyBestSan
      ? `${c.keyBestSan} was the stronger choice on move ${c.keyMoveLabel}. ${c.next}\n\nUse “Practice position” to find it yourself.`
      : c.next;
  }
  if (/good|well|best|strong/.test(q)) {
    const best = analysis.counts.best + analysis.counts.good;
    return `${best} of your moves were best or good, for ${analysis.accuracy}% accuracy. ${c.why}`;
  }
  return `Here’s the short version of this game: ${c.headline} ${c.why}\n\nAsk me why a move was bad, what you should have played, or what to practise next.`;
}

import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { accuracyOf, buildCoaching, classify, guidedAnswer } from "@/lib/chess/coaching";
import type { GameAnalysis, PlyAnalysis } from "@/lib/chess/analysis-types";
import { uciToMove } from "@/lib/chess/rules";

function plies(moves: string[], losses: number[], best: (string | null)[] = []): PlyAnalysis[] {
  const g = new Chess();
  return moves.map((uci, i) => {
    const fenBefore = g.fen();
    const m = g.move(uciToMove(uci));
    return {
      san: m.san,
      uci,
      color: m.color,
      fenBefore,
      evalWhite: 0,
      loss: losses[i] ?? 0,
      cls: classify(losses[i] ?? 0),
      bestUci: best[i] ?? null,
      bestSan: best[i] ? new Chess(fenBefore).move(uciToMove(best[i]!)).san : null,
    };
  });
}

describe("move classification", () => {
  it("buckets centipawn loss", () => {
    expect(classify(0)).toBe("best");
    expect(classify(50)).toBe("good");
    expect(classify(100)).toBe("inaccuracy");
    expect(classify(200)).toBe("mistake");
    expect(classify(600)).toBe("blunder");
  });
  it("computes accuracy", () => {
    expect(accuracyOf([])).toBe(100);
    const p = plies(["e2e4"], [0]);
    expect(accuracyOf(p)).toBe(100);
    expect(accuracyOf(plies(["e2e4"], [900]))).toBeLessThan(5);
  });
});

describe("coaching layer", () => {
  it("praises a clean game", () => {
    const p = plies(["e2e4", "e7e5", "g1f3", "b8c6"], [0, 0, 10, 0]);
    const c = buildCoaching(p, { userColor: "w", outcome: "win", termination: "checkmate" });
    expect(c.headline).toBe("You played a clean game.");
    expect(c.keyPly).toBeNull();
  });

  it("flags an early attack with undeveloped pieces", () => {
    // 1.e4 e5 2.Qh5 — the queen sortie with minor pieces at home
    const p = plies(["e2e4", "e7e5", "d1h5", "b8c6"], [0, 0, 300, 0], [null, null, "g1f3", null]);
    const c = buildCoaching(p, { userColor: "w", outcome: "loss", termination: "resignation" });
    expect(c.keyMoveSan).toBe("Qh5");
    expect(c.keyBestSan).toBe("Nf3");
    expect(c.headline).toContain("Move 2");
    expect(c.why).toMatch(/minor pieces/);
    expect(c.lessonSlug).toBe("develop-your-pieces");
  });

  it("tells a resigner the position was still playable", () => {
    const p = plies(["e2e4", "e7e5"], [0, 0]);
    const c = buildCoaching(p, { userColor: "w", outcome: "loss", termination: "resignation" });
    expect(c.headline).toMatch(/resigned/);
  });

  it("answers common questions without an AI provider", () => {
    const p = plies(["e2e4", "e7e5", "d1h5", "b8c6"], [0, 0, 300, 0], [null, null, "g1f3", null]);
    const coaching = buildCoaching(p, { userColor: "w", outcome: "loss", termination: "resignation" });
    const a: GameAnalysis = {
      version: 1,
      engine: "test",
      depth: 1,
      accuracy: 60,
      opponentAccuracy: 90,
      counts: { best: 1, good: 0, inaccuracy: 0, mistake: 0, blunder: 1 },
      plies: p,
      coaching,
    };
    expect(guidedAnswer("Why was my worst move bad?", a)).toContain("Qh5");
    expect(guidedAnswer("What should I have done?", a)).toContain("Nf3");
    expect(guidedAnswer("What should I practise next?", a, "Develop your pieces")).toContain("Develop your pieces");
  });
});

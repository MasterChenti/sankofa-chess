import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { hasMatingMaterial, naturalEnd, outcomeFor, replay, verifyFinishedGame } from "@/lib/chess/rules";

describe("chess rules (chess.js)", () => {
  it("allows legal moves and rejects illegal ones", () => {
    expect(replay(["e2e4", "e7e5", "g1f3"])).not.toBeNull();
    expect(replay(["e2e5"])).toBeNull();
    expect(replay(["e2e4", "e2e4"])).toBeNull();
    expect(replay(["zz99"])).toBeNull();
  });

  it("detects checkmate (fool's mate)", () => {
    const g = replay(["f2f3", "e7e5", "g2g4", "d8h4"])!;
    expect(g.isCheckmate()).toBe(true);
    expect(naturalEnd(g)).toEqual({ result: "0-1", termination: "checkmate" });
  });

  it("supports castling both ways", () => {
    const g = new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    expect(g.move("O-O").san).toBe("O-O");
    expect(g.move("O-O-O").san).toBe("O-O-O");
    expect(g.get("g1")?.type).toBe("k");
    expect(g.get("c8")?.type).toBe("k");
  });

  it("forbids castling through check", () => {
    const g = new Chess("4k3/8/8/8/8/8/5r2/4K2R w K - 0 1");
    expect(g.moves().includes("O-O")).toBe(false);
  });

  it("supports promotion (including under-promotion)", () => {
    const g = replay(["a7a8n"], "4k3/P7/8/8/8/8/8/4K3 w - - 0 1")!;
    expect(g.get("a8")).toMatchObject({ type: "n", color: "w" });
  });

  it("supports en passant", () => {
    const g = replay(["e2e4", "a7a6", "e4e5", "d7d5", "e5d6"])!;
    expect(g.get("d5")).toBeFalsy();
    expect(g.get("d6")).toMatchObject({ type: "p", color: "w" });
  });

  it("detects stalemate and insufficient material", () => {
    const stale = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(naturalEnd(stale)).toEqual({ result: "1/2-1/2", termination: "stalemate" });
    const bare = new Chess("8/8/4k3/8/8/4K3/8/8 w - - 0 1");
    expect(naturalEnd(bare)?.termination).toBe("insufficient");
  });
});

describe("server-side game verification", () => {
  it("accepts a real checkmate", () => {
    const r = verifyFinishedGame({ moves: ["f2f3", "e7e5", "g2g4", "d8h4"], termination: "checkmate" });
    expect(r).toMatchObject({ ok: true, result: "0-1" });
  });

  it("rejects a claimed checkmate that didn't happen", () => {
    const r = verifyFinishedGame({ moves: ["e2e4", "e7e5"], termination: "checkmate" });
    expect(r.ok).toBe(false);
  });

  it("rejects resignation after the rules already ended the game", () => {
    const r = verifyFinishedGame({ moves: ["f2f3", "e7e5", "g2g4", "d8h4"], termination: "resignation", loser: "b" });
    expect(r.ok).toBe(false);
  });

  it("scores resignation for the right side", () => {
    expect(verifyFinishedGame({ moves: ["e2e4", "e7e5"], termination: "resignation", loser: "w" })).toMatchObject({ ok: true, result: "0-1" });
  });

  it("treats a timeout as a draw when the winner can't mate", () => {
    const moves: string[] = [];
    const r = verifyFinishedGame({ moves, termination: "timeout", loser: "w" });
    expect(r).toMatchObject({ ok: true, result: "0-1" });
    const g = new Chess("8/8/4k3/8/8/4K3/4N3/8 w - - 0 1");
    expect(hasMatingMaterial(g, "w")).toBe(false);
  });

  it("rejects illegal move lists", () => {
    expect(verifyFinishedGame({ moves: ["e2e4", "e2e4"], termination: "resignation", loser: "b" }).ok).toBe(false);
  });

  it("maps results to outcomes", () => {
    expect(outcomeFor("1-0", "w")).toBe("win");
    expect(outcomeFor("1-0", "b")).toBe("loss");
    expect(outcomeFor("1/2-1/2", "b")).toBe("draw");
  });
});

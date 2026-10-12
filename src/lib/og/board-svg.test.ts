import { describe, expect, it } from "vitest";
import { boardSvg, fenGrid } from "./board-svg";

describe("board image", () => {
  it("reads piece placement from a FEN", () => {
    const g = fenGrid("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1");
    expect(g[0][4]).toBe("k");
    expect(g[7][4]).toBe("K");
    expect(g[4][4]).toBe("P");
    expect(g[6][4]).toBeNull();
  });
  it("draws 64 squares and one shape group per piece", () => {
    const svg = boardSvg("4k3/8/8/8/8/8/8/4K2R w K - 0 1");
    expect(svg.match(/<rect x="\d+" y="\d+" width="45"/g)?.length).toBe(64);
    expect(svg.match(/<g transform/g)?.length).toBe(3);
  });
  it("never throws on a broken FEN", () => {
    expect(fenGrid("nonsense").flat().every((x) => x === null)).toBe(true);
  });
});

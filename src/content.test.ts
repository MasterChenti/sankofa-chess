import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { LESSONS, PUZZLES, STORIES, CHALLENGES, ACHIEVEMENTS } from "../supabase/content/content";
import { checkPuzzleLine } from "@/features/puzzles/logic";
import { checkLessonMove } from "@/features/learning/logic";
import { uciToMove } from "@/lib/chess/rules";
import { buildSeedSql } from "../scripts/generate-seed";

describe("puzzle content", () => {
  it.each(PUZZLES.map((p) => [p.slug, p] as const))("%s: FEN is valid and the solution solves it", (_slug, p) => {
    const g = new Chess(p.fen);
    for (const m of p.solution) g.move(uciToMove(m));
    if (p.isMate) expect(g.isCheckmate()).toBe(true);
    expect(checkPuzzleLine({ fen: p.fen, solution: p.solution, is_mate: p.isMate }, p.solution)).toBe("solved");
  });

  it("slugs are unique", () => {
    expect(new Set(PUZZLES.map((p) => p.slug)).size).toBe(PUZZLES.length);
  });
});

describe("puzzle checking", () => {
  const fork = PUZZLES.find((p) => p.slug === "royal-fork")!;
  const spec = { fen: fork.fen, solution: fork.solution, is_mate: fork.isMate };
  it("marks a correct first move as partial, a wrong move as wrong", () => {
    expect(checkPuzzleLine(spec, [fork.solution[0]])).toBe("partial");
    expect(checkPuzzleLine(spec, ["b5d6"])).toBe("wrong");
  });
  it("rejects a solved line with extra moves", () => {
    expect(checkPuzzleLine(spec, [...fork.solution, "e1e2"])).toBe("wrong");
  });
  it("accepts any checkmate in a mate puzzle, and only checkmates", () => {
    // Two rooks, back-rank: both Rd8# and Ra8# mate.
    const spec = { fen: "6k1/5ppp/8/8/8/8/5PPP/R2R2K1 w - - 0 1", solution: ["d1d8"], is_mate: true };
    expect(checkPuzzleLine(spec, ["d1d8"])).toBe("solved");
    expect(checkPuzzleLine(spec, ["a1a8"])).toBe("solved");
    expect(checkPuzzleLine(spec, ["d1d7"])).toBe("wrong");
  });
});

describe("lesson content", () => {
  it.each(LESSONS.map((l) => [l.slug, l] as const))("%s: exercise is legal and passable", (_slug, l) => {
    new Chess(l.content.fen);
    if (l.content.requireMate) {
      const g = new Chess(l.content.fen);
      const mates = g.moves({ verbose: true }).filter((m) => {
        const t = new Chess(l.content.fen);
        t.move(m);
        return t.isCheckmate();
      });
      expect(mates.length).toBeGreaterThan(0);
      expect(checkLessonMove(l.content, mates[0].lan)).toBe(true);
    } else {
      expect(l.content.accept.length).toBeGreaterThan(0);
      for (const m of l.content.accept) expect(checkLessonMove(l.content, m)).toBe(true);
    }
  });

  it("rejects moves that aren't the lesson's idea", () => {
    const castling = LESSONS.find((l) => l.slug === "castling")!;
    expect(checkLessonMove(castling.content, "h2h3")).toBe(false);
    expect(checkLessonMove(castling.content, "e1e3")).toBe(false);
  });

  it("covers every category from the brief", () => {
    const cats = new Set(LESSONS.map((l) => l.category));
    expect([...cats].sort()).toEqual(["beginner", "endgame", "strategy", "tactics"]);
  });
});

describe("seed", () => {
  it("generates SQL for all content", () => {
    const sql = buildSeedSql();
    expect(sql.match(/insert into public\.puzzles/g)?.length).toBe(PUZZLES.length);
    expect(sql.match(/insert into public\.lessons/g)?.length).toBe(LESSONS.length);
    expect(sql.match(/insert into public\.stories/g)?.length).toBe(STORIES.length);
    expect(sql.match(/insert into public\.challenges/g)?.length).toBe(CHALLENGES.length);
    expect(sql.match(/insert into public\.achievements/g)?.length).toBe(ACHIEVEMENTS.length);
    expect(sql).toContain("begin;");
    expect(sql.trim().endsWith("commit;")).toBe(true);
  });
  it("every story cites a source", () => {
    for (const s of STORIES) expect(s.source.length).toBeGreaterThan(5);
  });
});

import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { LESSONS, PUZZLES, STORIES, THOUGHTS, CHALLENGES, ACHIEVEMENTS } from "../supabase/content/content";
import { REGION_LABEL } from "@/features/today/plan";
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
  it("generates SQL for every strategic question", () => {
    expect(buildSeedSql().match(/insert into public\.thoughts/g)?.length).toBe(THOUGHTS.length);
  });
});

describe("story content", () => {
  it("slugs are unique", () => {
    expect(new Set(STORIES.map((s) => s.slug)).size).toBe(STORIES.length);
  });
  it.each(STORIES.map((s) => [s.slug, s] as const))("%s: is a complete, sourced experience", (_slug, s) => {
    expect(Object.keys(REGION_LABEL)).toContain(s.region);
    expect(s.sections.length).toBeGreaterThan(0);
    for (const sec of s.sections) expect(sec.body.length).toBeGreaterThan(0);
    expect(s.think.options.length).toBeGreaterThanOrEqual(2);
    expect(new Set(s.think.options.map((o) => o.key)).size).toBe(s.think.options.length);
    for (const o of s.think.options) expect(o.key.length).toBeLessThanOrEqual(4);
    expect(s.outcome.body.length).toBeGreaterThan(0);
    expect(s.sankofa.length).toBeGreaterThan(10);
    // Fact vs interpretation must be explicit.
    expect(s.known.length).toBeGreaterThan(0);
    expect(s.debated.length).toBeGreaterThan(0);
    expect(s.source.length).toBeGreaterThan(5);
  });
  it("covers the diversity of the continent and the diaspora", () => {
    const regions = new Set(STORIES.map((s) => s.region));
    for (const r of ["west", "east", "north", "central", "southern", "diaspora"]) expect([...regions]).toContain(r);
  });
});

describe("strategic questions", () => {
  const styles = ["patient", "bold", "diplomatic", "adaptive", "principled"];
  const lessons = new Set(LESSONS.map((l) => l.slug));
  it("slugs are unique", () => {
    expect(new Set(THOUGHTS.map((t) => t.slug)).size).toBe(THOUGHTS.length);
  });
  it.each(THOUGHTS.map((t) => [t.slug, t] as const))("%s: options have styles and perspectives", (_slug, t) => {
    expect(t.options.length).toBeGreaterThanOrEqual(2);
    expect(new Set(t.options.map((o) => o.key)).size).toBe(t.options.length);
    for (const o of t.options) {
      expect(styles).toContain(o.style);
      expect(o.perspective.length).toBeGreaterThan(10);
      expect(o.key.length).toBeLessThanOrEqual(4);
    }
    expect(t.takeaway.length).toBeGreaterThan(10);
    if (t.lessonSlug) expect(lessons.has(t.lessonSlug)).toBe(true);
  });
});

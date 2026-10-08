import { describe, expect, it } from "vitest";
import { composeDailyPlan, isDayComplete, minutesLeft, nextStep, type PlanInput } from "@/features/today/plan";

const base: PlanInput = {
  day: "2026-10-08",
  userId: "user-1",
  level: "beginner",
  puzzles: [
    { id: "p-easy", rating: 600, sort_order: 1 },
    { id: "p-easy2", rating: 700, sort_order: 2 },
    { id: "p-mid", rating: 1100, sort_order: 3 },
    { id: "p-hard", rating: 1500, sort_order: 4 },
  ],
  solvedPuzzleIds: new Set(),
  stories: [
    { id: "s-west-1", category: "history", region: "west" },
    { id: "s-west-2", category: "strategy", region: "west" },
    { id: "s-east-1", category: "strategy", region: "east" },
    { id: "s-south-1", category: "innovation", region: "southern" },
  ],
  reads: [],
  thoughts: [
    { id: "t1", sort_order: 1 },
    { id: "t2", sort_order: 2 },
  ],
  answeredThoughtIds: new Set(),
};

describe("daily plan", () => {
  it("is deterministic for the same player and day", () => {
    expect(composeDailyPlan(base)).toEqual(composeDailyPlan(base));
  });

  it("picks an unsolved puzzle in the player's band", () => {
    const plan = composeDailyPlan({ ...base, solvedPuzzleIds: new Set(["p-easy", "p-easy2"]) });
    expect(plan.puzzleId).not.toBe("p-easy");
    expect(plan.puzzleId).not.toBe("p-easy2");
    const beginner = composeDailyPlan(base);
    expect(["p-easy", "p-easy2"]).toContain(beginner.puzzleId);
  });

  it("never repeats a read story while unread ones remain, and rotates regions", () => {
    const plan = composeDailyPlan({
      ...base,
      reads: [{ storyId: "s-west-1", category: "history", region: "west" }],
    });
    expect(plan.storyId).not.toBe("s-west-1");
    expect(plan.storyId).not.toBe("s-west-2"); // same region as yesterday is penalised
    expect(plan.storyReason).toMatch(/New for you/);
  });

  it("leans toward themes the player enjoys", () => {
    const plan = composeDailyPlan({
      ...base,
      stories: [
        { id: "a", category: "strategy", region: "east" },
        { id: "b", category: "culture", region: "east" },
      ],
      reads: [
        { storyId: "x1", category: "strategy", region: "east" },
        { storyId: "x2", category: "strategy", region: "east" },
        { storyId: "x3", category: "strategy", region: "east" },
      ],
    });
    expect(plan.storyId).toBe("a");
  });

  it("asks the next unanswered strategic question", () => {
    expect(composeDailyPlan({ ...base, answeredThoughtIds: new Set(["t1"]) }).thoughtId).toBe("t2");
  });

  it("handles an empty library gracefully", () => {
    expect(composeDailyPlan({ ...base, puzzles: [], stories: [], thoughts: [] })).toEqual({
      puzzleId: null,
      storyId: null,
      storyReason: null,
      thoughtId: null,
    });
  });
});

describe("day completion", () => {
  const none = { move: false, remember: false, think: false, play: false, reflect: false };
  it("needs the four core steps; playing is a bonus", () => {
    expect(isDayComplete({ ...none, move: true, remember: true, think: true, reflect: true })).toBe(true);
    expect(isDayComplete({ ...none, move: true, remember: true, think: true, play: true })).toBe(false);
  });
  it("walks the ritual in order and offers Play before Reflect", () => {
    expect(nextStep(none)).toBe("move");
    expect(nextStep({ ...none, move: true })).toBe("remember");
    expect(nextStep({ ...none, move: true, remember: true, think: true })).toBe("play");
    expect(nextStep({ ...none, move: true, remember: true, think: true, play: true })).toBe("reflect");
    expect(nextStep({ move: true, remember: true, think: true, play: false, reflect: true })).toBe("done");
  });
  it("estimates the time left", () => {
    expect(minutesLeft(none)).toBe(10);
  });
});

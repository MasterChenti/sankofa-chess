import { describe, expect, it } from "vitest";
import { clampRating, displayStreak, eloChange, gameXp, levelForXp, nextStreak, puzzleAccuracy, winRate, XP } from "@/features/progress/rules";
import { dayKey, dayIndex, periodKey, previousDayKey, safeTimeZone, weekKeyFromDay } from "@/lib/utils/dates";

describe("Sankofa levels", () => {
  it("maps XP to levels and progress", () => {
    expect(levelForXp(0)).toMatchObject({ level: 1, name: "Seed", progress: 0 });
    expect(levelForXp(99).level).toBe(1);
    expect(levelForXp(100)).toMatchObject({ level: 2, name: "Learner" });
    expect(levelForXp(175).progress).toBe(50);
    expect(levelForXp(2000)).toMatchObject({ level: 7, name: "Master", next: null, progress: 100 });
    expect(levelForXp(99999).level).toBe(7);
  });
});

describe("rating", () => {
  it("gains more for beating a stronger opponent", () => {
    expect(eloChange(1200, 1600, 1, 30)).toBeGreaterThan(eloChange(1200, 800, 1, 30));
  });
  it("is symmetric-ish around equal ratings", () => {
    expect(eloChange(1200, 1200, 1, 30)).toBe(16);
    expect(eloChange(1200, 1200, 0, 30)).toBe(-16);
    expect(eloChange(1200, 1200, 0.5, 30)).toBe(0);
  });
  it("moves faster for provisional players", () => {
    expect(eloChange(1200, 1200, 1, 3)).toBe(20);
  });
  it("clamps to a sane range", () => {
    expect(clampRating(40)).toBe(100);
    expect(clampRating(5000)).toBe(3500);
  });
});

describe("streaks", () => {
  it("continues, holds and resets", () => {
    expect(nextStreak(null, "2026-09-30", 0)).toBe(1);
    expect(nextStreak("2026-09-29", "2026-09-30", 4)).toBe(5);
    expect(nextStreak("2026-09-30", "2026-09-30", 5)).toBe(5);
    expect(nextStreak("2026-09-27", "2026-09-30", 5)).toBe(1);
  });
  it("displays a lapsed streak as zero", () => {
    expect(displayStreak("2026-09-29", "2026-09-30", 6)).toBe(6);
    expect(displayStreak("2026-09-20", "2026-09-30", 6)).toBe(0);
    expect(displayStreak(null, "2026-09-30", 0)).toBe(0);
  });
});

describe("XP and ratios", () => {
  it("awards game XP only for rated games", () => {
    expect(gameXp("win", true)).toBe(XP.gamePlayed + XP.gameWonBonus);
    expect(gameXp("loss", true)).toBe(XP.gamePlayed);
    expect(gameXp("win", false)).toBe(0);
  });
  it("computes accuracy and win rate", () => {
    expect(puzzleAccuracy(0, 0)).toBeNull();
    expect(puzzleAccuracy(4, 3)).toBe(75);
    expect(winRate(86, 48)).toBe(56);
  });
});

describe("dates", () => {
  it("builds day keys in the player's time zone", () => {
    const d = new Date("2026-09-30T23:30:00Z");
    expect(dayKey(d, "UTC")).toBe("2026-09-30");
    expect(dayKey(d, "Europe/Brussels")).toBe("2026-10-01");
    expect(dayKey(d, "Not/AZone")).toBe("2026-09-30");
    expect(safeTimeZone("Not/AZone")).toBe("UTC");
  });
  it("builds ISO week keys", () => {
    expect(weekKeyFromDay("2026-09-28")).toBe("2026-W40");
    expect(weekKeyFromDay("2026-10-04")).toBe("2026-W40");
    expect(weekKeyFromDay("2026-01-01")).toBe("2026-W01");
    expect(periodKey("day", "2026-09-30")).toBe("2026-09-30");
    expect(periodKey("week", "2026-09-30")).toBe("2026-W40");
  });
  it("steps back a day across month boundaries", () => {
    expect(previousDayKey("2026-10-01")).toBe("2026-09-30");
    expect(previousDayKey("2026-01-01")).toBe("2025-12-31");
    expect(dayIndex("2026-09-30") + 1).toBe(dayIndex("2026-10-01"));
  });
});

import { describe, expect, it } from "vitest";
import { greeting, localHour, reflectionChoices } from "./copy";

describe("today copy", () => {
  it("greets by local hour", () => {
    expect(greeting(7)).toBe("Good morning");
    expect(greeting(13)).toBe("Good afternoon");
    expect(greeting(20)).toBe("Good evening");
    expect(greeting(2)).toBe("Still up");
  });
  it("computes the hour in the player's time zone", () => {
    const d = new Date("2026-10-08T06:30:00Z");
    expect(localHour(d, "Africa/Accra")).toBe(6);
    expect(localHour(d, "Africa/Nairobi")).toBe(9);
    expect(localHour(d, "Not/AZone")).toBe(6);
  });
  it("builds reflection choices from real items, each within 120 chars", () => {
    const c = reflectionChoices({ puzzle: "Back rank", story: "The Golden Stool", thought: "x".repeat(300), played: true });
    expect(c).toHaveLength(5);
    expect(c.every((x) => x.length <= 120)).toBe(true);
    expect(reflectionChoices({})).toEqual(["Nothing clicked today, and that’s fine"]);
  });
});

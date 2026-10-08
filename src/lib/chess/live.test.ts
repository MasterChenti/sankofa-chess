import { describe, expect, it } from "vitest";
import { applyLiveMove, clocksAt, flagged, inviteCode, LIVE_MODES, liveRatingChanges, type LiveClockState } from "@/lib/chess/live";

const T0 = Date.parse("2026-10-08T10:00:00Z");
const fresh = (mode: LiveClockState["mode"] = "rapid"): LiveClockState => ({
  mode,
  moves: [],
  white_ms: LIVE_MODES[mode].initialMs,
  black_ms: LIVE_MODES[mode].initialMs,
  turn_started_at: null,
});

function play(state: LiveClockState, uci: string, by: "w" | "b", at: number): LiveClockState {
  const r = applyLiveMove(state, uci, by, at);
  if (!r.ok) throw new Error(r.reason);
  return { ...state, moves: r.moves, white_ms: r.white_ms, black_ms: r.black_ms, turn_started_at: r.turn_started_at };
}

describe("live games", () => {
  it("enforces turn order and legality", () => {
    const s = fresh();
    expect(applyLiveMove(s, "e7e5", "b", T0)).toMatchObject({ ok: false, reason: "not-your-turn" });
    expect(applyLiveMove(s, "e2e5", "w", T0)).toMatchObject({ ok: false, reason: "illegal" });
    expect(applyLiveMove(s, "e2e4", "w", T0)).toMatchObject({ ok: true });
  });

  it("starts clocks after both sides have moved, then counts down and adds increment", () => {
    let s = fresh("blitz");
    s = play(s, "e2e4", "w", T0);
    expect(s.turn_started_at).toBeNull();
    s = play(s, "e7e5", "b", T0 + 30_000);
    expect(s.turn_started_at).not.toBeNull();
    expect(s.white_ms).toBe(180_000);
    // White thinks for 10 s, gets 2 s back.
    s = play(s, "g1f3", "w", T0 + 40_000);
    expect(s.white_ms).toBe(180_000 - 10_000 + 2_000);
    expect(clocksAt(s, T0 + 45_000).b).toBe(180_000 - 5_000);
  });

  it("detects a flag fall and refuses late moves", () => {
    let s = fresh("blitz");
    s = play(s, "e2e4", "w", T0);
    s = play(s, "e7e5", "b", T0);
    const late = T0 + 181_000;
    expect(flagged(s, late)).toEqual({ result: "0-1", termination: "timeout" });
    expect(applyLiveMove(s, "g1f3", "w", late)).toMatchObject({ ok: false, reason: "flagged" });
  });

  it("resets the per-move allowance in daily chess", () => {
    let s = fresh("daily");
    s = play(s, "e2e4", "w", T0);
    s = play(s, "e7e5", "b", T0 + 3_600_000);
    s = play(s, "g1f3", "w", T0 + 20 * 3_600_000);
    expect(s.white_ms).toBe(24 * 3_600_000);
  });

  it("reports checkmate as the end of the game", () => {
    let s = fresh();
    s = play(s, "f2f3", "w", T0);
    s = play(s, "e7e5", "b", T0);
    s = play(s, "g2g4", "w", T0);
    const r = applyLiveMove(s, "d8h4", "b", T0);
    expect(r).toMatchObject({ ok: true, end: { result: "0-1", termination: "checkmate" } });
  });

  it("moves both ratings in opposite directions", () => {
    const c = liveRatingChanges({ rating: 1200, games: 30 }, { rating: 1200, games: 30 }, "1-0");
    expect(c).toEqual({ white: 16, black: -16 });
    const upset = liveRatingChanges({ rating: 1000, games: 30 }, { rating: 1400, games: 30 }, "1-0");
    expect(upset.white).toBeGreaterThan(25);
  });

  it("makes readable invite codes", () => {
    const c = inviteCode();
    expect(c).toMatch(/^[a-z2-9]{8}$/);
    expect(c).not.toMatch(/[ilo01]/);
  });
});

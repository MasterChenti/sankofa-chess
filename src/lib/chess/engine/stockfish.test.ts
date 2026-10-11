import { afterEach, describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { StockfishEngine, type WorkerLike } from "./stockfish";
import { EngineError } from "./types";
import { PERSONAS } from "@/lib/chess/personas";
import { START_FEN } from "@/lib/chess/fen";

type Behaviour = "ok" | "silent" | "illegal" | "crash" | "no-boot";

/** A stand-in for the Stockfish worker that speaks just enough UCI to exercise our side of the protocol. */
class FakeWorker implements WorkerLike {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  received: string[] = [];
  terminated = false;
  private fen = START_FEN;
  constructor(private behaviour: Behaviour) {}
  postMessage(cmd: string) {
    this.received.push(cmd);
    setTimeout(() => this.respond(cmd), 1);
  }
  private emit(line: string) {
    if (!this.terminated) this.onmessage?.({ data: line });
  }
  private respond(cmd: string) {
    if (this.terminated) return;
    if (cmd === "uci" && this.behaviour !== "no-boot") this.emit("uciok");
    if (cmd === "isready") this.emit("readyok");
    if (cmd.startsWith("position fen ")) this.fen = cmd.slice("position fen ".length);
    if (cmd.startsWith("go")) {
      if (this.behaviour === "silent") return;
      if (this.behaviour === "crash") return this.onerror?.(new Error("wasm trap"));
      const legal = new Chess(this.fen).moves({ verbose: true });
      const m = legal[0];
      const uci = this.behaviour === "illegal" ? "e2e5" : m.from + m.to + (m.promotion ?? "");
      this.emit(`info depth 5 multipv 1 score cp 20 pv ${uci}`);
      this.emit(`bestmove ${uci}`);
    }
  }
  terminate() {
    this.terminated = true;
  }
}

function engineWith(behaviour: Behaviour) {
  let worker: FakeWorker | null = null;
  const engine = new StockfishEngine({
    createWorker: () => (worker = new FakeWorker(behaviour)),
    bootTimeoutMs: 80,
    stopGraceMs: 20,
    killGraceMs: 60,
  });
  return { engine, worker: () => worker! };
}

async function failure(p: Promise<unknown>): Promise<EngineError> {
  try {
    await p;
  } catch (e) {
    return e as EngineError;
  }
  throw new Error("expected the engine call to fail");
}

const realRandom = Math.random;
afterEach(() => {
  Math.random = realRandom;
});
// Never take the "deliberate slip" path in these tests: we want the engine's own move.
const noSlips = () => (Math.random = () => 0.99);

describe("Stockfish engine adapter", () => {
  it("boots with uci/isready, sends the position and returns a legal engine move (Test A)", async () => {
    noSlips();
    const { engine, worker } = engineWith("ok");
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"; // after 1.e4
    const move = await engine.chooseMove(fen, PERSONAS.kwaku);
    const sent = worker().received;
    expect(sent[0]).toBe("uci");
    expect(sent).toContain("isready");
    expect(sent).toContain(`position fen ${fen}`);
    expect(sent.some((c) => c.startsWith("go "))).toBe(true);
    // The reply is legal for Black in that position.
    const g = new Chess(fen);
    expect(Boolean(g.move({ from: move!.slice(0, 2), to: move!.slice(2, 4) }))).toBe(true);
    expect(engine.dead).toBe(false);
  });

  it("keeps answering move after move (Test B, engine side)", async () => {
    noSlips();
    const { engine } = engineWith("ok");
    const g = new Chess();
    for (let ply = 0; ply < 10; ply++) {
      const uci = await engine.chooseMove(g.fen(), PERSONAS.abena);
      g.move({ from: uci!.slice(0, 2), to: uci!.slice(2, 4), promotion: uci![4] });
    }
    expect(g.history().length).toBe(10);
  });

  it("difficulty changes what the engine is asked to do (Test D)", async () => {
    noSlips();
    const easy = engineWith("ok");
    const hard = engineWith("ok");
    await easy.engine.chooseMove(START_FEN, PERSONAS.abena);
    await hard.engine.chooseMove(START_FEN, PERSONAS.nana);
    const e = easy.worker().received;
    const h = hard.worker().received;
    expect(e).toContain("setoption name Skill Level value 0");
    expect(h).toContain("setoption name Skill Level value 10");
    expect(e).toContain("setoption name UCI_LimitStrength value false");
    expect(h).toContain("setoption name UCI_Elo value 1600");
    expect(e.find((c) => c.startsWith("go "))).toBe("go depth 2 movetime 150");
    expect(h.find((c) => c.startsWith("go "))).toBe("go depth 10 movetime 600");
  });

  it("a silent engine is stopped, killed and reported: never an endless wait (Test I)", async () => {
    noSlips();
    const { engine, worker } = engineWith("silent");
    const err = await failure(engine.chooseMove(START_FEN, PERSONAS.abena));
    expect(err).toBeInstanceOf(EngineError);
    expect(err.kind).toBe("timeout");
    expect(worker().received).toContain("stop");
    expect(worker().terminated).toBe(true);
    expect(engine.dead).toBe(true);
  });

  it("an engine that never boots fails with a load error (Test I)", async () => {
    const { engine } = engineWith("no-boot");
    const err = await failure(engine.ready());
    expect(err.kind).toBe("load");
    expect(engine.dead).toBe(true);
  });

  it("a crash mid-search rejects instead of hanging", async () => {
    noSlips();
    const { engine } = engineWith("crash");
    const err = await failure(engine.chooseMove(START_FEN, PERSONAS.kwaku));
    expect(err.kind).toBe("crashed");
    expect(engine.dead).toBe(true);
  });

  it("an illegal bestmove is refused, never played", async () => {
    noSlips();
    const { engine } = engineWith("illegal");
    // After 1.e4 it's Black's move, so "e2e5" is impossible.
    const err = await failure(engine.chooseMove("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", PERSONAS.kwaku));
    expect(err.kind).toBe("invalid");
  });

  it("returns null when there is no legal move (checkmate), without searching (Test E, engine side)", async () => {
    const { engine } = engineWith("ok");
    const mated = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"; // fool's mate
    expect(await engine.chooseMove(mated, PERSONAS.nana)).toBeNull();
  });

  it("serialises concurrent searches so each gets its own answer", async () => {
    const { engine } = engineWith("ok");
    const a = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const [r1, r2] = await Promise.all([engine.analyse(START_FEN, { movetimeMs: 10 }), engine.analyse(a, { movetimeMs: 10 })]);
    expect(r1.bestMove).toBe(new Chess(START_FEN).moves({ verbose: true }).map((m) => m.from + m.to)[0]);
    expect(r2.bestMove).toBe(new Chess(a).moves({ verbose: true }).map((m) => m.from + m.to)[0]);
  });
});

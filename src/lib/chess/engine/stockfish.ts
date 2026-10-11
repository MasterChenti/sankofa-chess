"use client";

import { Chess } from "chess.js";
import type { Persona } from "@/lib/chess/personas";
import type { ChessEngine, EngineAnalysis, EngineLine, SearchOptions } from "@/lib/chess/engine/types";
import { EngineError, lineScore } from "@/lib/chess/engine/types";

type Pending = {
  lines: Map<number, EngineLine>;
  resolve: (a: EngineAnalysis) => void;
  reject: (e: Error) => void;
  stopTimer: ReturnType<typeof setTimeout>;
  killTimer: ReturnType<typeof setTimeout>;
};

/** Minimal Worker surface we use, so tests can supply a fake. */
export type WorkerLike = {
  postMessage(msg: string): void;
  terminate(): void;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
};

export type StockfishOptions = {
  url?: string;
  createWorker?: (url: string) => WorkerLike;
  /** How long the engine may take to boot (uci → uciok → readyok). */
  bootTimeoutMs?: number;
  /** Extra time after the requested movetime before we ask the engine to stop… */
  stopGraceMs?: number;
  /** …and before we give up on it, kill the worker and report an error. */
  killGraceMs?: number;
};

/**
 * Stockfish 19 (lite, single-threaded WASM) running in a Web Worker.
 * GPL-3.0 — see public/stockfish/COPYING.txt.
 *
 * Every request either resolves with a move or rejects with an EngineError:
 * a search can never hang forever. If the worker crashes, times out or is
 * suspended by the OS (common on iPhone when the app goes to the background),
 * it is terminated and the engine reports itself `dead`, so the caller can
 * replace it with a fresh one.
 */
export class StockfishEngine implements ChessEngine {
  readonly name = "Stockfish 19 lite";
  private worker: WorkerLike | null = null;
  private readyPromise: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private pending: Pending | null = null;
  private listeners = new Set<(line: string) => void>();
  private _dead = false;
  private readonly url: string;
  private readonly createWorker: (url: string) => WorkerLike;
  private readonly bootTimeoutMs: number;
  private readonly stopGraceMs: number;
  private readonly killGraceMs: number;
  /** Every UCI command sent, newest last (kept short). Useful for tests and debugging. */
  readonly sent: string[] = [];

  constructor(opts: StockfishOptions = {}) {
    this.url = opts.url ?? "/stockfish/sf-lite.js";
    this.createWorker = opts.createWorker ?? ((u) => new Worker(u) as unknown as WorkerLike);
    this.bootTimeoutMs = opts.bootTimeoutMs ?? 15_000;
    this.stopGraceMs = opts.stopGraceMs ?? 2_500;
    this.killGraceMs = opts.killGraceMs ?? 6_000;
  }

  /** True once the worker has failed; this instance will never answer again. */
  get dead() {
    return this._dead;
  }

  ready(): Promise<void> {
    if (this._dead) return Promise.reject(new EngineError("crashed", "The engine stopped working."));
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      let booted = false;
      try {
        this.worker = this.createWorker(this.url);
      } catch {
        this.fail(new EngineError("load", "The chess engine couldn’t start on this device."));
        reject(new EngineError("load", "The chess engine couldn’t start on this device."));
        return;
      }
      const timeout = setTimeout(() => {
        const err = new EngineError("load", "The chess engine took too long to load.");
        this.fail(err);
        reject(err);
      }, this.bootTimeoutMs);
      this.worker.onerror = () => {
        clearTimeout(timeout);
        const err = booted ? new EngineError("crashed", "The chess engine stopped working.") : new EngineError("load", "The chess engine failed to load.");
        this.fail(err);
        if (!booted) reject(err);
      };
      this.worker.onmessage = (e) => {
        const line = typeof e.data === "string" ? e.data : "";
        if (!line) return;
        this.listeners.forEach((l) => l(line));
        this.onLine(line);
      };
      const onBoot = (line: string) => {
        if (line === "uciok") this.send("isready");
        if (line === "readyok") {
          clearTimeout(timeout);
          booted = true;
          this.listeners.delete(onBoot);
          resolve();
        }
      };
      this.listeners.add(onBoot);
      this.send("uci");
    });
    return this.readyPromise;
  }

  private send(cmd: string) {
    this.sent.push(cmd);
    if (this.sent.length > 200) this.sent.splice(0, this.sent.length - 200);
    this.worker?.postMessage(cmd);
  }

  /** Marks the engine dead, rejects any search in flight and frees the worker. */
  private fail(err: EngineError) {
    if (this._dead) return;
    this._dead = true;
    const p = this.pending;
    this.pending = null;
    if (p) {
      clearTimeout(p.stopTimer);
      clearTimeout(p.killTimer);
      p.reject(err);
    }
    try {
      this.worker?.terminate();
    } catch {
      /* ignore */
    }
    this.worker = null;
  }

  private onLine(line: string) {
    const p = this.pending;
    if (!p) return;
    if (line.startsWith("info ") && line.includes(" pv ")) {
      const t = line.split(" ");
      const num = (k: string) => {
        const i = t.indexOf(k);
        return i >= 0 ? Number(t[i + 1]) : null;
      };
      const depth = num("depth") ?? 0;
      const multipv = num("multipv") ?? 1;
      const si = t.indexOf("score");
      if (si < 0) return;
      const kind = t[si + 1];
      const val = Number(t[si + 2]);
      const pvi = t.indexOf("pv");
      p.lines.set(multipv, {
        depth,
        cp: kind === "cp" ? val : null,
        mate: kind === "mate" ? val : null,
        pv: t.slice(pvi + 1),
      });
    } else if (line.startsWith("bestmove")) {
      const best = line.split(" ")[1];
      clearTimeout(p.stopTimer);
      clearTimeout(p.killTimer);
      this.pending = null;
      const lines = [...p.lines.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l);
      p.resolve({ bestMove: best && best !== "(none)" ? best : null, lines });
    }
  }

  analyse(fen: string, opts: SearchOptions = {}) {
    const run = async (): Promise<EngineAnalysis> => {
      await this.ready();
      if (this._dead) throw new EngineError("crashed", "The chess engine stopped working.");
      return new Promise<EngineAnalysis>((resolve, reject) => {
        const budget = opts.movetimeMs ?? 1000;
        // Ask nicely first; if the engine still says nothing, it is gone.
        const stopTimer = setTimeout(() => this.send("stop"), budget + this.stopGraceMs);
        const killTimer = setTimeout(
          () => this.fail(new EngineError("timeout", "The chess engine stopped responding.")),
          budget + this.killGraceMs,
        );
        this.pending = { lines: new Map(), resolve, reject, stopTimer, killTimer };
        this.send(`setoption name MultiPV value ${opts.multiPv ?? 1}`);
        this.send(`setoption name Skill Level value ${opts.skill ?? 20}`);
        if (opts.limitElo) {
          this.send("setoption name UCI_LimitStrength value true");
          this.send(`setoption name UCI_Elo value ${Math.max(1320, opts.limitElo)}`);
        } else {
          this.send("setoption name UCI_LimitStrength value false");
        }
        this.send(`position fen ${fen}`);
        const parts = ["go"];
        if (opts.depth) parts.push("depth", String(opts.depth));
        if (opts.movetimeMs) parts.push("movetime", String(opts.movetimeMs));
        if (parts.length === 1) parts.push("depth", "12");
        this.send(parts.join(" "));
      });
    };
    // Serialize: a UCI engine handles one search at a time.
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async chooseMove(fen: string, persona: Persona): Promise<string | null> {
    const game = new Chess(fen);
    const legal = game.moves({ verbose: true });
    if (!legal.length) return null;
    const { play } = persona;
    if (play.blunderRate && Math.random() < play.blunderRate) {
      const m = legal[Math.floor(Math.random() * legal.length)];
      return m.from + m.to + (m.promotion ?? "");
    }
    const a = await this.analyse(fen, {
      depth: play.depth,
      movetimeMs: play.movetimeMs,
      multiPv: play.multiPv,
      skill: play.skill,
      limitElo: play.limitElo,
    });
    let move = a.bestMove;
    if (play.multiPv > 1 && a.lines.length > 1 && Math.random() < play.randomness) {
      // Pick among reasonable alternatives, avoiding outright disasters.
      const best = lineScore(a.lines[0]);
      const ok = a.lines.filter((l) => l.pv[0] && best - lineScore(l) < 350);
      const pick = ok[Math.floor(Math.random() * ok.length)];
      if (pick?.pv[0]) move = pick.pv[0];
    }
    // Never trust engine output blindly: it must be legal here.
    if (!move || !legal.some((m) => m.from + m.to + (m.promotion ?? "") === move)) {
      throw new EngineError("invalid", `The engine suggested an impossible move (${move ?? "none"}).`);
    }
    return move;
  }

  dispose() {
    try {
      this.send("quit");
    } catch {
      /* ignore */
    }
    this.fail(new EngineError("crashed", "The engine was closed."));
  }
}

"use client";

import { Chess } from "chess.js";
import type { Persona } from "@/lib/chess/personas";
import type { ChessEngine, EngineAnalysis, EngineLine } from "@/lib/chess/engine/types";
import { lineScore } from "@/lib/chess/engine/types";

type Pending = { lines: Map<number, EngineLine>; resolve: (a: EngineAnalysis) => void; reject: (e: Error) => void; timer: number };

/**
 * Stockfish 19 (lite, single-threaded WASM) running in a Web Worker.
 * GPL-3.0 — see public/stockfish/COPYING.txt.
 */
export class StockfishEngine implements ChessEngine {
  readonly name = "Stockfish 19 lite";
  private worker: Worker | null = null;
  private readyPromise: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private pending: Pending | null = null;
  private listeners = new Set<(line: string) => void>();

  constructor(private readonly url = "/stockfish/sf-lite.js") {}

  ready(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker(this.url);
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Worker failed"));
        return;
      }
      const timeout = window.setTimeout(() => reject(new Error("Engine load timed out")), 15_000);
      this.worker.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Engine failed to load"));
      };
      this.worker.onmessage = (e: MessageEvent) => {
        const line = typeof e.data === "string" ? e.data : "";
        if (!line) return;
        this.listeners.forEach((l) => l(line));
        this.onLine(line);
      };
      const onBoot = (line: string) => {
        if (line === "uciok") this.send("isready");
        if (line === "readyok") {
          window.clearTimeout(timeout);
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
    this.worker?.postMessage(cmd);
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
      window.clearTimeout(p.timer);
      this.pending = null;
      const lines = [...p.lines.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l);
      p.resolve({ bestMove: best && best !== "(none)" ? best : null, lines });
    }
  }

  analyse(fen: string, opts: { depth?: number; movetimeMs?: number; multiPv?: number; skill?: number; limitElo?: number } = {}) {
    const run = async (): Promise<EngineAnalysis> => {
      await this.ready();
      return new Promise<EngineAnalysis>((resolve, reject) => {
        const timer = window.setTimeout(() => this.send("stop"), (opts.movetimeMs ?? 1000) + 4000);
        this.pending = { lines: new Map(), resolve, reject, timer };
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
    // Serialize: UCI engines handle one search at a time.
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
    if (play.multiPv > 1 && a.lines.length > 1 && Math.random() < play.randomness) {
      // Pick among reasonable alternatives, avoiding outright disasters.
      const best = lineScore(a.lines[0]);
      const ok = a.lines.filter((l) => l.pv[0] && best - lineScore(l) < 350);
      const pick = ok[Math.floor(Math.random() * ok.length)];
      if (pick?.pv[0]) return pick.pv[0];
    }
    return a.bestMove;
  }

  dispose() {
    try {
      this.send("quit");
      this.worker?.terminate();
    } catch {
      /* ignore */
    }
    this.worker = null;
    this.readyPromise = null;
  }
}

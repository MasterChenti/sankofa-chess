"use client";

import type { ChessEngine } from "@/lib/chess/engine/types";
import { StockfishEngine } from "@/lib/chess/engine/stockfish";
import { FallbackEngine } from "@/lib/chess/engine/fallback";

let enginePromise: Promise<ChessEngine> | null = null;

/**
 * One shared engine per tab. If Stockfish can't start (old browser, blocked WASM,
 * missing file) we use the lightweight engine instead and say so in the UI.
 * If a running Stockfish dies (timeout, crash, iOS suspending the tab), the next
 * call starts a fresh one.
 */
export function getEngine(): Promise<ChessEngine> {
  if (enginePromise) {
    return enginePromise.then((e) => {
      if (!e.dead) return e;
      enginePromise = null;
      return getEngine();
    });
  }
  const p: Promise<ChessEngine> = (async () => {
    if (typeof window === "undefined" || typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
      return new FallbackEngine();
    }
    const sf = new StockfishEngine();
    try {
      await sf.ready();
      return sf;
    } catch (e) {
      console.warn("Stockfish unavailable, using the fallback engine", e);
      sf.dispose();
      return new FallbackEngine();
    }
  })();
  enginePromise = p;
  return p;
}

/** Throws away the current engine so the next getEngine() starts a fresh one. */
export function resetEngine() {
  const old = enginePromise;
  enginePromise = null;
  void old?.then((e) => e.dispose()).catch(() => undefined);
}

let fallback: FallbackEngine | null = null;
/** The lightweight engine, always available (no worker, no WASM). */
export function getFallbackEngine(): ChessEngine {
  fallback ??= new FallbackEngine();
  return fallback;
}

export type { ChessEngine } from "@/lib/chess/engine/types";
export { EngineError } from "@/lib/chess/engine/types";

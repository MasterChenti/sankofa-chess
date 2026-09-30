"use client";

import type { ChessEngine } from "@/lib/chess/engine/types";
import { StockfishEngine } from "@/lib/chess/engine/stockfish";
import { FallbackEngine } from "@/lib/chess/engine/fallback";

let enginePromise: Promise<ChessEngine> | null = null;

/** One shared engine per tab. Falls back gracefully if WebAssembly workers are unavailable. */
export function getEngine(): Promise<ChessEngine> {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    if (typeof window === "undefined" || typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
      return new FallbackEngine();
    }
    const sf = new StockfishEngine();
    try {
      await sf.ready();
      return sf;
    } catch (e) {
      console.warn("Stockfish unavailable, using fallback engine", e);
      sf.dispose();
      return new FallbackEngine();
    }
  })();
  return enginePromise;
}

export type { ChessEngine } from "@/lib/chess/engine/types";

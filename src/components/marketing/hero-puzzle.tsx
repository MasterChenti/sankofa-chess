"use client";

import * as React from "react";
import { Chess } from "chess.js";
import { RotateCcw } from "lucide-react";
import { ChessBoard } from "@/components/chess/chess-board";
import { Button } from "@/components/ui/button";

const FEN = "7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1";

/** The landing hero is a real, playable position: the thousand-year-old Arabian mate. */
export function HeroPuzzle() {
  const [fen, setFen] = React.useState(FEN);
  const [last, setLast] = React.useState<{ from: string; to: string } | null>(null);
  const [state, setState] = React.useState<"idle" | "mate" | "miss">("idle");

  function onMove(uci: string) {
    const g = new Chess(fen);
    g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    setFen(g.fen());
    setLast({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
    setState(g.isCheckmate() ? "mate" : "miss");
    return true;
  }

  function reset() {
    setFen(FEN);
    setLast(null);
    setState("idle");
  }

  return (
    <div className="flex flex-col gap-4">
      <ChessBoard id="hero-board" fen={fen} movable={state === "idle" ? "w" : "none"} onMove={onMove} lastMove={last} label="Try it: white to move, checkmate in one" />
      <div className="flex min-h-10 items-center justify-between gap-4 text-sm" aria-live="polite">
        {state === "idle" && (
          <p>
            <span className="font-semibold">White to move.</span>{" "}
            <span className="text-muted-foreground">Checkmate in one — a pattern over a thousand years old.</span>
          </p>
        )}
        {state === "mate" && (
          <p>
            <span className="font-semibold text-success">Checkmate.</span>{" "}
            <span className="text-muted-foreground">That’s the Arabian mate: rook and knight in harmony.</span>
          </p>
        )}
        {state === "miss" && (
          <p>
            <span className="font-semibold">Not quite.</span> <span className="text-muted-foreground">The knight already guards g8 and h7.</span>
          </p>
        )}
        {state !== "idle" && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw /> Reset
          </Button>
        )}
      </div>
    </div>
  );
}

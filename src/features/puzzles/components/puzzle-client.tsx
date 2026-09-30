"use client";

import * as React from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Lightbulb, RotateCcw } from "lucide-react";
import { ChessBoard } from "@/components/chess/chess-board";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkPuzzleLine } from "@/features/puzzles/logic";
import { recordPuzzleAttempt } from "@/features/puzzles/actions";
import { celebrate } from "@/features/progress/celebrate";
import { uciToMove } from "@/lib/chess/rules";
import { track } from "@/lib/analytics";
import type { Puzzle } from "@/types/database";
import { cn } from "@/lib/utils";

type Status = "playing" | "wrong" | "solved" | "revealed";

export function PuzzleClient({ puzzle, alreadySolved, nextHref }: { puzzle: Puzzle; alreadySolved: boolean; nextHref: string }) {
  const [moves, setMoves] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<Status>("playing");
  const [hint, setHint] = React.useState(false);
  const [wrongMove, setWrongMove] = React.useState<string | null>(null);
  const [reported, setReported] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const solverColor = puzzle.fen.split(" ")[1] === "b" ? "b" : "w";

  React.useEffect(() => {
    track("puzzle_started", { puzzle: puzzle.slug });
  }, [puzzle.slug]);

  const fen = React.useMemo(() => {
    const g = new Chess(puzzle.fen);
    for (const m of moves) g.move(uciToMove(m));
    if (wrongMove) {
      try {
        g.move(uciToMove(wrongMove));
      } catch {
        /* ignore */
      }
    }
    return g.fen();
  }, [puzzle.fen, moves, wrongMove]);

  const lastUci = wrongMove ?? moves[moves.length - 1];
  const solverMovesTotal = Math.ceil(puzzle.solution.length / 2);
  const solverMovesDone = Math.ceil(moves.length / 2);

  async function report(outcome: "solved" | "failed" | "revealed", line: string[]) {
    setSaving(true);
    const res = await recordPuzzleAttempt({ puzzleId: puzzle.id, moves: line, outcome }).finally(() => setSaving(false));
    if (!res.ok) setSaveError(res.error);
    else {
      setSaveError(null);
      celebrate(res.progress, res.correct ? "Puzzle solved" : undefined);
    }
  }

  function onMove(uci: string) {
    if (status !== "playing") return false;
    const line = [...moves, uci];
    const verdict = checkPuzzleLine(puzzle, line);
    if (verdict === "wrong") {
      setWrongMove(uci);
      setStatus("wrong");
      if (!reported) {
        setReported(true);
        void report("failed", line);
      }
      return true;
    }
    if (verdict === "solved") {
      setMoves(line);
      setStatus("solved");
      void report("solved", line);
      return true;
    }
    // Correct so far: play the scripted reply.
    setMoves(line);
    const reply = puzzle.solution[line.length];
    window.setTimeout(() => setMoves((m) => (m.length === line.length ? [...m, reply] : m)), 450);
    return true;
  }

  function retry() {
    setWrongMove(null);
    setStatus("playing");
  }

  function reveal() {
    setWrongMove(null);
    setMoves(puzzle.solution);
    setStatus("revealed");
    if (!reported) {
      setReported(true);
      void report("revealed", []);
    }
  }

  const turnLabel = solverColor === "w" ? "White to move." : "Black to move.";
  const task = puzzle.is_mate ? "Find the checkmate." : "Find the best move.";
  const feedback =
    status === "solved"
      ? { tone: "good", text: "Excellent. You saw the tactic." }
      : status === "wrong"
        ? { tone: "bad", text: "Not quite. Look for the opponent’s defensive resource." }
        : status === "revealed"
          ? { tone: "neutral", text: "Here’s the solution. Replay the idea in your head, then try the next one." }
          : moves.length
            ? { tone: "good", text: "Good — keep going." }
            : { tone: "neutral", text: "Your move." };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="mx-auto w-full max-w-[640px]">
        <ChessBoard
          id="puzzle-board"
          fen={fen}
          orientation={solverColor === "w" ? "white" : "black"}
          movable={status === "playing" && moves.length % 2 === 0 ? solverColor : "none"}
          onMove={onMove}
          lastMove={lastUci ? { from: lastUci.slice(0, 2), to: lastUci.slice(2, 4) } : null}
          hintSquares={hint && status === "playing" ? [puzzle.solution[moves.length]?.slice(0, 2)].filter(Boolean) : []}
          extraSquareStyles={
            wrongMove ? { [wrongMove.slice(2, 4)]: { boxShadow: "inset 0 0 0 4px var(--destructive)" } } : undefined
          }
          label="Puzzle board"
        />
      </div>
      <aside className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="gold" className="capitalize">
            {puzzle.difficulty}
          </Badge>
          <Badge>{puzzle.category}</Badge>
          {alreadySolved && <Badge variant="success">Solved before</Badge>}
        </div>
        <div>
          <h1 className="text-3xl font-semibold">{puzzle.title}</h1>
          <p className="mt-1.5">
            <span className="font-semibold">{turnLabel}</span> <span className="text-muted-foreground">{task}</span>
          </p>
          <p className="num mt-2 text-sm text-muted-foreground" aria-live="polite">
            {solverMovesTotal > 1 ? `Move ${Math.min(solverMovesDone + (status === "playing" ? 1 : 0), solverMovesTotal)} of ${solverMovesTotal}` : "One move to find"}
          </p>
        </div>
        <p
          data-testid="puzzle-feedback"
          data-saving={saving}
          aria-live="polite"
          className={cn(
            "rounded-[var(--radius-md)] px-4 py-3.5 font-semibold",
            feedback.tone === "good" && "bg-success/15 text-success",
            feedback.tone === "bad" && "bg-destructive/12 text-destructive",
            feedback.tone === "neutral" && "bg-surface-2",
          )}
        >
          {feedback.text}
        </p>
        {(status === "solved" || status === "revealed") && <p className="text-sm text-muted-foreground">{puzzle.description}</p>}
        {hint && status === "playing" && puzzle.hint && (
          <p className="rounded-[var(--radius-md)] border border-border px-4 py-3 text-sm">
            <Lightbulb className="mr-1.5 inline size-4 text-accent-foreground" />
            {puzzle.hint}
          </p>
        )}
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        {status === "playing" || status === "wrong" ? (
          <div className="flex flex-wrap gap-2">
            {status === "wrong" && (
              <Button variant="secondary" onClick={retry} data-testid="puzzle-retry">
                <RotateCcw /> Try Again
              </Button>
            )}
            {!hint && (
              <Button variant="ghost" onClick={() => setHint(true)} disabled={status !== "playing"}>
                <Lightbulb /> Hint
              </Button>
            )}
            <Button variant="ghost" onClick={reveal}>
              Show solution
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={nextHref}>Next puzzle</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/app/home">Dashboard</Link>
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}

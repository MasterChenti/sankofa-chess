"use client";

import * as React from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { ChessBoard } from "@/components/chess/chess-board";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkLessonMove } from "@/features/learning/logic";
import { submitLessonMove } from "@/features/learning/actions";
import { celebrate } from "@/features/progress/celebrate";
import { uciToMove } from "@/lib/chess/rules";
import { track } from "@/lib/analytics";
import type { Lesson } from "@/types/database";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<Lesson["category"], string> = { beginner: "Beginner", strategy: "Strategy", tactics: "Tactics", endgame: "Endgame" };

export function LessonClient({
  lesson,
  position,
  total,
  completed,
  next,
}: {
  lesson: Lesson;
  position: number;
  total: number;
  completed: boolean;
  next: { slug: string; title: string } | null;
}) {
  const c = lesson.content;
  const [fen, setFen] = React.useState(c.fen);
  const [last, setLast] = React.useState<{ from: string; to: string } | null>(null);
  const [state, setState] = React.useState<"idle" | "checking" | "done" | "wrong">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [isDone, setIsDone] = React.useState(completed);
  const color = c.fen.split(" ")[1] === "b" ? "b" : "w";

  React.useEffect(() => {
    track("lesson_started", { lesson: lesson.slug });
  }, [lesson.slug]);

  async function onMove(uci: string) {
    const g = new Chess(fen);
    g.move(uciToMove(uci));
    setFen(g.fen());
    setLast({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
    if (!checkLessonMove(c, uci)) {
      setState("wrong");
      return true;
    }
    setState("checking");
    const res = await submitLessonMove({ lessonId: lesson.id, move: uci });
    if (!res.ok) {
      setError(res.error);
      setState("done");
      return true;
    }
    setError(null);
    setState("done");
    setIsDone(true);
    celebrate(res.progress, "Lesson completed");
    return true;
  }

  function reset() {
    setFen(c.fen);
    setLast(null);
    setState("idle");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <article className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="gold">
            {CATEGORY_LABEL[lesson.category]} · {String(position).padStart(2, "0")} of {total}
          </Badge>
          <Badge>{lesson.duration_minutes} min</Badge>
          {isDone && (
            <Badge variant="success" data-testid="lesson-complete-badge">
              <CheckCircle2 /> Completed
            </Badge>
          )}
        </div>
        <h1 className="text-[2.2rem] font-semibold leading-tight sm:text-[2.8rem]">{lesson.title}</h1>
        <div className="flex max-w-[62ch] flex-col gap-4 text-[1.05rem] leading-relaxed text-foreground/90">
          {c.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Your task</p>
          <p className="mt-1 text-lg font-semibold">{c.task}</p>
          <p
            aria-live="polite"
            data-testid="lesson-feedback"
            className={cn(
              "mt-4 rounded-[var(--radius-md)] px-4 py-3 text-sm font-semibold",
              state === "done" && !error && "bg-success/15 text-success",
              state === "wrong" && "bg-destructive/12 text-destructive",
              (state === "idle" || state === "checking") && "bg-surface-2",
            )}
          >
            {state === "idle" && (isDone ? "You’ve completed this lesson. Play it again any time." : "Make your move on the board.")}
            {state === "checking" && "Checking…"}
            {state === "wrong" && "Not this time. Re-read the idea above, then try again."}
            {state === "done" && !error && "Lesson complete. That idea is yours now."}
            {state === "done" && error}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(state === "wrong" || state === "done") && (
              <Button variant="secondary" onClick={reset}>
                <RotateCcw /> {state === "wrong" ? "Try again" : "Replay"}
              </Button>
            )}
            {next && (state === "done" || isDone) && (
              <Button asChild>
                <Link href={`/app/learn/${next.slug}`}>Next: {next.title}</Link>
              </Button>
            )}
            {!next && (state === "done" || isDone) && (
              <Button asChild>
                <Link href="/app/learn">Back to all lessons</Link>
              </Button>
            )}
          </div>
        </div>
      </article>
      <div className="mx-auto w-full max-w-[560px] lg:sticky lg:top-24">
        <ChessBoard
          id="lesson-board"
          fen={fen}
          orientation={color === "w" ? "white" : "black"}
          movable={state === "idle" ? color : "none"}
          onMove={onMove}
          lastMove={last}
          label="Lesson board"
        />
      </div>
    </div>
  );
}

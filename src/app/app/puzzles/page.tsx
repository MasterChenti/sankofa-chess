import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { MiniBoard } from "@/components/chess/mini-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePlayer } from "@/features/auth/session";
import { dailyPuzzle, getPuzzleProgress, getPuzzles } from "@/features/puzzles/queries";
import { puzzleAccuracy } from "@/features/progress/rules";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Puzzles" };

const FILTERS = ["all", "beginner", "intermediate", "advanced"] as const;

export default async function PuzzlesPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await searchParams;
  const filter = FILTERS.includes(level as (typeof FILTERS)[number]) ? (level as (typeof FILTERS)[number]) : "all";
  const { supabase, profile } = await requirePlayer();
  const [puzzles, progress] = await Promise.all([getPuzzles(supabase), getPuzzleProgress(supabase, profile.id, profile.timezone)]);
  const daily = dailyPuzzle(puzzles, profile);
  const acc = puzzleAccuracy(profile.puzzle_first_attempts, profile.puzzle_first_correct);
  const list = filter === "all" ? puzzles : puzzles.filter((p) => p.difficulty === filter);

  const stats: [string, string][] = [
    [`${progress.solved.size}/${puzzles.length}`, "Solved"],
    [acc == null ? "—" : `${acc}%`, "First-try accuracy"],
    [String(profile.puzzle_run), "Current run"],
    [`${Math.min(progress.solvedToday, 3)}/3`, "Today"],
  ];

  return (
    <>
      <PageHeader title="Puzzles" description="Find the move. Train the pattern." />

      {daily && (
        <Card className="mb-6 grid gap-5 p-5 sm:grid-cols-[180px_1fr] sm:items-center sm:p-6">
          <div className="mx-auto w-40 sm:w-full">
            <MiniBoard fen={daily.fen} flip={daily.fen.split(" ")[1] === "b"} label={`Daily puzzle: ${daily.title}`} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Daily Puzzle</p>
            <h2 className="text-2xl font-semibold">{daily.title}</h2>
            <p className="text-sm">
              Difficulty: <span className="capitalize">{daily.difficulty}</span>
            </p>
            <p className="text-muted-foreground">{daily.fen.split(" ")[1] === "b" ? "Black" : "White"} to move. Find the best move.</p>
            <div className="mt-2 flex items-center gap-3">
              <Button asChild>
                <Link href={`/app/puzzles/${daily.slug}`}>{progress.solved.has(daily.id) ? "Solve again" : "Solve Puzzle"}</Link>
              </Button>
              {progress.solved.has(daily.id) && (
                <span className="flex items-center gap-1 text-sm text-success">
                  <CheckCircle2 className="size-4" /> Solved
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="mb-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stats.map(([v, l]) => (
          <div key={l} className="rounded-[var(--radius-md)] border border-border bg-card px-4 py-3">
            <p className="num font-display text-2xl font-semibold">{v}</p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">All puzzles</h2>
        <nav aria-label="Filter by difficulty" className="scrollbar-none flex max-w-full gap-1 overflow-x-auto rounded-[var(--radius-md)] bg-surface-2 p-1">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/app/puzzles" : `/app/puzzles?level=${f}`}
              aria-current={filter === f ? "page" : undefined}
              scroll={false}
              className={cn(
                "whitespace-nowrap rounded-[calc(var(--radius-md)-4px)] px-3.5 py-2 text-sm font-semibold capitalize text-muted-foreground",
                filter === f && "bg-card text-foreground shadow-card",
              )}
            >
              {f}
            </Link>
          ))}
        </nav>
      </div>

      {list.length === 0 ? (
        <EmptyState title="No puzzles at this level yet." body="New puzzles are added regularly. Try another level for now." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <li key={p.id}>
              <Link
                href={`/app/puzzles/${p.slug}`}
                className="group flex h-full flex-col gap-2.5 rounded-[var(--radius-lg)] border border-border bg-card p-3 transition-colors hover:border-border-strong"
              >
                <MiniBoard fen={p.fen} flip={p.fen.split(" ")[1] === "b"} label={p.title} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="capitalize">{p.difficulty}</span> · {p.category}
                    </p>
                  </div>
                  {progress.solved.has(p.id) && (
                    <Badge variant="success" className="px-1.5">
                      <CheckCircle2 />
                      <span className="sr-only">Solved</span>
                    </Badge>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

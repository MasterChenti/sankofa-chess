import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requirePlayer } from "@/features/auth/session";
import type { Lesson } from "@/types/database";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Learn" };

const CATEGORIES: { key: Lesson["category"]; title: string; blurb: string }[] = [
  { key: "beginner", title: "Beginner", blurb: "How pieces move, check and checkmate, castling, first principles." },
  { key: "strategy", title: "Strategy", blurb: "The centre, development, king safety, pawn structure and space." },
  { key: "tactics", title: "Tactics", blurb: "Forks, pins, skewers, discovered attacks and mating patterns." },
  { key: "endgame", title: "Endgame", blurb: "King and pawn, opposition, and the rook endings you will actually meet." },
];

export default async function LearnPage() {
  const { supabase, profile } = await requirePlayer();
  const [{ data: lessonData }, { data: progData }] = await Promise.all([
    supabase.from("lessons").select("id, slug, title, category, duration_minutes, order_index").order("order_index"),
    supabase.from("lesson_progress").select("lesson_id, completed").eq("user_id", profile.id),
  ]);
  const lessons = (lessonData ?? []) as Pick<Lesson, "id" | "slug" | "title" | "category" | "duration_minutes" | "order_index">[];
  const done = new Set(((progData ?? []) as { lesson_id: string; completed: boolean }[]).filter((p) => p.completed).map((p) => p.lesson_id));
  const next = lessons.find((l) => !done.has(l.id));

  if (!lessons.length) {
    return (
      <>
        <PageHeader title="Learn" description="Read the idea. Play it on the board." />
        <EmptyState title="Lessons are on their way." body="The lesson library hasn’t been loaded yet. Please check back shortly." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Learn"
        description="Read the idea. Play it on the board."
        actions={
          next ? (
            <Button asChild>
              <Link href={`/app/learn/${next.slug}`}>Continue: {next.title}</Link>
            </Button>
          ) : null
        }
      />
      <Card className="mb-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div>
          <p className="num font-display text-3xl font-semibold">
            {done.size}/{lessons.length}
          </p>
          <p className="text-sm text-muted-foreground">Lessons completed</p>
        </div>
        <Progress value={(100 * done.size) / lessons.length} className="h-2 sm:flex-1" />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const list = lessons.filter((l) => l.category === cat.key);
          const catDone = list.filter((l) => done.has(l.id)).length;
          return (
            <section key={cat.key} className="rounded-[var(--radius-lg)] border border-border bg-card p-2" aria-labelledby={`cat-${cat.key}`}>
              <div className="flex items-start justify-between gap-4 px-4 pb-2 pt-4">
                <div>
                  <h2 id={`cat-${cat.key}`} className="text-2xl font-semibold">
                    {cat.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{cat.blurb}</p>
                </div>
                <span className="num shrink-0 text-sm text-muted-foreground">
                  {catDone}/{list.length}
                </span>
              </div>
              <ol>
                {list.map((l, i) => {
                  const isDone = done.has(l.id);
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/app/learn/${l.slug}`}
                        className="flex items-center gap-4 rounded-[var(--radius-md)] px-4 py-3 transition-colors hover:bg-surface-2"
                      >
                        <span
                          className={cn(
                            "num grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                            isDone ? "bg-success/15 text-success" : "bg-surface-2 text-muted-foreground",
                          )}
                        >
                          {isDone ? <CheckCircle2 className="size-4" /> : String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block font-semibold", next?.id === l.id && "text-accent-foreground")}>{l.title}</span>
                          <span className="text-xs text-muted-foreground">{l.duration_minutes} min · interactive</span>
                        </span>
                        <ChevronRight className="size-4 text-faint" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </>
  );
}

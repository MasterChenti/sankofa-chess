import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, LayoutGrid, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MiniBoard } from "@/components/chess/mini-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePlayer } from "@/features/auth/session";
import { getToday } from "@/features/today/queries";
import { STYLE_LABEL, dominantStyle } from "@/features/think/styles";
import { contentLocale } from "@/lib/i18n";
import type { ThinkingStyle, Thought } from "@/types/database";

export const metadata: Metadata = { title: "Think" };

export default async function ThinkPage() {
  const { supabase, profile } = await requirePlayer();
  const [today, { data: tData }, { data: aData }] = await Promise.all([
    getToday(supabase, profile),
    supabase.from("thoughts").select("id, slug, prompt, options, sort_order").eq("locale", contentLocale(profile)).order("sort_order"),
    supabase.from("thought_answers").select("thought_id, choice, style").eq("user_id", profile.id),
  ]);
  const thoughts = (tData ?? []) as Pick<Thought, "id" | "slug" | "prompt" | "options" | "sort_order">[];
  const answers = new Map(((aData ?? []) as { thought_id: string; choice: string; style: ThinkingStyle | null }[]).map((a) => [a.thought_id, a]));
  const dom = dominantStyle([...answers.values()].map((a) => a.style));
  const puzzle = today.puzzle;

  return (
    <>
      <PageHeader title="Think" description="Calculate on the board, and think about strategy away from it." />

      <div className="mb-8 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        {puzzle && (
          <Link
            href={`/app/puzzles/${puzzle.slug}`}
            className="grid grid-cols-[110px_1fr] items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 transition-colors hover:border-gold/60"
            data-testid="think-today-puzzle"
          >
            <MiniBoard fen={puzzle.fen} label={puzzle.title} flip={puzzle.fen.split(" ")[1] === "b"} />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-accent-foreground">Today’s position</span>
              <span className="text-xl font-semibold">{puzzle.title}</span>
              <span className="text-sm text-muted-foreground">
                {today.status.move ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckCircle2 className="size-4" /> Done today
                  </span>
                ) : puzzle.is_mate ? (
                  "Find the checkmate"
                ) : (
                  "Find the best move"
                )}
              </span>
            </span>
          </Link>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/app/puzzles" className="flex flex-col justify-between gap-5 rounded-[var(--radius-lg)] border border-border bg-card p-4 hover:border-gold/60">
            <LayoutGrid className="size-6 text-accent-foreground" />
            <span>
              <span className="block text-lg font-semibold">Puzzles</span>
              <span className="text-xs text-muted-foreground">Train patterns</span>
            </span>
          </Link>
          <Link href="/app/learn" className="flex flex-col justify-between gap-5 rounded-[var(--radius-lg)] border border-border bg-card p-4 hover:border-gold/60">
            <BookOpen className="size-6 text-accent-foreground" />
            <span>
              <span className="block text-lg font-semibold">Lessons</span>
              <span className="text-xs text-muted-foreground">Ideas on the board</span>
            </span>
          </Link>
        </div>
      </div>

      <section aria-labelledby="questions-h" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="questions-h" className="text-2xl font-semibold">
              Strategic questions
            </h2>
            <p className="text-sm text-muted-foreground">
              No single right answer. You’ve answered {answers.size} of {thoughts.length}.
            </p>
          </div>
        </div>

        {dom && (
          <div className="rounded-[var(--radius-lg)] bg-brown/35 p-5" data-testid="thinking-style">
            <p className="text-sm text-muted-foreground">Your answers so far lean</p>
            <p className="font-display text-2xl font-semibold">{STYLE_LABEL[dom.style].title}</p>
            <p className="text-sm">{STYLE_LABEL[dom.style].line}</p>
            <p className="mt-2 text-xs text-faint">
              {dom.count} of {dom.total} answers. Just for fun: a mirror of your choices, not a personality test.
            </p>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {thoughts.map((t) => {
            const a = answers.get(t.id);
            const opt = a ? t.options.find((o) => o.key === a.choice) : null;
            return (
              <li key={t.id}>
                <Link
                  href={`/app/think/${t.slug}`}
                  className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 transition-colors hover:border-gold/60"
                >
                  <Lightbulb className={a ? "size-5 shrink-0 text-success" : "size-5 shrink-0 text-accent-foreground"} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{t.prompt}</span>
                    {opt && <span className="mt-0.5 block truncate text-xs text-muted-foreground">You chose: {opt.text}</span>}
                  </span>
                  {opt ? <Badge>{STYLE_LABEL[opt.style].short}</Badge> : <ArrowRight className="size-4 shrink-0 text-faint" />}
                </Link>
              </li>
            );
          })}
        </ul>
        {thoughts.length > 0 && answers.size === thoughts.length && (
          <p className="text-sm text-muted-foreground">You’ve answered every question. New ones are added as they’re written.</p>
        )}
        <Button asChild variant="secondary" className="w-fit">
          <Link href="/app/today">Back to Today</Link>
        </Button>
      </section>
    </>
  );
}

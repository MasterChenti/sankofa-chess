import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Crosshair, Flame, Lightbulb, PenLine, ScrollText, Sunrise, Swords } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requirePlayer } from "@/features/auth/session";
import { getToday } from "@/features/today/queries";
import { STEPS, isDayComplete, minutesLeft, nextStep, type StepKey } from "@/features/today/plan";
import { greeting, localHour } from "@/features/today/copy";
import { getMyLiveGames } from "@/features/online/queries";
import { OnlineCount } from "@/features/online/components/online-count";
import { displayStreak } from "@/features/progress/rules";
import { liveTurnLabel } from "@/lib/chess/live";
import { SANKOFA_DAILY } from "@/config/sankofa-daily";
import { dayIndex } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Today" };

const ICON: Record<StepKey, LucideIcon> = { move: Crosshair, remember: ScrollText, think: Lightbulb, play: Swords, reflect: PenLine };

export default async function TodayPage() {
  const { supabase, profile } = await requirePlayer();
  const [today, live] = await Promise.all([getToday(supabase, profile), getMyLiveGames(supabase, profile.id)]);
  const { status, puzzle, story, storyReason, thought, session } = today;

  const done = isDayComplete(status);
  const next = nextStep(status);
  const left = minutesLeft(status);
  const streak = displayStreak(profile.last_active_date, today.day, profile.streak, profile.rest_week);
  const hello = greeting(localHour(new Date(), profile.timezone));
  const sankofa = SANKOFA_DAILY[dayIndex(today.day) % SANKOFA_DAILY.length];
  const yourMove = live.filter((g) => g.status === "active" && liveTurnLabel(g, profile.id) === "Your move");
  const coreDone = STEPS.filter((s) => s.core && status[s.key]).length;

  const detail: Record<StepKey, { title: string; sub: string | null }> = {
    move: { title: puzzle ? puzzle.title : "Today’s position", sub: puzzle ? (puzzle.is_mate ? "Find the checkmate" : "Find the best move") : null },
    remember: { title: story?.title ?? "Today’s story", sub: storyReason },
    think: { title: thought?.prompt ?? "A strategic question", sub: "No single right answer" },
    play: {
      title: yourMove.length ? `${yourMove.length} game${yourMove.length > 1 ? "s" : ""} waiting for your move` : "A real opponent, or Abena",
      sub: "Bonus: not needed to complete today",
    },
    reflect: { title: "What stayed with you?", sub: "One minute to close the day" },
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-7">
      <section className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-accent-foreground">Today</p>
            <h1 className="text-[2.2rem] font-semibold leading-tight sm:text-[2.8rem]" data-testid="home-greeting">
              {hello}, {profile.display_name}.
            </h1>
          </div>
          <div className="flex shrink-0 flex-col items-end" aria-label={`${streak} day streak`}>
            <span className="num inline-flex items-center gap-1 font-display text-3xl font-semibold">
              {streak}
              <Flame className={cn("size-6", streak > 0 ? "text-warning" : "text-faint")} />
            </span>
            <span className="text-xs text-muted-foreground">day streak</span>
          </div>
        </div>

        {done ? (
          <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-gold/40 bg-accent/40 p-5" data-testid="today-done">
            <p className="flex items-center gap-2 font-display text-2xl font-semibold">
              <Sunrise className="size-6 text-accent-foreground" /> You’ve sharpened your mind for today.
            </p>
            <p className="text-muted-foreground">
              That’s it: no endless feed. Come back tomorrow for a new position, a new story and a new question.
              {!status.play && " If you have time, a game with a real person is the best way to use what you learned."}
            </p>
            {session.reflection && <p className="font-display text-lg italic">“{session.reflection}”</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-lg text-muted-foreground" data-testid="today-status">
              {coreDone === 0
                ? `About ${left} minutes to sharpen your mind. One position, one story, one question, one thought.`
                : `${coreDone} of 4 done · about ${left} minute${left === 1 ? "" : "s"} left.`}
            </p>
            <Button asChild size="lg" className="w-fit" data-testid="start-morning">
              <Link href="/app/today/morning">
                {coreDone === 0 ? "Start my session" : "Continue"} <ArrowRight />
              </Link>
            </Button>
          </div>
        )}
      </section>

      <ol className="flex flex-col gap-2.5" aria-label="Today’s session">
        {STEPS.map((s) => {
          const Icon = ICON[s.key];
          const isDone = status[s.key];
          const isNext = !done && next === s.key;
          return (
            <li key={s.key}>
              <Link
                href={`/app/today/morning?step=${s.key}`}
                data-testid={`today-step-${s.key}`}
                data-done={isDone}
                className={cn(
                  "flex items-center gap-4 rounded-[var(--radius-lg)] border bg-card p-4 transition-colors hover:border-gold/60",
                  isNext ? "border-gold" : "border-border",
                  isDone && "opacity-75",
                )}
              >
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-full",
                    isDone ? "bg-success/15 text-success" : "bg-surface-2 text-accent-foreground",
                  )}
                >
                  {isDone ? <Check className="size-5" /> : <Icon className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{s.label}</span>
                    <span>· {s.minutes} min</span>
                    {!s.core && <Badge>Bonus</Badge>}
                  </span>
                  <span className="mt-0.5 block truncate font-semibold">{detail[s.key].title}</span>
                  {s.key === "play" ? (
                    <OnlineCount userId={profile.id} className="mt-0.5 text-xs" />
                  ) : (
                    detail[s.key].sub && <span className="mt-0.5 block text-xs text-muted-foreground">{detail[s.key].sub}</span>
                  )}
                </span>
                <ArrowRight className="size-4 shrink-0 text-faint" />
              </Link>
            </li>
          );
        })}
      </ol>

      {yourMove.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Your move</h2>
          {yourMove.map((g) => (
            <Link
              key={g.id}
              href={`/app/play/live/${g.id}`}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 text-sm hover:border-gold/60"
            >
              <span>
                vs <span className="font-semibold">{g.opponent ?? "Opponent"}</span> · <span className="capitalize">{g.mode}</span>
              </span>
              <Badge variant="gold">Your move</Badge>
            </Link>
          ))}
        </section>
      )}

      <section className="rounded-[var(--radius-lg)] bg-brown/35 p-5">
        <p className="text-sm text-muted-foreground">Sankofa of the day</p>
        <blockquote className="mt-1 font-display text-2xl italic leading-snug">“{sankofa.proverb}”</blockquote>
        <p className="mt-1 text-xs text-muted-foreground">{sankofa.origin}</p>
        <p className="mt-3 text-sm">
          <span className="font-semibold">At the board:</span> {sankofa.practice}
        </p>
      </section>
    </div>
  );
}

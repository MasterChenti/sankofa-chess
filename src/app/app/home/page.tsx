import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight, Flame, LayoutGrid, Swords } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/layout/page-header";
import { requirePlayer } from "@/features/auth/session";
import { getChallengeStatus } from "@/features/challenges/queries";
import { displayStreak, levelForXp, puzzleAccuracy, winRate } from "@/features/progress/rules";
import { SANKOFA_DAILY } from "@/config/sankofa-daily";
import { dayIndex, dayKey } from "@/lib/utils/dates";
import type { GameRow, Lesson } from "@/types/database";
import { relativeDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const { supabase, profile } = await requirePlayer();
  const today = dayKey(new Date(), profile.timezone);

  const [challenges, { data: lessonData }, { data: progData }, { data: gameData }] = await Promise.all([
    getChallengeStatus(supabase, profile),
    supabase.from("lessons").select("id, slug, title, category, duration_minutes").order("order_index"),
    supabase.from("lesson_progress").select("lesson_id, completed").eq("user_id", profile.id),
    supabase
      .from("games")
      .select("id, opponent_name, outcome, termination, created_at, rating_change, rated")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const lessons = (lessonData ?? []) as Pick<Lesson, "id" | "slug" | "title" | "category" | "duration_minutes">[];
  const done = new Set(((progData ?? []) as { lesson_id: string; completed: boolean }[]).filter((p) => p.completed).map((p) => p.lesson_id));
  const preferred = profile.goal === "strategy" ? "strategy" : profile.goal === "tactics" || profile.goal === "tournaments" ? "tactics" : null;
  const nextLesson =
    (preferred && lessons.find((l) => l.category === preferred && !done.has(l.id))) || lessons.find((l) => !done.has(l.id)) || null;
  const nextIndex = nextLesson ? lessons.filter((l) => l.category === nextLesson.category).findIndex((l) => l.id === nextLesson.id) + 1 : 0;

  const games = (gameData ?? []) as Pick<GameRow, "id" | "opponent_name" | "outcome" | "termination" | "created_at" | "rating_change" | "rated">[];
  const daily = challenges.find((c) => c.type === "daily");
  const weekly = challenges.filter((c) => c.type !== "daily");
  const lv = levelForXp(profile.xp);
  const streak = displayStreak(profile.last_active_date, today, profile.streak);
  const acc = puzzleAccuracy(profile.puzzle_first_attempts, profile.puzzle_first_correct);
  const wr = winRate(profile.games_played, profile.wins);
  const sankofa = SANKOFA_DAILY[dayIndex(today) % SANKOFA_DAILY.length];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.6rem]" data-testid="home-greeting">
          Welcome back, {profile.display_name}.
        </h1>
        <p className="text-muted-foreground">
          Sankofa Level {lv.level} · {lv.name}
          {lv.next ? ` — ${lv.next.minXp - profile.xp} XP to ${lv.next.name}` : " — top level reached"}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* Today's mission */}
        {daily && (
          <Card className="relative overflow-hidden">
            <LogoMark className="pointer-events-none absolute -bottom-6 -right-4 size-40 text-foreground opacity-[0.05]" />
            <CardHeader>
              <p className="text-sm text-muted-foreground">Today’s mission</p>
              <CardTitle className="text-2xl">Daily Sankofa Challenge</CardTitle>
              <p>{daily.title}.</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Progress value={(100 * daily.progress) / daily.target} className="h-2 flex-1" aria-label="Daily challenge progress" />
                <span className="num font-semibold" data-testid="daily-progress">
                  {daily.progress} / {daily.target}
                </span>
              </div>
              {daily.completed ? (
                <p className="text-sm font-semibold text-success">Mission complete · +{daily.reward_xp} XP earned. Come back tomorrow.</p>
              ) : (
                <div>
                  <Button asChild>
                    <Link href="/app/puzzles/next">{daily.progress ? "Continue puzzles" : "Start puzzles"}</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: "/app/play", label: "Play", sub: "vs computer", icon: Swords },
            { href: "/app/puzzles/daily", label: "Puzzle", sub: "daily", icon: LayoutGrid },
            { href: nextLesson ? `/app/learn/${nextLesson.slug}` : "/app/learn", label: "Learn", sub: "next lesson", icon: BookOpen },
          ].map(({ href, label, sub, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col justify-between gap-6 rounded-[var(--radius-lg)] border border-border bg-card p-4 transition-colors hover:border-gold/60"
            >
              <Icon className="size-6 text-accent-foreground" />
              <span>
                <span className="block text-lg font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">{sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Progress */}
      <section aria-labelledby="progress-h">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="progress-h" className="text-xl font-semibold">
            Your progress
          </h2>
          <Link href="/app/profile" className="text-sm font-semibold text-accent-foreground hover:underline">
            Full profile
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {(
            [
              [profile.rating, "Rating"],
              [profile.games_played, "Games"],
              [wr == null ? "—" : `${wr}%`, "Win rate"],
              [acc == null ? "—" : `${acc}%`, "Puzzle accuracy"],
              [
                <span key="s" className="inline-flex items-center gap-1">
                  {streak}
                  <Flame className="size-5 text-warning" />
                </span>,
                "Day streak",
              ],
            ] as [React.ReactNode, string][]
          ).map(([v, l], i) => (
            <div key={l + i} className="rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 last:col-span-2 sm:last:col-span-1">
              <p className="num font-display text-2xl font-semibold">{v}</p>
              <p className="text-xs text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Continue learning */}
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Continue learning</p>
            {nextLesson ? (
              <CardTitle className="text-2xl">
                Lesson {String(nextIndex).padStart(2, "0")} — {nextLesson.title}
              </CardTitle>
            ) : (
              <CardTitle className="text-2xl">Every lesson complete.</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {nextLesson ? (
              <>
                <p className="mb-4 text-sm capitalize text-muted-foreground">
                  {nextLesson.category} · {nextLesson.duration_minutes} min · interactive
                </p>
                <Button asChild variant="secondary">
                  <Link href={`/app/learn/${nextLesson.slug}`}>Start lesson</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">New lessons arrive regularly. Keep sharp with puzzles meanwhile.</p>
            )}
          </CardContent>
        </Card>

        {/* Sankofa of the day */}
        <Card className="bg-brown/35">
          <CardHeader>
            <p className="text-sm text-muted-foreground">Sankofa of the Day</p>
            <blockquote className="font-display text-2xl italic leading-snug">“{sankofa.proverb}”</blockquote>
            <p className="text-xs text-muted-foreground">{sankofa.origin}</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-semibold">At the board:</span> {sankofa.practice}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Weekly challenges */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>This week</CardTitle>
            <Link href="/app/challenges" className="text-sm font-semibold text-accent-foreground hover:underline">
              All challenges
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {weekly.map((c) => (
              <div key={c.id} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-3 text-sm">
                  <span className={c.completed ? "text-muted-foreground line-through" : ""}>{c.title}</span>
                  <span className="num shrink-0 text-muted-foreground">
                    {c.progress}/{c.target}
                  </span>
                </div>
                <Progress value={(100 * c.progress) / c.target} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent games */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent games</CardTitle>
            <Link href="/app/profile#games" className="text-sm font-semibold text-accent-foreground hover:underline">
              All games
            </Link>
          </CardHeader>
          <CardContent>
            {games.length === 0 ? (
              <EmptyState
                title="Your first game is waiting."
                body="Play the computer and you’ll get a personal review afterwards."
                action={
                  <Button asChild>
                    <Link href="/app/play">Play your first game</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="-mx-2 flex flex-col">
                {games.map((g) => (
                  <li key={g.id}>
                    <Link href={`/app/play/${g.id}`} className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 hover:bg-surface-2">
                      <span
                        className={
                          g.outcome === "win"
                            ? "size-2.5 rounded-full bg-success"
                            : g.outcome === "loss"
                              ? "size-2.5 rounded-full bg-destructive"
                              : "size-2.5 rounded-full bg-warm"
                        }
                        aria-hidden
                      />
                      <span className="flex-1 text-sm">
                        <span className="font-semibold capitalize">{g.outcome}</span> vs {g.opponent_name}
                        <span className="block text-xs text-muted-foreground">
                          by {g.termination} · {relativeDate(g.created_at)}
                        </span>
                      </span>
                      {g.rated && g.rating_change != null && (
                        <span className="num text-sm font-semibold text-muted-foreground">
                          {g.rating_change >= 0 ? `+${g.rating_change}` : g.rating_change}
                        </span>
                      )}
                      <ChevronRight className="size-4 text-faint" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

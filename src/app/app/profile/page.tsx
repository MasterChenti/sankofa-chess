import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { AchievementIcon } from "@/components/profile/achievement-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requirePlayer } from "@/features/auth/session";
import { displayStreak, levelForXp, puzzleAccuracy, winRate } from "@/features/progress/rules";
import { countryFlag, countryName } from "@/config/countries";
import { dayKey } from "@/lib/utils/dates";
import type { Achievement, GameRow } from "@/types/database";
import { cn, relativeDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { supabase, profile } = await requirePlayer();
  const [{ data: achData }, { data: earnedData }, { data: gameData }, { count: lessonTotal }] = await Promise.all([
    supabase.from("achievements").select("*").order("sort_order"),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", profile.id),
    supabase
      .from("games")
      .select("id, opponent_name, outcome, termination, result, created_at, rating_change, rated, accuracy, reviewed_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
  ]);
  const achievements = (achData ?? []) as Achievement[];
  const earned = new Map(((earnedData ?? []) as { achievement_id: string; earned_at: string }[]).map((e) => [e.achievement_id, e.earned_at]));
  const games = (gameData ?? []) as Pick<GameRow, "id" | "opponent_name" | "outcome" | "termination" | "result" | "created_at" | "rating_change" | "rated" | "accuracy" | "reviewed_at">[];
  const lv = levelForXp(profile.xp);
  const today = dayKey(new Date(), profile.timezone);
  const acc = puzzleAccuracy(profile.puzzle_first_attempts, profile.puzzle_first_correct);
  const wr = winRate(profile.games_played, profile.wins);

  const chess: [string | number, string][] = [
    [profile.rating, "Rating"],
    [profile.games_played, "Games"],
    [profile.wins, "Wins"],
    [profile.losses, "Losses"],
    [profile.draws, "Draws"],
    [wr == null ? "—" : `${wr}%`, "Win rate"],
  ];
  const learning: [string | number, string][] = [
    [`${profile.lessons_completed}/${lessonTotal ?? 0}`, "Lessons completed"],
    [acc == null ? "—" : `${acc}%`, "Puzzle accuracy"],
    [`${displayStreak(profile.last_active_date, today, profile.streak)} d`, "Current streak"],
    [profile.puzzles_solved, "Puzzles solved"],
    [`${profile.best_streak} d`, "Best streak"],
    [profile.xp, "Total XP"],
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brown font-display text-3xl text-ivory sm:size-20">
              {profile.display_name.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex flex-col">
              <span>{profile.display_name}</span>
              <span className="font-sans text-base font-medium text-muted-foreground">
                @{profile.username} · {countryFlag(profile.country)} {countryName(profile.country)}
              </span>
            </span>
          </span>
        }
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/app/settings">Edit profile</Link>
          </Button>
        }
      />

      <Card className="mb-5 flex flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-2xl font-semibold">
            Sankofa Level {lv.level} <span className="text-accent-foreground">· {lv.name}</span>
          </p>
          <span className="num text-sm text-muted-foreground">{profile.xp} XP</span>
        </div>
        <Progress value={lv.progress} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {lv.next ? `${lv.next.minXp - profile.xp} XP to ${lv.next.name}` : "You’ve reached the top Sankofa level."} Sankofa levels track your journey here; they
          aren’t official chess titles.
        </p>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {[
          ["Chess", chess],
          ["Learning", learning],
        ].map(([title, rows]) => (
          <Card key={title as string}>
            <CardHeader>
              <CardTitle>{title as string}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-x-3 gap-y-4">
                {(rows as [string | number, string][]).map(([v, l]) => (
                  <div key={l}>
                    <dd className="num font-display text-2xl font-semibold">{v}</dd>
                    <dt className="text-xs leading-tight text-muted-foreground">{l}</dt>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-10" aria-labelledby="ach-h">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="ach-h" className="text-xl font-semibold">
            Achievements
          </h2>
          <span className="num text-sm text-muted-foreground">
            {earned.size} of {achievements.length}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {achievements.map((a) => {
            const got = earned.has(a.id);
            return (
              <li
                key={a.id}
                className={cn(
                  "flex flex-col gap-2 rounded-[var(--radius-lg)] border p-4",
                  got ? "border-gold/50 bg-accent" : "border-dashed border-border text-muted-foreground",
                )}
              >
                <AchievementIcon name={a.icon} className={cn("size-6", got ? "text-accent-foreground" : "text-faint")} />
                <p className={cn("font-semibold", got && "text-foreground")}>{a.name}</p>
                <p className="text-xs">{got ? `Earned ${relativeDate(earned.get(a.id)!)}` : a.description}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="games" className="mt-10 scroll-mt-24" aria-labelledby="games-h">
        <h2 id="games-h" className="mb-3 text-xl font-semibold">
          Recent games
        </h2>
        {games.length === 0 ? (
          <EmptyState
            title="No games yet."
            body="Your games and their reviews will appear here."
            action={
              <Button asChild>
                <Link href="/app/play">Play a game</Link>
              </Button>
            }
          />
        ) : (
          <ul className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
            {games.map((g) => (
              <li key={g.id} className="border-b border-border last:border-0">
                <Link href={`/app/play/${g.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      g.outcome === "win" ? "bg-success" : g.outcome === "loss" ? "bg-destructive" : "bg-warm",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      <span className="capitalize">{g.outcome}</span> vs {g.opponent_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {g.result} by {g.termination} · {relativeDate(g.created_at)}
                      {g.accuracy != null ? ` · ${g.accuracy}% accuracy` : g.reviewed_at ? "" : " · not reviewed yet"}
                    </span>
                  </span>
                  {g.rated && g.rating_change != null && (
                    <span className="num text-sm font-semibold text-muted-foreground">{g.rating_change >= 0 ? `+${g.rating_change}` : g.rating_change}</span>
                  )}
                  <ChevronRight className="size-4 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

    </>
  );
}

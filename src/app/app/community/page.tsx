import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requirePlayer } from "@/features/auth/session";
import { countryFlag, countryName } from "@/config/countries";
import { levelForXp } from "@/features/progress/rules";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Community" };

type Row = Pick<Profile, "id" | "username" | "display_name" | "country" | "rating" | "xp" | "is_demo" | "games_played">;
const TABS = ["global", "country", "countries", "friends"] as const;
type CountryRow = { code: string; players: number; top: number; avg: number };

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: t } = await searchParams;
  const tab = TABS.includes(t as (typeof TABS)[number]) ? (t as (typeof TABS)[number]) : "global";
  const { supabase, profile } = await requirePlayer();

  let rows: Row[] = [];
  let countries: CountryRow[] = [];
  if (tab === "countries") {
    const { data } = await supabase.from("profiles").select("country, rating").gt("games_played", 0).limit(5000);
    const by = new Map<string, number[]>();
    for (const p of (data ?? []) as { country: string; rating: number }[]) by.set(p.country, [...(by.get(p.country) ?? []), p.rating]);
    countries = [...by.entries()]
      .map(([code, rs]) => {
        // Average of a country's best five: fair to small and large chess communities alike.
        const best = [...rs].sort((a, b) => b - a).slice(0, 5);
        return { code, players: rs.length, top: best[0], avg: Math.round(best.reduce((x, y) => x + y, 0) / best.length) };
      })
      .sort((a, b) => b.avg - a.avg);
  } else if (tab !== "friends") {
    let q = supabase
      .from("profiles")
      .select("id, username, display_name, country, rating, xp, is_demo, games_played")
      .or(`games_played.gt.0,id.eq.${profile.id}`)
      .order("rating", { ascending: false })
      .limit(50);
    if (tab === "country") q = q.eq("country", profile.country);
    const { data } = await q;
    rows = (data ?? []) as Row[];
  }
  const myIndex = rows.findIndex((r) => r.id === profile.id);

  const tabLabel = (k: (typeof TABS)[number]) =>
    k === "global" ? "Global" : k === "country" ? `${countryFlag(profile.country)} ${countryName(profile.country)}` : k === "countries" ? "Countries" : "Friends";

  return (
    <>
      <PageHeader title="Community" description="Where Africa’s thinkers stand: ratings from rated games against people and the Sankofa computer opponents." />
      <nav aria-label="Leaderboard" className="scrollbar-none mb-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-[var(--radius-md)] bg-surface-2 p-1">
        {TABS.map((k) => (
          <Link
            key={k}
            href={k === "global" ? "/app/community" : `/app/community?tab=${k}`}
            aria-current={tab === k ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-[calc(var(--radius-md)-4px)] px-3.5 py-2 text-sm font-semibold text-muted-foreground",
              tab === k && "bg-card text-foreground shadow-card",
            )}
          >
            {tabLabel(k)}
          </Link>
        ))}
      </nav>

      {tab === "friends" ? (
        <EmptyState
          title="Friend lists aren’t here yet."
          body="You can already play your friends: send a challenge link on WhatsApp and they join your game directly."
          action={
            <Button asChild>
              <Link href="/app/play?tab=people">Challenge a friend</Link>
            </Button>
          }
        />
      ) : tab === "countries" ? (
        countries.length === 0 ? (
          <EmptyState title="No countries on the board yet." body="Countries appear once their players finish a game." />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card" data-testid="countries-table">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="w-12 px-4 py-3 font-medium">#</th>
                  <th scope="col" className="px-2 py-3 font-medium">Country</th>
                  <th scope="col" className="px-2 py-3 text-right font-medium">Players</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Top-5 average</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c, i) => (
                  <tr key={c.code} className={cn("border-b border-border last:border-0", c.code === profile.country && "bg-accent")}>
                    <td className="num px-4 py-3 font-display text-base font-semibold text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-3">
                      <span aria-hidden>{countryFlag(c.code)}</span> <span className="font-semibold">{countryName(c.code)}</span>
                    </td>
                    <td className="num px-2 py-3 text-right text-muted-foreground">{c.players}</td>
                    <td className="num px-4 py-3 text-right font-semibold">{c.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : rows.length === 0 ? (
        <EmptyState title="No ranked players here yet." body="Play a rated game against the computer to appear on this board." />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="w-12 px-4 py-3 font-medium">
                  #
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Player
                </th>
                <th scope="col" className="hidden px-2 py-3 font-medium sm:table-cell">
                  Level
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const me = r.id === profile.id;
                const lv = levelForXp(r.xp);
                return (
                  <tr key={r.id} className={cn("border-b border-border last:border-0", me && "bg-accent")} aria-current={me ? "true" : undefined}>
                    <td className={cn("num px-4 py-3 font-display text-base font-semibold", i < 3 ? "text-accent-foreground" : "text-muted-foreground")}>{i + 1}</td>
                    <td className="px-2 py-3">
                      <span className="flex items-center gap-2">
                        <span aria-hidden>{countryFlag(r.country)}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {r.username}
                            {me && <span className="ml-1.5 text-xs font-medium text-accent-foreground">you</span>}
                            {r.is_demo && <span className="ml-1.5 text-xs font-medium text-faint">demo</span>}
                          </span>
                          <span className="text-xs text-muted-foreground sm:hidden">
                            Lv {lv.level} {lv.name}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="hidden px-2 py-3 text-muted-foreground sm:table-cell">
                      {lv.level} · {lv.name}
                    </td>
                    <td className="num px-4 py-3 text-right font-semibold">{r.rating}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {(tab === "global" || tab === "country") && myIndex < 0 && (
        <p className="mt-4 text-sm text-muted-foreground">You’ll appear here after your first rated game. Your rating: {profile.rating}.</p>
      )}
      <p className="mt-6 text-xs text-faint">Profiles marked “demo” are seeded examples, not real people. Countries are ranked by the average of their five best players.</p>
    </>
  );
}

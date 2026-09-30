import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { requirePlayer } from "@/features/auth/session";
import { countryFlag, countryName } from "@/config/countries";
import { levelForXp } from "@/features/progress/rules";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };

type Row = Pick<Profile, "id" | "username" | "display_name" | "country" | "rating" | "xp" | "is_demo" | "games_played">;
const TABS = ["global", "country", "friends"] as const;

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: t } = await searchParams;
  const tab = TABS.includes(t as (typeof TABS)[number]) ? (t as (typeof TABS)[number]) : "global";
  const { supabase, profile } = await requirePlayer();

  let rows: Row[] = [];
  if (tab !== "friends") {
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
    k === "global" ? "Global" : k === "country" ? `${countryFlag(profile.country)} ${countryName(profile.country)}` : "Friends";

  return (
    <>
      <PageHeader title="Leaderboard" description="Ratings from rated games against the Sankofa computer opponents." />
      <nav aria-label="Leaderboard" className="scrollbar-none mb-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-[var(--radius-md)] bg-surface-2 p-1">
        {TABS.map((k) => (
          <Link
            key={k}
            href={k === "global" ? "/app/leaderboard" : `/app/leaderboard?tab=${k}`}
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
        <EmptyState title="Friends arrive with online play." body="Soon you’ll be able to add friends, challenge them and compare progress here." />
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
      {tab !== "friends" && myIndex < 0 && (
        <p className="mt-4 text-sm text-muted-foreground">You’ll appear here after your first rated game. Your rating: {profile.rating}.</p>
      )}
      <p className="mt-6 text-xs text-faint">Other players shown during the preview are seeded demo profiles until live rated play launches.</p>
    </>
  );
}

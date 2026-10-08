import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { StoryArt } from "@/components/brand/story-art";
import { Badge } from "@/components/ui/badge";
import { requirePlayer } from "@/features/auth/session";
import { getToday } from "@/features/today/queries";
import { REGION_LABEL } from "@/features/today/plan";
import { contentLocale } from "@/lib/i18n";
import type { Story, StoryRegion } from "@/types/database";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Discover" };

type Row = Pick<Story, "id" | "slug" | "title" | "excerpt" | "category" | "symbol" | "read_minutes" | "region" | "place" | "era">;
const REGIONS = Object.keys(REGION_LABEL) as StoryRegion[];
const THEME_LABEL: Record<string, string> = {
  history: "History",
  strategy: "Strategy",
  thinkers: "Thinkers",
  innovation: "Innovation",
  culture: "Culture",
  chess: "Chess",
};

/** A library to explore at your own pace: curated, finite, and honest about what's read. Not a feed. */
export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ region?: string; theme?: string }> }) {
  const { region: r, theme: t } = await searchParams;
  const { supabase, profile } = await requirePlayer();
  const [today, { data }, { data: readData }] = await Promise.all([
    getToday(supabase, profile),
    supabase
      .from("stories")
      .select("id, slug, title, excerpt, category, symbol, read_minutes, region, place, era")
      .eq("locale", contentLocale(profile))
      .order("published_at", { ascending: false }),
    supabase.from("story_reads").select("story_id").eq("user_id", profile.id),
  ]);
  const all = (data ?? []) as Row[];
  const read = new Set(((readData ?? []) as { story_id: string }[]).map((x) => x.story_id));
  const region = REGIONS.includes(r as StoryRegion) ? (r as StoryRegion) : null;
  const theme = t && THEME_LABEL[t] ? t : null;
  const list = all.filter((s) => (!region || s.region === region) && (!theme || s.category === theme));
  const regionCount = (k: StoryRegion) => all.filter((s) => s.region === k).length;
  const themes = [...new Set(all.map((s) => s.category))].filter((c) => THEME_LABEL[c]);
  const href = (q: { region?: string | null; theme?: string | null }) => {
    const p = new URLSearchParams();
    if (q.region) p.set("region", q.region);
    if (q.theme) p.set("theme", q.theme);
    const s = p.toString();
    return s ? `/app/discover?${s}` : "/app/discover";
  };
  const featured = today.story;

  return (
    <>
      <PageHeader
        title="Discover"
        description={`Stories of African strategy, history and thought: what happened, the decision, and what it teaches. You’ve read ${read.size} of ${all.length}.`}
      />

      {featured && !region && !theme && (
        <Link
          href={`/app/discover/${featured.slug}`}
          className="mb-8 grid overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card transition-colors hover:border-gold/60 md:grid-cols-[1fr_1.4fr]"
          data-testid="discover-today"
        >
          <div className="grid aspect-[16/9] place-items-center bg-brown/60 p-8 text-gold md:aspect-auto">
            <StoryArt symbol={featured.symbol} className="h-auto w-1/3 max-w-36" />
          </div>
          <div className="flex flex-col justify-center gap-2.5 p-6 sm:p-8">
            <p className="text-sm font-semibold text-accent-foreground">Today’s story{today.storyReason ? ` · ${today.storyReason}` : ""}</p>
            <h2 className="text-3xl font-semibold">{featured.title}</h2>
            <p className="text-muted-foreground">{featured.excerpt}</p>
            <p className="text-sm text-muted-foreground">
              {featured.place} · {featured.read_minutes} min
            </p>
          </div>
        </Link>
      )}

      <section className="mb-6 flex flex-col gap-3" aria-label="Filter stories">
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <FilterChip href={href({ theme })} active={!region}>
            All of Africa
          </FilterChip>
          {REGIONS.filter((k) => regionCount(k) > 0).map((k) => (
            <FilterChip key={k} href={href({ region: k, theme })} active={region === k}>
              {REGION_LABEL[k].replace(/^the /, "The ")} <span className="num text-faint">{regionCount(k)}</span>
            </FilterChip>
          ))}
        </div>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <FilterChip href={href({ region })} active={!theme} subtle>
            Every theme
          </FilterChip>
          {themes.map((k) => (
            <FilterChip key={k} href={href({ region, theme: k })} active={theme === k} subtle>
              {THEME_LABEL[k]}
            </FilterChip>
          ))}
        </div>
      </section>

      {list.length === 0 ? (
        <EmptyState title="Nothing here yet." body="We add stories only once they’re researched and sourced. Try another region or theme." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <li key={s.id}>
              <Link
                href={`/app/discover/${s.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card transition-colors hover:border-border-strong"
              >
                <div className="relative grid aspect-[16/9] place-items-center bg-brown/40 p-6 text-gold">
                  <StoryArt symbol={s.symbol} className="h-auto max-h-full w-1/3 max-w-28" />
                  {read.has(s.id) && (
                    <Badge variant="success" className="absolute right-3 top-3">
                      <CheckCircle2 className="size-3.5" /> Read
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 p-5">
                  <p className="text-xs text-muted-foreground">
                    {s.place ?? THEME_LABEL[s.category]} · {s.read_minutes} min
                  </p>
                  <h3 className="text-xl font-semibold leading-snug">{s.title}</h3>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{s.excerpt}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-sm text-faint">
        Every story separates what is well established from tradition and debate, and lists its sources.
      </p>
    </>
  );
}

function FilterChip({ href, active, subtle, children }: { href: string; active: boolean; subtle?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
        active ? "border-gold bg-accent text-foreground" : "border-border text-muted-foreground hover:text-foreground",
        subtle && !active && "border-transparent",
      )}
    >
      {children}
    </Link>
  );
}

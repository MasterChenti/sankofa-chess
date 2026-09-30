import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { StoryArt } from "@/components/brand/story-art";
import { requirePlayer } from "@/features/auth/session";
import type { Story } from "@/types/database";

export const metadata: Metadata = { title: "Sankofa Stories" };

export default async function StoriesPage() {
  const { supabase } = await requirePlayer();
  const { data } = await supabase.from("stories").select("id, slug, title, excerpt, category, symbol, read_minutes").order("published_at", { ascending: false });
  const stories = (data ?? []) as Pick<Story, "id" | "slug" | "title" | "excerpt" | "category" | "symbol" | "read_minutes">[];
  const [lead, ...rest] = stories;

  return (
    <>
      <PageHeader title="Sankofa Stories" description="African philosophy, history and strategic traditions — and what they teach at the board." />
      {!lead ? (
        <EmptyState title="No stories yet." body="The first Sankofa Stories are being edited. Check back soon." />
      ) : (
        <>
          <Link
            href={`/app/stories/${lead.slug}`}
            className="mb-5 grid overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card transition-colors hover:border-border-strong md:grid-cols-[1fr_1.2fr]"
          >
            <div className="grid aspect-[4/3] place-items-center bg-brown/60 p-10 text-gold md:aspect-auto">
              <StoryArt symbol={lead.symbol} className="h-auto w-2/5 max-w-40" />
            </div>
            <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
              <p className="text-sm text-muted-foreground">
                {lead.category} · {lead.read_minutes} min read
              </p>
              <h2 className="text-3xl font-semibold">{lead.title}</h2>
              <p className="text-muted-foreground">{lead.excerpt}</p>
            </div>
          </Link>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/app/stories/${s.slug}`}
                  className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card transition-colors hover:border-border-strong"
                >
                  <div className="grid aspect-[16/9] place-items-center bg-brown/40 p-6 text-gold">
                    <StoryArt symbol={s.symbol} className="h-auto max-h-full w-1/3 max-w-28" />
                  </div>
                  <div className="flex flex-col gap-1.5 p-5">
                    <p className="text-xs text-muted-foreground">
                      {s.category} · {s.read_minutes} min read
                    </p>
                    <h3 className="text-xl font-semibold">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.excerpt}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

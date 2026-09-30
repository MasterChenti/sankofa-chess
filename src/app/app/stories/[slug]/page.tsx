import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StoryArt } from "@/components/brand/story-art";
import { Button } from "@/components/ui/button";
import { requirePlayer } from "@/features/auth/session";
import type { Story } from "@/types/database";

export const metadata: Metadata = { title: "Story" };

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await requirePlayer();
  const [{ data }, { data: others }] = await Promise.all([
    supabase.from("stories").select("*").eq("slug", slug).maybeSingle(),
    supabase.from("stories").select("slug, title").neq("slug", slug).order("published_at", { ascending: false }).limit(2),
  ]);
  const story = data as Story | null;
  if (!story) notFound();
  const paragraphs = story.content.split(/\n{2,}/);
  const more = (others ?? []) as { slug: string; title: string }[];

  return (
    <article className="mx-auto max-w-[680px]">
      <PageHeader back={{ href: "/app/stories", label: "Stories" }} className="mb-6" />
      <div className="mb-6 w-24 text-gold">
        <StoryArt symbol={story.symbol} className="h-auto w-full" />
      </div>
      <p className="text-sm text-muted-foreground">
        {story.category} · {story.read_minutes} min read
      </p>
      <h1 className="mt-2 text-[2.4rem] font-semibold leading-[1.05] sm:text-[3.2rem]">{story.title}</h1>
      <p className="mt-4 font-display text-xl text-muted-foreground">{story.excerpt}</p>
      <div className="mt-8 flex flex-col gap-5 font-display text-[1.15rem] leading-[1.75] text-foreground/90">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {story.source && (
        <p className="mt-10 border-t border-border pt-5 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Sources:</span> {story.source}
        </p>
      )}
      {more.length > 0 && (
        <div className="mt-10 flex flex-col gap-2">
          <p className="text-sm font-semibold">Keep reading</p>
          {more.map((m) => (
            <Link key={m.slug} href={`/app/stories/${m.slug}`} className="font-display text-xl text-accent-foreground hover:underline">
              {m.title}
            </Link>
          ))}
        </div>
      )}
      <div className="mt-10">
        <Button asChild variant="secondary">
          <Link href="/app/puzzles">Put it into practice</Link>
        </Button>
      </div>
    </article>
  );
}

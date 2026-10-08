import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { requirePlayer } from "@/features/auth/session";
import { StoryExperience } from "@/features/discover/components/story-experience";
import { REGION_LABEL } from "@/features/today/plan";
import { contentLocale } from "@/lib/i18n";
import type { Story } from "@/types/database";

export const metadata: Metadata = { title: "Story" };

export default async function DiscoverStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, profile } = await requirePlayer();
  const locale = contentLocale(profile);
  const { data } = await supabase.from("stories").select("*").eq("slug", slug).eq("locale", locale).maybeSingle();
  const story = data as Story | null;
  if (!story) notFound();

  const [{ data: readRow }, { data: others }, { data: reads }] = await Promise.all([
    supabase.from("story_reads").select("think_choice").eq("user_id", profile.id).eq("story_id", story.id).maybeSingle(),
    supabase.from("stories").select("id, slug, title, region, place").eq("locale", locale).neq("id", story.id),
    supabase.from("story_reads").select("story_id").eq("user_id", profile.id),
  ]);
  const readIds = new Set(((reads ?? []) as { story_id: string }[]).map((r) => r.story_id));
  // "Keep exploring": two unread stories, preferring a different region, so Africa is never one story.
  const more = ((others ?? []) as Pick<Story, "id" | "slug" | "title" | "region" | "place">[])
    .filter((o) => !readIds.has(o.id))
    .sort((a, b) => Number(a.region === story.region) - Number(b.region === story.region))
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-[680px]">
      <PageHeader back={{ href: "/app/discover", label: "Discover" }} className="mb-6" />
      <StoryExperience story={story} previousChoice={(readRow as { think_choice: string | null } | null)?.think_choice ?? null} />
      {more.length > 0 && (
        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6">
          <p className="text-sm font-semibold">Keep exploring</p>
          {more.map((m) => (
            <Link key={m.slug} href={`/app/discover/${m.slug}`} className="group">
              <span className="font-display text-xl text-accent-foreground group-hover:underline">{m.title}</span>
              <span className="block text-xs text-muted-foreground">{m.place ?? (m.region ? REGION_LABEL[m.region] : "")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

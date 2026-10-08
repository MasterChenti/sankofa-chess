import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { requirePlayer } from "@/features/auth/session";
import { ThoughtCard } from "@/features/think/components/thought-card";
import { contentLocale } from "@/lib/i18n";
import type { Thought } from "@/types/database";

export const metadata: Metadata = { title: "Strategic question" };

export default async function ThoughtPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, profile } = await requirePlayer();
  const { data } = await supabase.from("thoughts").select("*").eq("slug", slug).eq("locale", contentLocale(profile)).maybeSingle();
  const thought = data as Thought | null;
  if (!thought) notFound();
  const [{ data: ans }, { data: lesson }] = await Promise.all([
    supabase.from("thought_answers").select("choice").eq("user_id", profile.id).eq("thought_id", thought.id).maybeSingle(),
    thought.lesson_slug ? supabase.from("lessons").select("title").eq("slug", thought.lesson_slug).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return (
    <>
      <PageHeader back={{ href: "/app/think", label: "Think" }} className="mx-auto mb-6 max-w-[680px]" />
      <ThoughtCard
        thought={thought}
        previousChoice={(ans as { choice: string } | null)?.choice ?? null}
        lessonTitle={(lesson as { title: string } | null)?.title ?? null}
        continueHref="/app/think"
        continueLabel="More questions"
      />
    </>
  );
}

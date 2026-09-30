import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { LessonClient } from "@/features/learning/components/lesson-client";
import { requirePlayer } from "@/features/auth/session";
import type { Lesson } from "@/types/database";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()) };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, profile } = await requirePlayer();
  const { data } = await supabase.from("lessons").select("*").order("order_index");
  const lessons = (data ?? []) as Lesson[];
  const idx = lessons.findIndex((l) => l.slug === slug);
  if (idx < 0) notFound();
  const lesson = lessons[idx];
  const inCategory = lessons.filter((l) => l.category === lesson.category);
  const { data: prog } = await supabase
    .from("lesson_progress")
    .select("completed")
    .eq("user_id", profile.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();
  const next = lessons[idx + 1] ?? null;

  return (
    <>
      <PageHeader back={{ href: "/app/learn", label: "Learn" }} className="mb-3 sm:mb-5" />
      <LessonClient
        key={lesson.id}
        lesson={lesson}
        position={inCategory.findIndex((l) => l.id === lesson.id) + 1}
        total={inCategory.length}
        completed={Boolean((prog as { completed: boolean } | null)?.completed)}
        next={next ? { slug: next.slug, title: next.title } : null}
      />
    </>
  );
}

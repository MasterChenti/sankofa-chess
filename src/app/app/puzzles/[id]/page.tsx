import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PuzzleClient } from "@/features/puzzles/components/puzzle-client";
import { requirePlayer } from "@/features/auth/session";
import { dailyPuzzle, getPuzzleProgress, getPuzzles } from "@/features/puzzles/queries";

export const metadata: Metadata = { title: "Puzzle" };

export default async function PuzzlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const { supabase, profile } = await requirePlayer();
  const puzzles = await getPuzzles(supabase);
  if (!puzzles.length) notFound();

  if (id === "daily") {
    const d = dailyPuzzle(puzzles, profile);
    redirect(`/app/puzzles/${d!.slug}`);
  }
  if (id === "next") {
    const { solved } = await getPuzzleProgress(supabase, profile.id, profile.timezone);
    const start = Math.max(0, puzzles.findIndex((p) => p.slug === from) + 1);
    const ordered = [...puzzles.slice(start), ...puzzles.slice(0, start)];
    const next = ordered.find((p) => !solved.has(p.id) && p.slug !== from) ?? ordered.find((p) => p.slug !== from) ?? puzzles[0];
    redirect(`/app/puzzles/${next.slug}`);
  }

  const puzzle = puzzles.find((p) => p.slug === id);
  if (!puzzle) notFound();
  const { solved } = await getPuzzleProgress(supabase, profile.id, profile.timezone);

  return (
    <>
      <PageHeader back={{ href: "/app/puzzles", label: "All puzzles" }} className="mb-3 sm:mb-4" />
      <PuzzleClient key={puzzle.id} puzzle={puzzle} alreadySolved={solved.has(puzzle.id)} nextHref={`/app/puzzles/next?from=${puzzle.slug}`} />
    </>
  );
}

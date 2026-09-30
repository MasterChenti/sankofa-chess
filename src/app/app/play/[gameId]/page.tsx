import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { ReviewClient } from "@/features/chess/components/review-client";
import { requirePlayer } from "@/features/auth/session";
import { TERMINATION_LABEL, type Termination } from "@/lib/chess/rules";
import type { GameRow } from "@/types/database";

export const metadata: Metadata = { title: "Game review" };

export default async function GameReviewPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  if (!z.uuid().safeParse(gameId).success) notFound();
  const { supabase } = await requirePlayer();

  const [{ data: gameData }, { data: lessonData }] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
    supabase.from("lessons").select("slug, title"),
  ]);
  const game = gameData as GameRow | null;
  if (!game) notFound();

  const lessons = Object.fromEntries(((lessonData ?? []) as { slug: string; title: string }[]).map((l) => [l.slug, { title: l.title }]));
  const title = game.outcome === "win" ? "Won" : game.outcome === "loss" ? "Lost" : "Drew";
  const label = TERMINATION_LABEL[game.termination as Termination] ?? game.termination;

  return (
    <>
      <PageHeader
        back={{ href: "/app/profile#games", label: "Your games" }}
        title={`${title} vs ${game.opponent_name}`}
        description={
          <>
            {game.result} by {label}
            {game.rated && game.rating_change != null && (
              <>
                {" "}
                · rating <span className="num font-semibold">{game.rating_change >= 0 ? `+${game.rating_change}` : game.rating_change}</span>
              </>
            )}
          </>
        }
      />
      <ReviewClient game={game} lessons={lessons} />
    </>
  );
}

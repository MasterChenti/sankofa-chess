import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { LiveGameClient, type LivePlayer } from "@/features/online/components/live-game-client";
import { requirePlayer } from "@/features/auth/session";
import { siteOrigin } from "@/lib/site";
import type { LiveGame } from "@/types/database";

export const metadata: Metadata = { title: "Live game" };

export default async function LiveGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, profile } = await requirePlayer();

  // RLS: only the two players (or the inviter) can load this game.
  const { data } = await supabase.from("live_games").select("*").eq("id", id).maybeSingle();
  const game = data as LiveGame | null;
  if (!game) notFound();

  const ids = [game.white_id, game.black_id].filter((x): x is string => Boolean(x));
  const { data: ps } = ids.length
    ? await supabase.from("profiles").select("id, username, display_name, rating, country").in("id", ids)
    : { data: [] };
  const players = new Map(((ps ?? []) as NonNullable<LivePlayer>[]).map((p) => [p.id, p]));
  const { data: mine } = await supabase.from("games").select("id").eq("live_game_id", game.id).eq("user_id", profile.id).maybeSingle();
  const origin = await siteOrigin();

  return (
    <>
      <PageHeader back={{ href: "/app/play?tab=people", label: "Play" }} className="mb-3 sm:mb-4" />
      <LiveGameClient
        key={game.id}
        initial={game}
        meId={profile.id}
        white={game.white_id ? (players.get(game.white_id) ?? null) : null}
        black={game.black_id ? (players.get(game.black_id) ?? null) : null}
        inviteUrl={game.invite_code ? `${origin}/app/play/join/${game.invite_code}` : null}
        reviewGameId={(mine as { id: string } | null)?.id ?? null}
      />
    </>
  );
}

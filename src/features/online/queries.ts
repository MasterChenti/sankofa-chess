import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiveGame } from "@/types/database";
import type { MyLiveGame } from "@/features/online/components/online-panel";

/** Ongoing games (and open invites) for a player, with opponent names. */
export async function getMyLiveGames(supabase: SupabaseClient, userId: string): Promise<MyLiveGame[]> {
  const { data } = await supabase
    .from("live_games")
    .select("id, status, mode, moves, white_id, black_id, invite_code, created_by, updated_at")
    .in("status", ["waiting", "active"])
    .or(`white_id.eq.${userId},black_id.eq.${userId},created_by.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(12);
  const games = (data ?? []) as (Pick<LiveGame, "id" | "status" | "mode" | "moves" | "white_id" | "black_id" | "invite_code" | "created_by">)[];
  const oppIds = [...new Set(games.map((g) => (g.white_id === userId ? g.black_id : g.white_id)).filter((x): x is string => Boolean(x)))];
  const names = new Map<string, string>();
  if (oppIds.length) {
    const { data: ps } = await supabase.from("profiles").select("id, username").in("id", oppIds);
    for (const p of (ps ?? []) as { id: string; username: string }[]) names.set(p.id, p.username);
  }
  return games.map((g) => {
    const opp = g.white_id === userId ? g.black_id : g.white_id;
    return {
      id: g.id,
      status: g.status,
      mode: g.mode,
      moves: g.moves,
      white_id: g.white_id,
      black_id: g.black_id,
      invite_code: g.invite_code,
      opponent: opp ? (names.get(opp) ?? "Opponent") : null,
    };
  });
}

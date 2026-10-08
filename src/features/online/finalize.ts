import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Chess } from "chess.js";
import { revalidatePath } from "next/cache";
import { liveRatingChanges } from "@/lib/chess/live";
import { hasMatingMaterial, outcomeFor, uciToMove, type GameResult, type Termination } from "@/lib/chess/rules";
import { clampRating, gameXp } from "@/features/progress/rules";
import { applyProgress } from "@/features/progress/service";
import type { LiveGame, Profile } from "@/types/database";
import { track } from "@/lib/analytics";

/**
 * Ends a game between two people exactly once (guarded by status = 'active'),
 * records it in both players' histories, moves both ratings and awards progress.
 */
export async function finalizeLiveGame(
  admin: SupabaseClient,
  game: LiveGame,
  result: GameResult,
  termination: Termination,
  extra: Partial<Pick<LiveGame, "moves" | "fen" | "ply" | "white_ms" | "black_ms" | "turn_started_at">> = {},
): Promise<LiveGame | null> {
  const moves = extra.moves ?? game.moves;
  // FIDE rule: running out of time is a draw if the opponent cannot possibly checkmate.
  if (termination === "timeout" && result !== "1/2-1/2") {
    const board = new Chess();
    for (const m of moves) board.move(uciToMove(m));
    if (!hasMatingMaterial(board, result === "1-0" ? "w" : "b")) result = "1/2-1/2";
  }
  const { data: updated } = await admin
    .from("live_games")
    .update({
      ...extra,
      status: "finished",
      result,
      termination,
      draw_offer_by: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", game.id)
    .eq("status", "active")
    .eq("ply", game.ply)
    .select("*")
    .maybeSingle();
  if (!updated) return null; // someone else finished it first
  const final = updated as LiveGame;
  if (!final.white_id || !final.black_id) return final;

  const { data: players } = await admin
    .from("profiles")
    .select("id, username, rating, games_played")
    .in("id", [final.white_id, final.black_id]);
  const byId = new Map(((players ?? []) as Pick<Profile, "id" | "username" | "rating" | "games_played">[]).map((p) => [p.id, p]));
  const white = byId.get(final.white_id);
  const black = byId.get(final.black_id);
  if (!white || !black) return final;

  const rated = final.rated && moves.length >= 2;
  const changes = rated
    ? liveRatingChanges({ rating: white.rating, games: white.games_played }, { rating: black.rating, games: black.games_played }, result)
    : { white: 0, black: 0 };

  const replay = new Chess();
  for (const m of moves) replay.move(uciToMove(m));
  const pgn = replay.pgn();
  const fen = replay.fen();

  for (const [me, opp, color, change] of [
    [white, black, "w", changes.white],
    [black, white, "b", changes.black],
  ] as const) {
    const outcome = outcomeFor(result, color);
    const after = rated ? clampRating(me.rating + change) : null;
    await admin.from("games").insert({
      user_id: me.id,
      white_player_id: final.white_id,
      black_player_id: final.black_id,
      source: "online",
      opponent_id: opp.id,
      opponent_name: opp.username,
      opponent_rating: opp.rating,
      user_color: color,
      result,
      outcome,
      termination,
      fen,
      pgn,
      moves,
      time_control: final.mode,
      rated,
      rating_before: rated ? me.rating : null,
      rating_after: after,
      rating_change: rated ? after! - me.rating : null,
      live_game_id: final.id,
    });
    await applyProgress(admin, me.id, { kind: "game", outcome, rated, ratingAfter: after, xp: gameXp(outcome, rated), online: true });
  }
  track("game_completed", { online: true, termination });
  revalidatePath("/app", "layout");
  return final;
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyLiveMove, flagged, inviteCode, LIVE_MODES } from "@/lib/chess/live";
import { finalizeLiveGame } from "@/features/online/finalize";
import type { LiveGame } from "@/types/database";
import { track } from "@/lib/analytics";

const modeSchema = z.enum(["blitz", "rapid", "daily"]);
const idSchema = z.uuid();

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function loadGame(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { data } = await admin.from("live_games").select("*").eq("id", id).maybeSingle();
  return data as LiveGame | null;
}

function colorOf(game: LiveGame, userId: string): "w" | "b" | null {
  if (game.white_id === userId) return "w";
  if (game.black_id === userId) return "b";
  return null;
}

export type MatchResult = { status: "matched"; gameId: string } | { status: "searching" } | { status: "error"; message: string };

/** Join the matchmaking queue, or get paired immediately with the closest-rated player who is waiting. Poll to stay in the queue. */
export async function findMatch(mode: unknown): Promise<MatchResult> {
  const parsed = modeSchema.safeParse(mode);
  if (!parsed.success) return { status: "error", message: "Unknown time control." };
  const user = await me();
  if (!user) return { status: "error", message: "Please log in again." };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("rating").eq("id", user.id).single();
  const cfg = LIVE_MODES[parsed.data];
  const { data, error } = await admin.rpc("sankofa_find_match", {
    p_user: user.id,
    p_mode: parsed.data,
    p_rating: (profile as { rating: number } | null)?.rating ?? 1200,
    p_initial_ms: cfg.initialMs,
    p_increment_ms: cfg.incrementMs,
  });
  if (error) return { status: "error", message: "Matchmaking is unavailable right now. Try again in a moment." };
  if (data) {
    track("game_started", { online: true, mode: parsed.data });
    return { status: "matched", gameId: data as string };
  }
  return { status: "searching" };
}

export async function cancelMatch(): Promise<void> {
  const user = await me();
  if (!user) return;
  await createAdminClient().from("match_queue").delete().eq("user_id", user.id);
}

/** Create a game a friend can join through a link (perfect for WhatsApp). */
export async function createInvite(mode: unknown, color: unknown): Promise<{ ok: true; code: string; gameId: string } | { ok: false; message: string }> {
  const m = modeSchema.safeParse(mode);
  const c = z.enum(["w", "b", "random"]).safeParse(color);
  if (!m.success || !c.success) return { ok: false, message: "Choose a time control." };
  const user = await me();
  if (!user) return { ok: false, message: "Please log in again." };
  const admin = createAdminClient();

  // Keep it tidy: at most three open invites per player.
  const { count } = await admin.from("live_games").select("id", { count: "exact", head: true }).eq("created_by", user.id).eq("status", "waiting");
  if ((count ?? 0) >= 3) return { ok: false, message: "You already have three open invites. Share one of those first." };

  const cfg = LIVE_MODES[m.data];
  const myColor = c.data === "random" ? (Math.random() < 0.5 ? "w" : "b") : c.data;
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = inviteCode();
    const { data, error } = await admin
      .from("live_games")
      .insert({
        created_by: user.id,
        white_id: myColor === "w" ? user.id : null,
        black_id: myColor === "b" ? user.id : null,
        status: "waiting",
        mode: m.data,
        initial_ms: cfg.initialMs,
        increment_ms: cfg.incrementMs,
        white_ms: cfg.initialMs,
        black_ms: cfg.initialMs,
        invite_code: code,
      })
      .select("id")
      .single();
    if (!error && data) {
      revalidatePath("/app/play");
      return { ok: true, code, gameId: (data as { id: string }).id };
    }
  }
  return { ok: false, message: "We couldn’t create the invite. Please try again." };
}

export async function joinInvite(code: unknown): Promise<{ ok: true; gameId: string } | { ok: false; message: string }> {
  const parsed = z.string().regex(/^[a-z2-9]{8}$/).safeParse(code);
  if (!parsed.success) return { ok: false, message: "That invite link isn’t valid." };
  const user = await me();
  if (!user) return { ok: false, message: "Please log in again." };
  const admin = createAdminClient();
  const { data } = await admin.from("live_games").select("*").eq("invite_code", parsed.data).maybeSingle();
  const game = data as LiveGame | null;
  if (!game) return { ok: false, message: "That invite has expired." };
  if (colorOf(game, user.id)) return { ok: true, gameId: game.id };
  if (game.status !== "waiting") return { ok: false, message: "Someone already accepted this invite." };

  const patch = game.white_id ? { black_id: user.id } : { white_id: user.id };
  const { data: joined } = await admin
    .from("live_games")
    .update({ ...patch, status: "active" })
    .eq("id", game.id)
    .eq("status", "waiting")
    .select("id")
    .maybeSingle();
  if (!joined) return { ok: false, message: "Someone already accepted this invite." };
  track("game_started", { online: true, invite: true });
  return { ok: true, gameId: game.id };
}

export type MoveResult = { ok: true; game: LiveGame } | { ok: false; message: string; game: LiveGame | null };

export async function submitMove(gameId: unknown, uci: unknown, ply: unknown): Promise<MoveResult> {
  const id = idSchema.safeParse(gameId);
  const move = z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/).safeParse(uci);
  const at = z.number().int().min(0).safeParse(ply);
  if (!id.success || !move.success || !at.success) return { ok: false, message: "Invalid move.", game: null };
  const user = await me();
  if (!user) return { ok: false, message: "Please log in again.", game: null };
  const admin = createAdminClient();
  const game = await loadGame(admin, id.data);
  if (!game) return { ok: false, message: "Game not found.", game: null };
  const color = colorOf(game, user.id);
  if (!color) return { ok: false, message: "This isn’t your game.", game: null };
  if (game.status !== "active") return { ok: false, message: "This game is over.", game };
  if (game.ply !== at.data) return { ok: false, message: "The position changed. Updating…", game };

  const now = Date.now();
  const r = applyLiveMove(game, move.data, color, now);
  if (!r.ok) {
    if (r.reason === "flagged" && r.flagged) {
      const done = await finalizeLiveGame(admin, game, r.flagged.result, r.flagged.termination);
      return { ok: false, message: "Your time ran out.", game: done ?? (await loadGame(admin, game.id)) };
    }
    return { ok: false, message: r.reason === "not-your-turn" ? "It’s not your move." : "That move isn’t legal.", game };
  }

  const next = { moves: r.moves, fen: r.fen, ply: r.moves.length, white_ms: r.white_ms, black_ms: r.black_ms, turn_started_at: r.turn_started_at };
  if (r.end) {
    const done = await finalizeLiveGame(admin, game, r.end.result, r.end.termination, next);
    return done ? { ok: true, game: done } : { ok: false, message: "The position changed. Updating…", game: await loadGame(admin, game.id) };
  }
  const { data: updated } = await admin
    .from("live_games")
    .update({ ...next, draw_offer_by: null })
    .eq("id", game.id)
    .eq("ply", game.ply)
    .eq("status", "active")
    .select("*")
    .maybeSingle();
  if (!updated) return { ok: false, message: "The position changed. Updating…", game: await loadGame(admin, game.id) };
  return { ok: true, game: updated as LiveGame };
}

type Simple = { ok: boolean; message?: string; game?: LiveGame | null };

async function withMyGame(gameId: unknown, fn: (admin: ReturnType<typeof createAdminClient>, game: LiveGame, color: "w" | "b", userId: string) => Promise<Simple>): Promise<Simple> {
  const id = idSchema.safeParse(gameId);
  if (!id.success) return { ok: false, message: "Game not found." };
  const user = await me();
  if (!user) return { ok: false, message: "Please log in again." };
  const admin = createAdminClient();
  const game = await loadGame(admin, id.data);
  if (!game) return { ok: false, message: "Game not found." };
  const color = colorOf(game, user.id);
  if (!color && game.created_by !== user.id) return { ok: false, message: "This isn’t your game." };
  return fn(admin, game, color ?? "w", user.id);
}

export async function resignLive(gameId: unknown): Promise<Simple> {
  return withMyGame(gameId, async (admin, game, color) => {
    if (game.status !== "active") return { ok: false, message: "This game is over.", game };
    if (game.ply < 2) return abortInternal(admin, game);
    const done = await finalizeLiveGame(admin, game, color === "w" ? "0-1" : "1-0", "resignation");
    return { ok: Boolean(done), game: done ?? (await loadGame(admin, game.id)) };
  });
}

async function abortInternal(admin: ReturnType<typeof createAdminClient>, game: LiveGame): Promise<Simple> {
  const { data } = await admin
    .from("live_games")
    .update({ status: "aborted", termination: "aborted", finished_at: new Date().toISOString() })
    .eq("id", game.id)
    .in("status", ["waiting", "active"])
    .lt("ply", 2)
    .select("*")
    .maybeSingle();
  revalidatePath("/app/play");
  return { ok: Boolean(data), game: (data as LiveGame | null) ?? game };
}

/** Before both sides have moved, either player can call the game off without a result. */
export async function abortLive(gameId: unknown): Promise<Simple> {
  return withMyGame(gameId, async (admin, game) => {
    if (game.ply >= 2) return { ok: false, message: "Too late to abort: resign or offer a draw instead.", game };
    return abortInternal(admin, game);
  });
}

export async function offerDrawLive(gameId: unknown): Promise<Simple> {
  return withMyGame(gameId, async (admin, game, _c, userId) => {
    if (game.status !== "active" || game.ply < 2) return { ok: false, message: "You can offer a draw once both sides have moved.", game };
    const { data } = await admin.from("live_games").update({ draw_offer_by: userId }).eq("id", game.id).eq("status", "active").select("*").maybeSingle();
    return { ok: true, game: data as LiveGame };
  });
}

export async function respondDrawLive(gameId: unknown, accept: unknown): Promise<Simple> {
  const yes = z.boolean().safeParse(accept);
  return withMyGame(gameId, async (admin, game, _c, userId) => {
    if (game.status !== "active" || !game.draw_offer_by || game.draw_offer_by === userId) return { ok: false, game };
    if (yes.success && yes.data) {
      const done = await finalizeLiveGame(admin, game, "1/2-1/2", "agreement");
      return { ok: Boolean(done), game: done ?? (await loadGame(admin, game.id)) };
    }
    const { data } = await admin.from("live_games").update({ draw_offer_by: null }).eq("id", game.id).select("*").maybeSingle();
    return { ok: true, game: data as LiveGame };
  });
}

/** Ask the server to check the clock. Only the server's time decides a flag fall. */
export async function claimTimeoutLive(gameId: unknown): Promise<Simple> {
  return withMyGame(gameId, async (admin, game) => {
    if (game.status !== "active") return { ok: false, game };
    const f = flagged(game, Date.now());
    if (!f) return { ok: false, game };
    const done = await finalizeLiveGame(admin, game, f.result, f.termination);
    return { ok: Boolean(done), game: done ?? (await loadGame(admin, game.id)) };
  });
}

export async function cancelInvite(gameId: unknown): Promise<Simple> {
  return withMyGame(gameId, async (admin, game, _c, userId) => {
    if (game.status !== "waiting" || game.created_by !== userId) return { ok: false, game };
    return abortInternal(admin, game);
  });
}


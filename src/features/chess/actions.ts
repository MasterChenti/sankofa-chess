"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { outcomeFor, verifyFinishedGame } from "@/lib/chess/rules";
import { PERSONAS, TIME_CONTROLS } from "@/lib/chess/personas";
import { clampRating, eloChange, gameXp } from "@/features/progress/rules";
import { applyProgress, type ProgressResult } from "@/features/progress/service";
import type { GameRow } from "@/types/database";
import { track } from "@/lib/analytics";

const uci = z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/);

const finishSchema = z.object({
  moves: z.array(uci).max(800),
  termination: z.enum(["checkmate", "stalemate", "insufficient", "threefold", "fifty-move", "resignation", "timeout", "agreement"]),
  loser: z.enum(["w", "b"]).optional(),
  source: z.enum(["vs_computer", "pass_and_play"]),
  personaId: z.enum(["abena", "kwaku", "nana"]).optional(),
  userColor: z.enum(["w", "b"]),
  timeControl: z.enum(Object.keys(TIME_CONTROLS) as [keyof typeof TIME_CONTROLS, ...(keyof typeof TIME_CONTROLS)[]]),
});

export type FinishGameResult =
  | {
      ok: true;
      gameId: string;
      outcome: "win" | "loss" | "draw";
      result: string;
      termination: string;
      rated: boolean;
      ratingBefore: number | null;
      ratingAfter: number | null;
      ratingChange: number | null;
      progress: ProgressResult;
    }
  | { ok: false; error: string };

export async function finishGame(input: unknown): Promise<FinishGameResult> {
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That game couldn’t be saved." };
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again to save this game." };

  const verified = verifyFinishedGame({ moves: data.moves, termination: data.termination, loser: data.loser });
  if (!verified.ok) return { ok: false, error: "That game couldn’t be verified, so it wasn’t saved." };

  const admin = createAdminClient();

  // Throttle: one saved game every few seconds is plenty for a human.
  const { data: last } = await admin
    .from("games")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date((last as { created_at: string }).created_at).getTime() < 4000) {
    return { ok: false, error: "Please wait a moment before saving another game." };
  }

  const { data: profile } = await admin.from("profiles").select("rating, games_played").eq("id", user.id).single();
  if (!profile) return { ok: false, error: "Profile not found." };

  const persona = data.source === "vs_computer" && data.personaId ? PERSONAS[data.personaId] : null;
  const outcome = outcomeFor(verified.result, data.userColor);
  // Games need at least one move from each side to count for rating.
  const rated = Boolean(persona) && data.moves.length >= 2;
  const score = outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
  const ratingBefore = rated ? (profile as { rating: number }).rating : null;
  const change = rated && persona ? eloChange(ratingBefore!, persona.rating, score, (profile as { games_played: number }).games_played) : null;
  const ratingAfter = rated && change != null ? clampRating(ratingBefore! + change) : null;

  const { data: inserted, error } = await admin
    .from("games")
    .insert({
      user_id: user.id,
      white_player_id: data.userColor === "w" ? user.id : null,
      black_player_id: data.userColor === "b" ? user.id : null,
      source: data.source,
      opponent_name: persona ? persona.name : "Pass & play",
      opponent_rating: persona?.rating ?? null,
      user_color: data.userColor,
      result: verified.result,
      outcome,
      termination: verified.termination,
      fen: verified.fen,
      pgn: verified.pgn,
      moves: data.moves,
      time_control: data.timeControl,
      rated,
      rating_before: ratingBefore,
      rating_after: ratingAfter,
      rating_change: change,
    })
    .select("id")
    .single();
  if (error || !inserted) return { ok: false, error: "We couldn’t save this game. Please try again." };

  const progress = await applyProgress(admin, user.id, {
    kind: "game",
    outcome,
    rated,
    ratingAfter,
    xp: gameXp(outcome, rated),
  });

  track("game_completed", { outcome, rated });
  revalidatePath("/app", "layout");
  return {
    ok: true,
    gameId: (inserted as { id: string }).id,
    outcome,
    result: verified.result,
    termination: verified.termination,
    rated,
    ratingBefore,
    ratingAfter,
    ratingChange: change,
    progress,
  };
}

const plySchema = z.object({
  san: z.string().max(12),
  uci,
  color: z.enum(["w", "b"]),
  fenBefore: z.string().max(100),
  evalWhite: z.number().finite(),
  loss: z.number().finite().min(0),
  cls: z.enum(["best", "good", "inaccuracy", "mistake", "blunder"]),
  bestUci: uci.nullable(),
  bestSan: z.string().max(12).nullable(),
});

const analysisSchema = z.object({
  version: z.literal(1),
  engine: z.string().max(60),
  depth: z.number().int().min(0).max(60),
  accuracy: z.number().int().min(0).max(100),
  opponentAccuracy: z.number().int().min(0).max(100),
  counts: z.object({
    best: z.number().int().min(0),
    good: z.number().int().min(0),
    inaccuracy: z.number().int().min(0),
    mistake: z.number().int().min(0),
    blunder: z.number().int().min(0),
  }),
  plies: z.array(plySchema).max(800),
  coaching: z.object({
    cause: z.enum(["clean", "early-resign", "development", "king-safety", "early-queen", "hanging-piece", "initiative"]).optional(),
    headline: z.string().max(300),
    what: z.string().max(600),
    why: z.string().max(600),
    next: z.string().max(600),
    lessonSlug: z.string().max(80).nullable(),
    keyPly: z.number().int().nullable(),
    keyMoveLabel: z.string().max(10).nullable(),
    keyMoveSan: z.string().max(12).nullable(),
    keyBestSan: z.string().max(12).nullable(),
    keyBestUci: uci.nullable(),
    keyFen: z.string().max(100).nullable(),
  }),
});

/** Stores the engine review of a game (and rewards the first review). */
export async function saveAnalysis(gameId: string, analysis: unknown): Promise<{ ok: boolean; progress?: ProgressResult }> {
  if (!z.uuid().safeParse(gameId).success) return { ok: false };
  const parsed = analysisSchema.safeParse(analysis);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // RLS: only the owner can read the game.
  const { data } = await supabase.from("games").select("id, moves, reviewed_at").eq("id", gameId).maybeSingle();
  const game = data as Pick<GameRow, "id" | "moves" | "reviewed_at"> | null;
  if (!game) return { ok: false };
  const a = parsed.data;
  if (a.plies.length !== game.moves.length || a.plies.some((p, i) => p.uci !== game.moves[i])) return { ok: false };

  const admin = createAdminClient();
  const firstReview = !game.reviewed_at;
  await admin
    .from("games")
    .update({ analysis: a, accuracy: a.accuracy, reviewed_at: game.reviewed_at ?? new Date().toISOString() })
    .eq("id", gameId)
    .eq("user_id", user.id);
  if (!firstReview) return { ok: true };
  const progress = await applyProgress(admin, user.id, { kind: "review" });
  revalidatePath("/app", "layout");
  return { ok: true, progress };
}

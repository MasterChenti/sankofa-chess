"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPuzzleLine } from "@/features/puzzles/logic";
import { applyProgress, type ProgressResult } from "@/features/progress/service";
import { dayKey } from "@/lib/utils/dates";
import type { Puzzle } from "@/types/database";
import { track } from "@/lib/analytics";

const schema = z.object({
  puzzleId: z.uuid(),
  moves: z.array(z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/)).max(40),
  outcome: z.enum(["solved", "failed", "revealed"]),
});

export type PuzzleAttemptResult = { ok: true; correct: boolean; progress: ProgressResult } | { ok: false; error: string };

export async function recordPuzzleAttempt(input: unknown): Promise<PuzzleAttemptResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid attempt." };
  const { puzzleId, moves, outcome } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };

  const { data: pz } = await supabase.from("puzzles").select("id, fen, solution, is_mate").eq("id", puzzleId).maybeSingle();
  if (!pz) return { ok: false, error: "Puzzle not found." };

  // Never trust the client's claim: a "solved" attempt must actually solve the puzzle.
  const correct = outcome === "solved" && checkPuzzleLine(pz as Pick<Puzzle, "fen" | "solution" | "is_mate">, moves) === "solved";
  if (outcome === "solved" && !correct) return { ok: false, error: "That line doesn’t solve the puzzle." };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("timezone").eq("id", user.id).single();
  const today = dayKey(new Date(), (profile as { timezone: string } | null)?.timezone ?? "UTC");

  const { data: prior } = await admin.from("puzzle_attempts").select("correct, day_key").eq("user_id", user.id).eq("puzzle_id", puzzleId);
  const attempts = (prior ?? []) as { correct: boolean; day_key: string }[];
  const firstAttempt = attempts.length === 0;
  const firstSolveEver = correct && !attempts.some((a) => a.correct);
  const firstSolveToday = correct && !attempts.some((a) => a.correct && a.day_key === today);

  const { error } = await admin.from("puzzle_attempts").insert({ user_id: user.id, puzzle_id: puzzleId, correct, moves, day_key: today });
  if (error) return { ok: false, error: "We couldn’t save that attempt." };

  const progress = await applyProgress(admin, user.id, { kind: "puzzle", correct, firstAttempt, firstSolveEver, firstSolveToday });
  if (correct) track("puzzle_completed", { firstAttempt });
  revalidatePath("/app", "layout");
  return { ok: true, correct, progress };
}

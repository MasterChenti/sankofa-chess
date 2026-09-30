import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Puzzle } from "@/types/database";
import { dayIndex, dayKey } from "@/lib/utils/dates";

export async function getPuzzles(supabase: SupabaseClient) {
  const { data } = await supabase.from("puzzles").select("*").order("sort_order");
  return (data ?? []) as Puzzle[];
}

export async function getPuzzleProgress(supabase: SupabaseClient, userId: string, timezone: string) {
  const { data } = await supabase.from("puzzle_attempts").select("puzzle_id, correct, day_key").eq("user_id", userId);
  const rows = (data ?? []) as { puzzle_id: string; correct: boolean; day_key: string }[];
  const today = dayKey(new Date(), timezone);
  const solved = new Set(rows.filter((r) => r.correct).map((r) => r.puzzle_id));
  const solvedToday = new Set(rows.filter((r) => r.correct && r.day_key === today).map((r) => r.puzzle_id));
  return { solved, solvedToday: solvedToday.size, today };
}

export function dailyPuzzle(puzzles: Puzzle[], profile: Pick<Profile, "timezone">) {
  if (!puzzles.length) return null;
  const today = dayKey(new Date(), profile.timezone);
  return puzzles[dayIndex(today) % puzzles.length];
}

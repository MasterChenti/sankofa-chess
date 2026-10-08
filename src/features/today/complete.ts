import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyProgress, type ProgressResult } from "@/features/progress/service";
import { getStepStatus } from "@/features/today/queries";
import { isDayComplete } from "@/features/today/plan";
import { dayKey } from "@/lib/utils/dates";
import type { DailySession } from "@/types/database";

/**
 * After any step, check whether today's ritual is now complete and, exactly once per day,
 * award "Mind sharpened today". Uses the service client after the caller has authenticated.
 */
export async function maybeCompleteDay(admin: SupabaseClient, userId: string): Promise<ProgressResult | null> {
  const { data: profile } = await admin.from("profiles").select("id, timezone").eq("id", userId).single();
  if (!profile) return null;
  const p = profile as { id: string; timezone: string };
  const day = dayKey(new Date(), p.timezone);
  const { data: s } = await admin.from("daily_sessions").select("id, reflected_at, completed_at").eq("user_id", userId).eq("day_key", day).maybeSingle();
  const session = s as Pick<DailySession, "id" | "reflected_at" | "completed_at"> | null;
  if (!session || session.completed_at) return null;
  const status = await getStepStatus(admin, p, day, session);
  if (!isDayComplete(status)) return null;
  const { data: claimed } = await admin
    .from("daily_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", session.id)
    .is("completed_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return null;
  return applyProgress(admin, userId, { kind: "day" });
}

/** Merge two progress results so the UI can celebrate once. */
export function mergeProgress(a: ProgressResult, b: ProgressResult | null): ProgressResult {
  if (!b) return a;
  return {
    ...b,
    xpGained: a.xpGained + b.xpGained,
    leveledUp: a.leveledUp || b.leveledUp,
    completedChallenges: [...a.completedChallenges, ...b.completedChallenges],
    newAchievements: [...a.newAchievements, ...b.newAchievements],
  };
}

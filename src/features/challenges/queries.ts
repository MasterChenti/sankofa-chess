import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Challenge, Profile, UserChallenge } from "@/types/database";
import { dayKey, periodKey } from "@/lib/utils/dates";

export type ChallengeStatus = Challenge & { progress: number; completed: boolean; periodKey: string };

/** Current-period status for every active challenge. */
export async function getChallengeStatus(supabase: SupabaseClient, profile: Pick<Profile, "id" | "timezone">): Promise<ChallengeStatus[]> {
  const today = dayKey(new Date(), profile.timezone);
  const [{ data: chData }, { data: ucData }] = await Promise.all([
    supabase.from("challenges").select("*").eq("active", true).order("sort_order"),
    supabase.from("user_challenges").select("*").eq("user_id", profile.id),
  ]);
  const rows = (ucData ?? []) as UserChallenge[];
  return ((chData ?? []) as Challenge[]).map((ch) => {
    const pk = periodKey(ch.period, today);
    const row = rows.find((r) => r.challenge_id === ch.id && r.period_key === pk);
    return { ...ch, periodKey: pk, progress: row?.progress ?? 0, completed: row?.completed ?? false };
  });
}

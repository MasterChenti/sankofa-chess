import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** "/d/abcd2345" → "abcd2345" (a shared daily card) */
export function cardCodeFromPath(path: string | undefined | null): string | null {
  const m = path?.match(/^\/d\/([a-z2-9]{8})(?:[/?#].*)?$/);
  return m ? m[1] : null;
}

/** "/join/abcd2345" → "abcd2345" (a game invite) */
export function inviteCodeOf(path: string | undefined | null): string | null {
  const m = path?.match(/^\/join\/([a-z2-9]{8})(?:[/?#].*)?$/);
  return m ? m[1] : null;
}

/**
 * Where a new player came from, based on the page they were heading to when they signed up.
 * Used once, when onboarding completes.
 */
export async function attributionFor(admin: SupabaseClient, next: string | undefined | null): Promise<{ ref: "invite" | "card" | "direct"; inviterId: string | null }> {
  const invite = inviteCodeOf(next);
  if (invite) {
    const { data } = await admin.from("live_games").select("created_by").eq("invite_code", invite).maybeSingle();
    return { ref: "invite", inviterId: (data as { created_by: string | null } | null)?.created_by ?? null };
  }
  const card = cardCodeFromPath(next);
  if (card) {
    const { data } = await admin.from("daily_sessions").select("user_id").eq("share_code", card).maybeSingle();
    return { ref: "card", inviterId: (data as { user_id: string } | null)?.user_id ?? null };
  }
  return { ref: "direct", inviterId: null };
}

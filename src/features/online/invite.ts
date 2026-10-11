import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LiveGame } from "@/types/database";

export type InviteInfo = {
  game: Pick<LiveGame, "id" | "status" | "mode" | "created_by">;
  host: { username: string; display_name: string; rating: number; country: string } | null;
} | null;

export const INVITE_CODE = /^[a-z2-9]{8}$/;

/**
 * Looks up an invite by its unguessable code. The invitee may not be signed in yet
 * (or can't read the game through RLS), so this runs on the server with the service role
 * and returns only what the invite page shows.
 */
export async function getInvite(code: string): Promise<InviteInfo> {
  if (!INVITE_CODE.test(code)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("live_games").select("id, status, mode, created_by").eq("invite_code", code).maybeSingle();
  const game = data as Pick<LiveGame, "id" | "status" | "mode" | "created_by"> | null;
  if (!game) return null;
  const { data: host } = game.created_by
    ? await admin.from("profiles").select("username, display_name, rating, country").eq("id", game.created_by).maybeSingle()
    : { data: null };
  return { game, host: host as NonNullable<InviteInfo>["host"] };
}

/** "/join/abcd2345" → "abcd2345" */
export function inviteCodeFromPath(path: string | undefined | null): string | null {
  const m = path?.match(/^\/join\/([a-z2-9]{8})$/);
  return m ? m[1] : null;
}

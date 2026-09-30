import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

/**
 * Service-role client. Bypasses RLS — use ONLY in server actions/route handlers,
 * AFTER the caller has been authenticated with getUser() and the input validated.
 * The key is read from a non-public env var and never reaches the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createSupabaseClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

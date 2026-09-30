"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/config/env";

/** Browser client (anon key + user session). RLS applies to every query. */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}

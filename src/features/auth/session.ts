import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/** Current user + profile for server components. Cached per request. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null } as const;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, profile: (data as Profile | null) ?? null } as const;
});

/** For app pages: requires a signed-in, onboarded player. */
export async function requirePlayer() {
  const s = await getSession();
  if (!s.user) redirect("/login");
  if (!s.profile) redirect("/onboarding");
  if (!s.profile.onboarded_at) redirect("/onboarding");
  return { supabase: s.supabase, user: s.user, profile: s.profile };
}

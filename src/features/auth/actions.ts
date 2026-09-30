"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/config/env";
import { loginSchema, onboardingSchema, profileSchema, safeNext, signupSchema } from "@/features/auth/schemas";
import { STARTING_RATING } from "@/features/progress/rules";
import { safeTimeZone } from "@/lib/utils/dates";
import { track } from "@/lib/analytics";

export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  checkEmail?: boolean;
};

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

async function siteOrigin() {
  if (env.siteUrl) return env.siteUrl.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Friendly wording for Supabase Auth errors — never show raw backend messages. */
function authMessage(code: string | undefined, fallback: string) {
  switch (code) {
    case "invalid_credentials":
      return "That email and password don’t match an account.";
    case "email_not_confirmed":
      return "Please confirm your email first — check your inbox for the link.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Log in instead.";
    case "weak_password":
      return "Choose a stronger password.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a minute and try again.";
    default:
      return fallback;
  }
}

export async function signUp(input: unknown): Promise<ActionState> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const data = parsed.data;

  const admin = createAdminClient();
  const { data: taken } = await admin.from("profiles").select("id").ilike("username", data.username).maybeSingle();
  if (taken) return { fieldErrors: { username: "That username is taken." } };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data: result, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
      data: {
        username: data.username,
        display_name: data.displayName,
        country: data.country,
        chess_level: data.chessLevel,
      },
    },
  });
  if (error) return { message: authMessage(error.code, "We couldn’t create your account. Please try again.") };

  // Supabase returns a user with no identities when the email is already registered.
  if (result.user && result.user.identities && result.user.identities.length === 0) {
    return { message: "An account with this email already exists. Log in instead." };
  }

  track("signup_completed", { level: data.chessLevel });
  if (!result.session) return { ok: true, checkEmail: true };
  redirect("/onboarding");
}

export async function logIn(input: unknown, next?: string): Promise<ActionState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: authMessage(error.code, "We couldn’t log you in. Please try again.") };
  redirect(safeNext(next));
}

export async function signInWithGoogle(next?: string) {
  if (!env.googleAuthEnabled) return { message: "Google sign-in isn’t enabled yet." } satisfies ActionState;
  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}` },
  });
  if (error || !data.url) return { message: "Google sign-in is unavailable right now." } satisfies ActionState;
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function completeOnboarding(input: unknown): Promise<ActionState> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("games_played, onboarded_at").eq("id", user.id).single();
  const patch: Record<string, unknown> = {
    chess_level: parsed.data.chessLevel,
    goal: parsed.data.goal,
    timezone: safeTimeZone(parsed.data.timezone),
    onboarded_at: new Date().toISOString(),
  };
  // Starting rating follows the chosen level until the first rated game.
  if (profile && profile.games_played === 0) {
    patch.rating = STARTING_RATING[parsed.data.chessLevel];
    patch.peak_rating = STARTING_RATING[parsed.data.chessLevel];
  }
  const { error } = await admin.from("profiles").update(patch).eq("id", user.id);
  if (error) return { message: "We couldn’t save your choices. Please try again." };
  track("onboarding_completed", { goal: parsed.data.goal });
  redirect("/app/home");
}

export async function updateProfile(input: unknown): Promise<ActionState> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", parsed.data.username)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) return { fieldErrors: { username: "That username is taken." } };

  // Runs as the user: RLS + column grants allow only these fields on their own row.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      username: parsed.data.username,
      country: parsed.data.country,
      chess_level: parsed.data.chessLevel,
    })
    .eq("id", user.id);
  if (error) return { message: "We couldn’t save your profile. Please try again." };
  return { ok: true, message: "Profile saved." };
}

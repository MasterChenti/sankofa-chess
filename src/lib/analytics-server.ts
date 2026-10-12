import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Link-preview crawlers (WhatsApp, Telegram, Facebook…) fetch shared pages too; they are not people. */
const BOT_UA = /bot|crawler|spider|preview|whatsapp|facebookexternalhit|telegram|slack|discord|twitter|linkedin|embedly|vercel|headless/i;

export function isBot(userAgent: string | null | undefined) {
  return !userAgent || BOT_UA.test(userAgent);
}

export type GrowthEvent =
  | "share_clicked"
  | "card_opened"
  | "card_answered"
  | "invite_opened"
  | "signup_attributed";

/**
 * First-party growth events, stored in our own database (no third-party tracker).
 * Never put personal data in `props`: codes and choices only. Never throws.
 */
export async function logEvent(name: GrowthEvent, opts: { userId?: string | null; props?: Record<string, string | number | boolean> } = {}) {
  try {
    await createAdminClient().from("events").insert({ name, user_id: opts.userId ?? null, props: opts.props ?? {} });
  } catch {
    /* analytics must never break the product */
  }
}

/** For page views: skips link-preview bots so a WhatsApp preview isn't counted as an open. */
export async function logPageEvent(name: GrowthEvent, opts: { userId?: string | null; props?: Record<string, string | number | boolean> } = {}) {
  const ua = (await headers()).get("user-agent");
  if (isBot(ua)) return;
  await logEvent(name, opts);
}

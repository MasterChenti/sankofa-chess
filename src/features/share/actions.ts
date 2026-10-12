"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteOrigin } from "@/lib/site";
import { inviteCode } from "@/lib/chess/live";
import { dayKey } from "@/lib/utils/dates";
import { logEvent } from "@/lib/analytics-server";
import { CARD_CODE, dilemmaSplit, getShareCard } from "@/features/share/queries";

export type ShareCardResult = { ok: true; code: string; url: string; imageUrl: string; text: string } | { ok: false; message: string };

/** Gives today's session a public share code (once) and returns what the share sheet needs. */
export async function createShareCard(): Promise<ShareCardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please log in again." };
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("timezone").eq("id", user.id).single();
  const day = dayKey(new Date(), (prof as { timezone: string } | null)?.timezone ?? "UTC");
  const { data: s } = await admin.from("daily_sessions").select("id, share_code, plan").eq("user_id", user.id).eq("day_key", day).maybeSingle();
  const session = s as { id: string; share_code: string | null; plan: { storyId: string | null } } | null;
  if (!session?.plan?.storyId) return { ok: false, message: "Open Today first." };

  let code = session.share_code;
  for (let attempt = 0; !code && attempt < 3; attempt++) {
    const candidate = inviteCode();
    const { data: saved } = await admin
      .from("daily_sessions")
      .update({ share_code: candidate })
      .eq("id", session.id)
      .is("share_code", null)
      .select("share_code")
      .maybeSingle();
    code = (saved as { share_code: string } | null)?.share_code ?? null;
    if (!code) {
      // Someone (another tab) set it first, or the code collided: read back and retry.
      const { data: again } = await admin.from("daily_sessions").select("share_code").eq("id", session.id).single();
      code = (again as { share_code: string | null } | null)?.share_code ?? null;
    }
  }
  if (!code) return { ok: false, message: "Couldn’t create your card. Try again." };

  const card = await getShareCard(code);
  await logEvent("share_clicked", { userId: user.id });
  const origin = await siteOrigin();
  const url = `${origin}/d/${code}`;
  const question = card ? `${card.story.title}: ${card.story.question}` : "Today’s dilemma on Sankofa Chess.";
  return {
    ok: true,
    code,
    url,
    imageUrl: `${origin}/d/${code}/status`,
    text: `${question} I’ve made my choice. What would you do? ♟️ ${url}`,
  };
}

export type VoteResult =
  | { ok: true; ownerName: string; ownerChoice: string | null; total: number; percent: Record<string, number>; storySlug: string }
  | { ok: false; message: string };

/** Someone who opened a card answers the dilemma (no account needed), then sees the split. */
export async function voteDilemma(code: unknown, choice: unknown): Promise<VoteResult> {
  const c = z.string().regex(CARD_CODE).safeParse(code);
  const k = z.string().min(1).max(4).safeParse(choice);
  if (!c.success || !k.success) return { ok: false, message: "That card isn’t valid." };
  const card = await getShareCard(c.data);
  if (!card) return { ok: false, message: "This card has expired." };
  if (!card.story.options.some((o) => o.key === k.data)) return { ok: false, message: "Pick one of the options." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id !== card.owner.id) {
    await createAdminClient().from("dilemma_votes").insert({ story_id: card.story.id, choice: k.data, share_code: card.code, user_id: user?.id ?? null });
    await logEvent("card_answered", { userId: user?.id ?? null, props: { same: k.data === card.ownerChoice } });
  }
  const split = await dilemmaSplit(card.story.id);
  const percent: Record<string, number> = {};
  for (const o of card.story.options) percent[o.key] = split.total ? Math.round((100 * (split.byKey[o.key] ?? 0)) / split.total) : 0;
  return { ok: true, ownerName: card.owner.firstName, ownerChoice: card.ownerChoice, total: split.total, percent, storySlug: card.story.slug };
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyProgress, type ProgressResult } from "@/features/progress/service";
import { maybeCompleteDay, mergeProgress } from "@/features/today/complete";
import { dayKey } from "@/lib/utils/dates";
import type { StoryStructure, Thought } from "@/types/database";
import { track } from "@/lib/analytics";

type Result = { ok: true; progress: ProgressResult | null; dayComplete: boolean } | { ok: false; error: string };

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function today(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin.from("profiles").select("timezone").eq("id", userId).single();
  return dayKey(new Date(), (data as { timezone: string } | null)?.timezone ?? "UTC");
}

/** Records that a story was read, with the reader's "what would you do?" answer. */
export async function completeStory(storyId: unknown, choice: unknown): Promise<Result> {
  const id = z.uuid().safeParse(storyId);
  const c = z.string().max(4).safeParse(choice);
  if (!id.success || !c.success) return { ok: false, error: "Invalid story." };
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Please log in again." };
  const { data: story } = await supabase.from("stories").select("id, structure").eq("id", id.data).maybeSingle();
  if (!story) return { ok: false, error: "Story not found." };
  const structure = (story as { structure: StoryStructure | null }).structure;
  if (structure && !structure.think.options.some((o) => o.key === c.data)) return { ok: false, error: "Invalid choice." };

  const admin = createAdminClient();
  const day = await today(admin, user.id);
  const { data: inserted } = await admin
    .from("story_reads")
    .upsert({ user_id: user.id, story_id: id.data, think_choice: c.data, day_key: day }, { onConflict: "user_id,story_id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  const firstRead = Boolean(inserted);
  const progress = await applyProgress(admin, user.id, { kind: "story", firstRead });
  // Re-reading still counts as today's "Remember" step.
  if (!firstRead) await admin.from("story_reads").update({ day_key: day }).eq("user_id", user.id).eq("story_id", id.data);
  const day2 = await maybeCompleteDay(admin, user.id);
  revalidatePath("/app", "layout");
  return { ok: true, progress: mergeProgress(progress, day2), dayComplete: Boolean(day2) };
}

/** Records the player's answer to a strategic question. There is no wrong answer, only a style. */
export async function answerThought(thoughtId: unknown, choice: unknown): Promise<Result> {
  const id = z.uuid().safeParse(thoughtId);
  const c = z.string().max(4).safeParse(choice);
  if (!id.success || !c.success) return { ok: false, error: "Invalid answer." };
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Please log in again." };
  const { data } = await supabase.from("thoughts").select("id, options").eq("id", id.data).maybeSingle();
  const thought = data as Pick<Thought, "id" | "options"> | null;
  const option = thought?.options.find((o) => o.key === c.data);
  if (!thought || !option) return { ok: false, error: "Invalid answer." };

  const admin = createAdminClient();
  const day = await today(admin, user.id);
  const { data: inserted } = await admin
    .from("thought_answers")
    .upsert({ user_id: user.id, thought_id: thought.id, choice: option.key, style: option.style, day_key: day }, { onConflict: "user_id,thought_id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  const firstAnswer = Boolean(inserted);
  if (!firstAnswer) await admin.from("thought_answers").update({ day_key: day }).eq("user_id", user.id).eq("thought_id", thought.id);
  const progress = await applyProgress(admin, user.id, { kind: "thought", firstAnswer });
  const day2 = await maybeCompleteDay(admin, user.id);
  revalidatePath("/app", "layout");
  return { ok: true, progress: mergeProgress(progress, day2), dayComplete: Boolean(day2) };
}

const reflectionSchema = z.object({
  choice: z.string().trim().min(1, "Pick what stayed with you.").max(120),
  note: z.string().trim().max(280, "Keep it under 280 characters.").optional(),
});

/** Closes the day: "What did you learn?" */
export async function saveReflection(input: unknown): Promise<Result> {
  const parsed = reflectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reflection." };
  const { user } = await auth();
  if (!user) return { ok: false, error: "Please log in again." };
  const admin = createAdminClient();
  const day = await today(admin, user.id);
  const { data: session } = await admin.from("daily_sessions").select("id, reflected_at").eq("user_id", user.id).eq("day_key", day).maybeSingle();
  if (!session) return { ok: false, error: "Open Today first." };
  const first = !(session as { reflected_at: string | null }).reflected_at;
  await admin
    .from("daily_sessions")
    .update({ reflection_choice: parsed.data.choice, reflection: parsed.data.note || null, reflected_at: new Date().toISOString() })
    .eq("id", (session as { id: string }).id);
  const progress = first ? await applyProgress(admin, user.id, { kind: "reflection" }) : null;
  const day2 = await maybeCompleteDay(admin, user.id);
  if (day2) track("challenge_completed", { daily: true });
  revalidatePath("/app", "layout");
  return { ok: true, progress: progress ? mergeProgress(progress, day2) : day2, dayComplete: Boolean(day2) };
}

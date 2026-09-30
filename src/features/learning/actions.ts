"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkLessonMove } from "@/features/learning/logic";
import { applyProgress, type ProgressResult } from "@/features/progress/service";
import type { Lesson } from "@/types/database";
import { track } from "@/lib/analytics";

const schema = z.object({ lessonId: z.uuid(), move: z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/) });

export type LessonResult = { ok: true; correct: boolean; progress: ProgressResult | null } | { ok: false; error: string };

export async function submitLessonMove(input: unknown): Promise<LessonResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid move." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };

  const { data } = await supabase.from("lessons").select("id, content").eq("id", parsed.data.lessonId).maybeSingle();
  const lesson = data as Pick<Lesson, "id" | "content"> | null;
  if (!lesson) return { ok: false, error: "Lesson not found." };

  // The server re-checks the exercise; the client's verdict is only for instant feedback.
  const correct = checkLessonMove(lesson.content, parsed.data.move);
  if (!correct) return { ok: true, correct: false, progress: null };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("lesson_progress")
    .select("completed")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();
  const firstCompletion = !(existing as { completed: boolean } | null)?.completed;
  if (firstCompletion) {
    const { error } = await admin.from("lesson_progress").upsert(
      { user_id: user.id, lesson_id: lesson.id, completed: true, progress: 100, completed_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" },
    );
    if (error) return { ok: false, error: "We couldn’t save your progress." };
  }
  const progress = await applyProgress(admin, user.id, { kind: "lesson", firstCompletion });
  if (firstCompletion) track("lesson_completed", {});
  revalidatePath("/app", "layout");
  return { ok: true, correct: true, progress };
}

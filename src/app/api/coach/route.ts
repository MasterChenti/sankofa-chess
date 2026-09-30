import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCoach } from "@/lib/ai/coach/ai";
import type { GameRow, Profile } from "@/types/database";

const bodySchema = z.object({
  gameId: z.uuid(),
  question: z.string().trim().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "coach"]), text: z.string().max(2000) }))
    .max(20)
    .default([]),
});

// Simple per-instance throttle. Production: move to a shared store (e.g. Upstash) if abused.
const recent = new Map<string, number[]>();
function allow(userId: string, limit = 12, windowMs = 60_000) {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) return false;
  list.push(now);
  recent.set(userId, list);
  return true;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!allow(user.id)) return NextResponse.json({ error: "Slow down a little — try again in a minute." }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid question." }, { status: 400 });

  // RLS guarantees players can only load their own games.
  const [{ data: gameData }, { data: profileData }] = await Promise.all([
    supabase.from("games").select("*").eq("id", parsed.data.gameId).maybeSingle(),
    supabase.from("profiles").select("chess_level").eq("id", user.id).single(),
  ]);
  const game = gameData as GameRow | null;
  if (!game || !game.analysis) return NextResponse.json({ error: "Review the game first." }, { status: 404 });

  let lessonTitle: string | null = null;
  if (game.analysis.coaching.lessonSlug) {
    const { data } = await supabase.from("lessons").select("title").eq("slug", game.analysis.coaching.lessonSlug).maybeSingle();
    lessonTitle = (data as { title: string } | null)?.title ?? null;
  }

  const coach = getCoach();
  const out = await coach.coach({
    game,
    playerLevel: (profileData as Pick<Profile, "chess_level"> | null)?.chess_level ?? "beginner",
    moves: game.moves,
    engineAnalysis: game.analysis,
    userQuestion: parsed.data.question,
    history: parsed.data.history,
    lessonTitle,
  });
  return NextResponse.json({ answer: out.answer, provider: out.provider });
}

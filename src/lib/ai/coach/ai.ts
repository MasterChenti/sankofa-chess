import "server-only";
import type { ChessCoachService, CoachInput, CoachOutput } from "@/lib/ai/coach/types";
import { structuredCoaching, guidedCoach } from "@/lib/ai/coach/guided";
import { MOVE_CLASS_LABEL } from "@/lib/chess/analysis-types";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

function systemPrompt(input: CoachInput) {
  const a = input.engineAnalysis;
  const g = input.game;
  const moments =
    a.plies
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.color === g.user_color && p.loss >= 90)
      .slice(0, 6)
      .map(({ p, i }) => `Move ${Math.floor(i / 2) + 1}${p.color === "w" ? "." : "..."} ${p.san} (${MOVE_CLASS_LABEL[p.cls]}; stronger was ${p.bestSan ?? "unknown"})`)
      .join("\n") || "No major mistakes.";
  return `You are Sankofa Coach, the chess coach inside Sankofa Chess — a learning platform rooted in African heritage ("Learn from the past. Master your next move.").
Coach a ${input.playerLevel} player. Teach ideas, not engine numbers: explain what happened, why it happened, and what to do next time. Be warm, direct and concrete. Use standard algebraic notation. Never invent moves that are not in the game or the engine notes. Keep every answer under 120 words, plain text, no markdown headings.
Game: the player had the ${g.user_color === "w" ? "white" : "black"} pieces against ${g.opponent_name}${g.opponent_rating ? ` (about ${g.opponent_rating})` : ""}. Result: ${g.outcome} by ${g.termination}.
PGN: ${g.pgn}
Engine notes for the player's moves:
${moments}
Summary already shown to the player: ${a.coaching.headline} ${a.coaching.what} ${a.coaching.why} ${a.coaching.next}`;
}

/** LLM-backed coach (Anthropic Messages API), server-side only. Falls back to the guided coach on any error. */
export function createAiCoach(apiKey: string, model = DEFAULT_MODEL): ChessCoachService {
  return {
    id: "ai",
    async coach(input: CoachInput): Promise<CoachOutput> {
      const messages = [
        ...input.history.slice(-8).map((t) => ({ role: t.role === "user" ? "user" : "assistant", content: t.text })),
        { role: "user", content: input.userQuestion },
      ];
      // The API requires the first message to be from the user.
      while (messages.length && messages[0].role !== "user") messages.shift();
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({ model, max_tokens: 400, system: systemPrompt(input), messages }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) throw new Error(`AI provider ${res.status}`);
        const data = (await res.json()) as { content?: { type: string; text?: string }[] };
        const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
        if (!text) throw new Error("Empty AI response");
        return { ...structuredCoaching(input), answer: text, provider: "ai" };
      } catch (e) {
        console.warn("AI coach unavailable, using guided coach:", e instanceof Error ? e.message : e);
        return guidedCoach.coach(input);
      }
    },
  };
}

export function getCoach(): ChessCoachService {
  const key = process.env.AI_API_KEY;
  return key ? createAiCoach(key, process.env.AI_MODEL || DEFAULT_MODEL) : guidedCoach;
}

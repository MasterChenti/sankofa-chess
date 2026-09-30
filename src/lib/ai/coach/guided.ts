import { guidedAnswer } from "@/lib/chess/coaching";
import { MOVE_CLASS_LABEL } from "@/lib/chess/analysis-types";
import type { ChessCoachService, CoachInput, CoachOutput } from "@/lib/ai/coach/types";

/** Structured coaching shared by every provider (derived from the engine + rules layer). */
export function structuredCoaching(input: CoachInput): Omit<CoachOutput, "answer" | "provider"> {
  const a = input.engineAnalysis;
  const c = a.coaching;
  const mistakes = a.plies
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.color === input.game.user_color && (p.cls === "mistake" || p.cls === "blunder"))
    .slice(0, 5)
    .map(({ p, i }) => ({
      move: `${Math.floor(i / 2) + 1}${p.color === "w" ? "." : "..."} ${p.san}`,
      better: p.bestSan,
      explanation: `${MOVE_CLASS_LABEL[p.cls]}${p.bestSan ? ` — ${p.bestSan} was stronger` : ""}.`,
    }));
  return {
    summary: c.headline,
    keyLesson: `${c.why} ${c.next}`.trim(),
    mistakes,
    recommendations: [c.next, input.lessonTitle ? `Lesson: ${input.lessonTitle}` : "Solve three puzzles today"].filter(Boolean),
    practicePosition: c.keyFen ? { fen: c.keyFen, bestMove: c.keyBestUci } : null,
  };
}

/** Deterministic coach: always available, free, and consistent. Marked internally as "guided". */
export const guidedCoach: ChessCoachService = {
  id: "guided",
  async coach(input: CoachInput): Promise<CoachOutput> {
    return {
      ...structuredCoaching(input),
      answer: guidedAnswer(input.userQuestion, input.engineAnalysis, input.lessonTitle),
      provider: "guided",
    };
  },
};

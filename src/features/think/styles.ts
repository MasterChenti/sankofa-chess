import type { ThinkingStyle } from "@/types/database";

/** Playful labels for answers to strategic questions. Not psychology, just a mirror of your choices. */
export const STYLE_LABEL: Record<ThinkingStyle, { short: string; title: string; line: string }> = {
  patient: { short: "Patient", title: "The Patient Strategist", line: "You like to improve your position before you strike." },
  bold: { short: "Bold", title: "The Bold Attacker", line: "You see the opening and you take it." },
  diplomatic: { short: "Diplomatic", title: "The Diplomat", line: "You look for the deal that keeps everyone at the table." },
  adaptive: { short: "Adaptive", title: "The Adapter", line: "You read the situation and change course when it changes." },
  principled: { short: "Principled", title: "The Principled Player", line: "You hold your line, even when it costs you." },
};

export function dominantStyle(styles: (ThinkingStyle | null)[]): { style: ThinkingStyle; count: number; total: number } | null {
  const counts = new Map<ThinkingStyle, number>();
  for (const s of styles) if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  let best: ThinkingStyle | null = null;
  let n = 0;
  for (const [k, v] of counts) if (v > n) [best, n] = [k, v];
  const total = styles.filter(Boolean).length;
  return best && total >= 3 ? { style: best, count: n, total } : null;
}

import { safeTimeZone } from "@/lib/utils/dates";

/** Hour of day (0–23) in the player's own time zone. */
export function localHour(date: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: safeTimeZone(timeZone) }).format(date);
  return Number.parseInt(h, 10) % 24;
}

export function greeting(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const clip = (s: string, n = 110) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Reflection choices come from what the player actually did today, never generic filler. */
export function reflectionChoices(items: { puzzle?: string | null; story?: string | null; thought?: string | null; played?: boolean }): string[] {
  const out: string[] = [];
  if (items.puzzle) out.push(clip(`The idea behind the puzzle “${items.puzzle}”`));
  if (items.story) out.push(clip(`The story: ${items.story}`));
  if (items.thought) out.push(clip(`The question: ${items.thought}`));
  if (items.played) out.push("Something from my game");
  out.push("Nothing clicked today, and that’s fine");
  return out;
}

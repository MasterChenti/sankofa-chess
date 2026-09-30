/**
 * Product analytics seam. Events are typed now so a provider (PostHog, Plausible, …)
 * can be plugged in later without touching feature code. Never send personal data.
 */
export type AnalyticsEvent =
  | "signup_completed"
  | "onboarding_completed"
  | "game_started"
  | "game_completed"
  | "puzzle_started"
  | "puzzle_completed"
  | "lesson_started"
  | "lesson_completed"
  | "challenge_completed";

export function track(event: AnalyticsEvent, props: Record<string, string | number | boolean> = {}) {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[analytics] ${event}`, props);
  }
}

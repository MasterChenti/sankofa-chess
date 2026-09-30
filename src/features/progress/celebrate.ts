"use client";

import { toast } from "sonner";
import type { ProgressResult } from "@/features/progress/service";

/** Surfaces XP, streak, challenge and achievement moments after an action. */
export function celebrate(progress: ProgressResult | undefined | null, reason?: string) {
  if (!progress) return;
  if (progress.xpGained > 0) toast(`+${progress.xpGained} XP${reason ? ` · ${reason}` : ""}`);
  progress.completedChallenges.forEach((c, i) =>
    setTimeout(() => toast(`Challenge complete: ${c.title}`, { description: `+${c.rewardXp} XP` }), 700 * (i + 1)),
  );
  progress.newAchievements.forEach((a, i) => setTimeout(() => toast(`Achievement unlocked: ${a.name}`), 1400 + 700 * i));
  if (progress.leveledUp) setTimeout(() => toast(`Sankofa Level ${progress.level}: ${progress.levelName}`), 2400);
}

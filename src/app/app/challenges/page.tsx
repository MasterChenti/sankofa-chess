import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requirePlayer } from "@/features/auth/session";
import { getChallengeStatus } from "@/features/challenges/queries";
import { levelForXp, SANKOFA_LEVELS } from "@/features/progress/rules";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Challenges" };

const TYPE_LABEL = { daily: "Daily", weekly: "Weekly", learning: "Learning", strategy: "Strategy" } as const;

export default async function ChallengesPage() {
  const { supabase, profile } = await requirePlayer();
  const challenges = await getChallengeStatus(supabase, profile);
  const lv = levelForXp(profile.xp);

  return (
    <>
      <PageHeader
        title="Challenges"
        description="Small goals. Real progress. Earn XP to climb the Sankofa levels."
        actions={
          <Badge variant="gold" className="px-3 py-1 text-sm">
            {profile.xp} XP · Level {lv.level} {lv.name}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {challenges.map((c) => (
          <Card key={c.id} className={cn("flex flex-col gap-4 p-5 sm:p-6", c.completed && "border-success/40")}>
            <div className="flex items-center justify-between">
              <Badge variant={c.completed ? "success" : "default"}>{TYPE_LABEL[c.type]}</Badge>
              <span className="num text-sm font-semibold text-accent-foreground">+{c.reward_xp} XP</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{c.title}</h2>
              <p className="text-sm text-muted-foreground">{c.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={(100 * c.progress) / c.target} className="h-2 flex-1" />
              <span className="num text-sm font-semibold">
                {c.progress}/{c.target}
              </span>
            </div>
            {c.completed ? (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <CheckCircle2 className="size-4" /> Completed — XP added
              </p>
            ) : (
              c.href && (
                <Button asChild variant="secondary" size="sm" className="w-fit">
                  <Link href={c.href}>Start</Link>
                </Button>
              )
            )}
            <p className="text-xs text-faint">{c.period === "day" ? "Resets at midnight, your time." : "Resets every Monday."}</p>
          </Card>
        ))}
      </div>

      <section className="mt-10" aria-labelledby="levels-h">
        <h2 id="levels-h" className="mb-1 text-xl font-semibold">
          Sankofa levels
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Progression levels for your learning journey on Sankofa Chess — they are not official chess titles.
        </p>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {SANKOFA_LEVELS.map((l) => {
            const reached = profile.xp >= l.minXp;
            const current = l.level === lv.level;
            return (
              <li
                key={l.level}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "rounded-[var(--radius-md)] border px-3 py-3",
                  current ? "border-gold bg-accent" : reached ? "border-border bg-card" : "border-dashed border-border text-muted-foreground",
                )}
              >
                <p className="text-xs text-muted-foreground">Level {l.level}</p>
                <p className="font-display text-lg font-semibold">{l.name}</p>
                <p className="num text-xs text-muted-foreground">{l.minXp} XP</p>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}

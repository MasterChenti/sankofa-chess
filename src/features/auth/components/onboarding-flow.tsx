"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/label";
import { completeOnboarding } from "@/features/auth/actions";
import type { ChessLevel, Goal } from "@/types/database";
import { cn } from "@/lib/utils";

const LEVELS: [ChessLevel, string, string][] = [
  ["beginner", "Beginner", "New to chess or still learning the rules."],
  ["intermediate", "Intermediate", "I know the rules and some tactics."],
  ["advanced", "Advanced", "I play regularly and study the game."],
];
const GOALS: [Goal, string, string][] = [
  ["basics", "Learn the basics", "How pieces move and how games are won."],
  ["tactics", "Improve tactics", "Spot forks, pins and mates faster."],
  ["strategy", "Improve strategy", "Plans, structure and positional play."],
  ["tournaments", "Prepare for tournaments", "Sharper, more serious training."],
  ["fun", "Play for fun", "Good games, no pressure."],
];

export function OnboardingFlow({ name, initialLevel }: { name: string; initialLevel: ChessLevel }) {
  const [step, setStep] = React.useState(0);
  const [level, setLevel] = React.useState<ChessLevel>(initialLevel);
  const [goal, setGoal] = React.useState<Goal | null>(null);
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function finish() {
    if (!goal) return;
    setError(null);
    start(async () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await completeOnboarding({ chessLevel: level, goal, timezone: tz });
      if (res?.message) setError(res.message);
    });
  }

  const choice = (active: boolean) =>
    cn(
      "flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-md)] border p-4 text-left transition-colors",
      active ? "border-gold bg-accent" : "border-border bg-card hover:border-border-strong",
    );

  const plan =
    goal === "basics"
      ? "Beginner lessons first, one puzzle a day, and gentle games against Abena."
      : goal === "tactics"
        ? "Tactics lessons, three puzzles a day, and reviews that point out missed shots."
        : goal === "strategy"
          ? "Strategy lessons, longer games, and reviews focused on plans."
          : goal === "tournaments"
            ? "Daily puzzles, rated games against Kwaku and Nana, and a review after every game."
            : "Play when you want. We’ll suggest one idea from each game.";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of 4`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-gold" : "bg-surface-3")} />
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-col items-start gap-5">
          <LogoMark className="size-16 text-foreground" />
          <h1 className="text-[2.6rem] font-semibold leading-[1.05]">Welcome to Sankofa Chess, {name}.</h1>
          <p className="text-lg text-muted-foreground">Every game you play here becomes a lesson. Two quick questions and your training plan is ready.</p>
          <Button size="lg" onClick={() => setStep(1)} data-testid="onboarding-next">
            Let’s go
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold">What’s your chess level?</h1>
          <div className="flex flex-col gap-2.5">
            {LEVELS.map(([v, t, d]) => (
              <button key={v} type="button" aria-pressed={level === v} className={choice(level === v)} onClick={() => setLevel(v)}>
                <span className="font-semibold">{t}</span>
                <span className="text-sm text-muted-foreground">{d}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft /> Back
            </Button>
            <Button onClick={() => setStep(2)} data-testid="onboarding-next">
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold">What do you want to improve?</h1>
          <div className="flex flex-col gap-2.5">
            {GOALS.map(([v, t, d]) => (
              <button key={v} type="button" aria-pressed={goal === v} className={choice(goal === v)} onClick={() => setGoal(v)}>
                <span className="font-semibold">{t}</span>
                <span className="text-sm text-muted-foreground">{d}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft /> Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!goal} data-testid="onboarding-next">
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-start gap-5">
          <h1 className="text-3xl font-semibold">Your plan is ready.</h1>
          <p className="text-lg text-muted-foreground">{plan}</p>
          <ul className="flex flex-col gap-2 text-sm">
            <li>· A daily mission: solve 3 puzzles</li>
            <li>· Your first lesson, picked for your level</li>
            <li>· A personal review after every game</li>
          </ul>
          {error && <FieldError message={error} />}
          <div className="flex w-full justify-between">
            <Button variant="ghost" onClick={() => setStep(2)} disabled={pending}>
              <ArrowLeft /> Back
            </Button>
            <Button size="lg" onClick={finish} disabled={pending} data-testid="onboarding-finish">
              {pending ? "Setting up…" : "Open my dashboard"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

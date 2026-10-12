"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { voteDilemma, type VoteResult } from "@/features/share/actions";
import { cn } from "@/lib/utils";

/** "What would you do?" for someone who opened a friend's card. Answer first, then see the friend's choice and everyone else's. */
export function DilemmaVote({
  code,
  options,
  ownerName,
  signedIn,
}: {
  code: string;
  options: { key: string; text: string }[];
  ownerName: string;
  signedIn: boolean;
}) {
  const [choice, setChoice] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Extract<VoteResult, { ok: true }> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const storageKey = `sankofa.card.${code}`;

  function choose(key: string) {
    if (choice) return;
    setChoice(key);
    setError(null);
    start(async () => {
      const r = await voteDilemma(code, key);
      if (!r.ok) {
        setError(r.message);
        setChoice(null);
        return;
      }
      setResult(r);
      try {
        localStorage.setItem(storageKey, key);
      } catch {
        /* private mode */
      }
    });
  }

  const ownerOption = result?.ownerChoice ? options.find((o) => o.key === result.ownerChoice) : null;
  const same = Boolean(result?.ownerChoice && result.ownerChoice === choice);

  return (
    <div className="flex flex-col gap-4" data-testid="dilemma-vote">
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="What would you do?">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={choice === o.key}
            disabled={Boolean(choice)}
            onClick={() => choose(o.key)}
            data-testid={`dilemma-option-${o.key}`}
            className={cn(
              "relative overflow-hidden rounded-[var(--radius-md)] border px-4 py-3.5 text-left transition-colors",
              !choice && "border-border bg-card hover:border-gold",
              choice === o.key ? "border-gold bg-accent" : choice ? "border-border bg-card" : "",
            )}
          >
            {result && result.total > 0 && (
              <span className="absolute inset-y-0 left-0 bg-gold/15" style={{ width: `${result.percent[o.key] ?? 0}%` }} aria-hidden />
            )}
            <span className="relative flex items-center justify-between gap-3">
              <span className="font-semibold">{o.text}</span>
              {result && result.total >= 5 && <span className="num text-sm text-muted-foreground">{result.percent[o.key] ?? 0}%</span>}
            </span>
            {result?.ownerChoice === o.key && (
              <span className="relative mt-1 block text-xs font-semibold text-accent-foreground">{ownerName}’s choice</span>
            )}
          </button>
        ))}
      </div>
      {pending && <p className="text-sm text-muted-foreground">Saving your answer…</p>}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {result && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-brown/40 p-5 animate-rise" data-testid="dilemma-result">
          <p className="font-display text-2xl font-semibold">
            {ownerOption ? (same ? `You think like ${result.ownerName}.` : `${result.ownerName} chose differently.`) : `${result.ownerName} hasn’t decided yet.`}
          </p>
          {ownerOption && !same && (
            <p className="text-sm">
              {result.ownerName} chose: <span className="font-semibold">{ownerOption.text}</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {result.total >= 5 ? `${result.total} people have answered this one.` : "You’re one of the first to answer this one."} What actually happened?
          </p>
          {signedIn ? (
            <Button asChild className="w-fit">
              <Link href={`/app/discover/${result.storySlug}`}>
                Read what happened <ArrowRight />
              </Link>
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button asChild className="w-fit" data-testid="card-signup">
                <Link href={`/signup?next=${encodeURIComponent(`/d/${code}`)}`}>
                  Find out: free, 10 minutes a day <ArrowRight />
                </Link>
              </Button>
              <Link href={`/login?next=${encodeURIComponent(`/d/${code}`)}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                I already have an account
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { answerThought } from "@/features/today/actions";
import { celebrate } from "@/features/progress/celebrate";
import { STYLE_LABEL } from "@/features/think/styles";
import type { Thought } from "@/types/database";
import { cn } from "@/lib/utils";

/** A strategic question with no single right answer. Answer first, then see how strategists think about each option. */
export function ThoughtCard({
  thought,
  previousChoice,
  lessonTitle,
  continueHref,
  continueLabel = "Continue",
}: {
  thought: Thought;
  previousChoice: string | null;
  lessonTitle: string | null;
  continueHref?: string;
  continueLabel?: string;
}) {
  const [choice, setChoice] = React.useState<string | null>(previousChoice);
  const [error, setError] = React.useState<string | null>(null);

  async function choose(key: string) {
    if (choice) return;
    setChoice(key);
    const r = await answerThought(thought.id, key);
    if (!r.ok) setError(r.error);
    else celebrate(r.progress, "Strategic question");
  }

  const picked = thought.options.find((o) => o.key === choice);

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-5" data-testid="thought">
      <p className="text-sm font-semibold text-accent-foreground">Think</p>
      <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.5rem]">{thought.prompt}</h1>
      {thought.context && <p className="font-display text-lg italic text-muted-foreground">{thought.context}</p>}
      <div className="flex flex-col gap-2.5">
        {thought.options.map((o) => (
          <button
            key={o.key}
            type="button"
            disabled={Boolean(choice)}
            onClick={() => choose(o.key)}
            data-testid={`thought-option-${o.key}`}
            className={cn(
              "flex flex-col gap-1 rounded-[var(--radius-md)] border px-4 py-3.5 text-left transition-colors",
              !choice && "border-border bg-card hover:border-gold",
              choice === o.key && "border-gold bg-accent",
              choice && choice !== o.key && "border-border bg-card",
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-semibold">{o.text}</span>
              {choice && <Badge variant={choice === o.key ? "gold" : "default"}>{STYLE_LABEL[o.style].short}</Badge>}
            </span>
            {choice && <span className="text-sm text-muted-foreground">{o.perspective}</span>}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {picked && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-brown/40 p-5 animate-rise" data-testid="thought-takeaway">
          <p className="text-sm">
            Your instinct here was <span className="font-semibold text-accent-foreground">{STYLE_LABEL[picked.style].short.toLowerCase()}</span>. There’s no
            single right answer: what matters is knowing why you chose it.
          </p>
          <p className="font-display text-xl italic leading-snug">{thought.takeaway}</p>
          {thought.lesson_slug && lessonTitle && (
            <Button asChild variant="secondary" size="sm" className="w-fit">
              <Link href={`/app/learn/${thought.lesson_slug}`}>
                <BookOpen /> Try it on the board: {lessonTitle}
              </Link>
            </Button>
          )}
        </div>
      )}
      {picked && continueHref && (
        <Button asChild size="lg" className="w-fit" data-testid="step-continue">
          <Link href={continueHref}>
            {continueLabel} <ArrowRight />
          </Link>
        </Button>
      )}
    </div>
  );
}

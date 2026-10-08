"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookMarked, CheckCircle2 } from "lucide-react";
import { StoryArt } from "@/components/brand/story-art";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { completeStory } from "@/features/today/actions";
import { celebrate } from "@/features/progress/celebrate";
import { REGION_LABEL } from "@/features/today/plan";
import type { Story } from "@/types/database";
import { cn } from "@/lib/utils";

/**
 * A Sankofa Story is an experience, not a wall of text:
 * situation → (reveal) pressure → "What would you do?" → what happened → Sankofa lesson → known vs debated → sources.
 */
export function StoryExperience({
  story,
  previousChoice,
  continueHref,
  continueLabel = "Continue",
}: {
  story: Story;
  previousChoice: string | null;
  continueHref?: string;
  continueLabel?: string;
}) {
  const s = story.structure;
  const [shown, setShown] = React.useState(previousChoice ? (s?.sections.length ?? 1) : 1);
  const [choice, setChoice] = React.useState<string | null>(previousChoice);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (shown > 1 || choice) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [shown, choice]);

  if (!s) {
    return (
      <article className="mx-auto max-w-[680px] text-[1.1rem] leading-relaxed">
        {story.content.split(/\n{2,}/).map((p, i) => (
          <p key={i} className="mb-4">
            {p}
          </p>
        ))}
      </article>
    );
  }

  async function choose(key: string) {
    if (choice || saving) return;
    setChoice(key);
    setSaving(true);
    const r = await completeStory(story.id, key);
    setSaving(false);
    if (!r.ok) setError(r.error);
    else celebrate(r.progress, "Story read");
  }

  const allSections = shown >= s.sections.length;
  const picked = s.think.options.find((o) => o.key === choice);

  return (
    <article className="mx-auto flex max-w-[680px] flex-col gap-7" data-testid="story">
      <header className="flex flex-col gap-3">
        <div className="w-20 text-gold">
          <StoryArt symbol={story.symbol} className="h-auto w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {story.region && <Badge variant="gold">{REGION_LABEL[story.region]}</Badge>}
          <span>{story.place}</span>
          {story.era && <span>· {story.era}</span>}
          <span>· {story.read_minutes} min</span>
        </div>
        <h1 className="text-[2.3rem] font-semibold leading-[1.05] sm:text-[3rem]">{story.title}</h1>
        <p className="font-display text-xl text-muted-foreground">{story.excerpt}</p>
      </header>

      {s.sections.slice(0, shown).map((sec, i) => (
        <section key={i} className="flex flex-col gap-3 animate-rise">
          <h2 className="text-sm font-semibold text-accent-foreground">{sec.title}</h2>
          {sec.body.map((p, j) => (
            <p key={j} className="font-display text-[1.15rem] leading-[1.75] text-foreground/90">
              {p}
            </p>
          ))}
        </section>
      ))}

      {!allSections && (
        <Button variant="secondary" className="w-fit" onClick={() => setShown((n) => n + 1)} data-testid="story-continue">
          Continue <ArrowRight />
        </Button>
      )}

      {allSections && (
        <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-gold/40 bg-accent/40 p-5 animate-rise" aria-labelledby="think-q">
          <p className="text-sm font-semibold text-accent-foreground">Think</p>
          <h2 id="think-q" className="text-2xl font-semibold">
            {s.think.question}
          </h2>
          <div className="flex flex-col gap-2">
            {s.think.options.map((o) => (
              <button
                key={o.key}
                type="button"
                disabled={Boolean(choice)}
                onClick={() => choose(o.key)}
                data-testid={`story-option-${o.key}`}
                className={cn(
                  "rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
                  !choice && "border-border bg-card hover:border-gold",
                  choice === o.key && "border-gold bg-card",
                  choice && choice !== o.key && "border-border bg-card opacity-60",
                )}
              >
                <span className="font-semibold">{o.text}</span>
                {choice && <span className="mt-1 block text-sm text-muted-foreground">{o.reflection}</span>}
              </button>
            ))}
          </div>
          {picked && <p className="text-sm text-muted-foreground">You chose: “{picked.text}”.</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </section>
      )}

      {choice && (
        <>
          <section className="flex flex-col gap-3 animate-rise">
            <h2 className="text-sm font-semibold text-accent-foreground">{s.outcome.title}</h2>
            {s.outcome.body.map((p, j) => (
              <p key={j} className="font-display text-[1.15rem] leading-[1.75] text-foreground/90">
                {p}
              </p>
            ))}
          </section>

          <section className="rounded-[var(--radius-lg)] bg-brown/40 p-5">
            <p className="text-sm font-semibold text-accent-foreground">Sankofa</p>
            <p className="mt-2 font-display text-xl italic leading-snug" data-testid="story-sankofa">
              {s.sankofa}
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <CheckCircle2 className="size-4 text-success" /> Well established
              </p>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
                {s.known.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <BookMarked className="size-4 text-warning" /> Tradition, estimates or debate
              </p>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
                {s.debated.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          </section>
          {story.source && (
            <p className="border-t border-border pt-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Sources:</span> {story.source}
            </p>
          )}
          {continueHref && (
            <Button asChild size="lg" className="w-fit" data-testid="step-continue">
              <Link href={continueHref}>
                {continueLabel} <ArrowRight />
              </Link>
            </Button>
          )}
        </>
      )}
      <div ref={endRef} />
    </article>
  );
}

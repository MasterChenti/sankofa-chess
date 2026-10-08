"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { saveReflection } from "@/features/today/actions";
import { celebrate } from "@/features/progress/celebrate";
import { cn } from "@/lib/utils";

/** "What did you learn today?" — the moment that turns activity into learning. */
export function ReflectionForm({ choices, doneHref, initialChoice }: { choices: string[]; doneHref: string; initialChoice: string | null }) {
  const router = useRouter();
  const [choice, setChoice] = React.useState<string | null>(initialChoice);
  const [note, setNote] = React.useState("");
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function submit() {
    if (!choice) {
      setError("Pick what stayed with you.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await saveReflection({ choice, note: note.trim() || undefined });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      celebrate(r.progress, "Reflection");
      router.push(doneHref);
    });
  }

  return (
    <div className="mx-auto flex max-w-[620px] flex-col gap-5" data-testid="reflection">
      <p className="text-sm font-semibold text-accent-foreground">Reflect</p>
      <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.5rem]">What stayed with you today?</h1>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="What stayed with you">
        {choices.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={choice === c}
            onClick={() => setChoice(c)}
            className={cn(
              "rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
              choice === c ? "border-gold bg-accent" : "border-border bg-card hover:border-border-strong",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">
          In one sentence, what will you do differently? <span className="font-normal text-faint">(optional, private)</span>
        </span>
        <Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 280))} rows={3} placeholder="Next time, I’ll check what my opponent threatens before I attack." />
        <span className="num text-right text-xs text-faint">{note.length}/280</span>
      </label>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <Button size="lg" className="w-fit" onClick={submit} disabled={pending} data-testid="save-reflection">
        {pending ? "Saving…" : "Close today’s session"}
      </Button>
    </div>
  );
}

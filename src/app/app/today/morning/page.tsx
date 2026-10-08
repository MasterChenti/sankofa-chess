import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bot, Check, Sunrise, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requirePlayer } from "@/features/auth/session";
import { getToday } from "@/features/today/queries";
import { STEPS, isDayComplete, nextStep, type StepKey } from "@/features/today/plan";
import { reflectionChoices } from "@/features/today/copy";
import { getPuzzleProgress } from "@/features/puzzles/queries";
import { PuzzleClient } from "@/features/puzzles/components/puzzle-client";
import { StoryExperience } from "@/features/discover/components/story-experience";
import { ThoughtCard } from "@/features/think/components/thought-card";
import { ReflectionForm } from "@/features/today/components/reflection-form";
import { OnlineCount } from "@/features/online/components/online-count";
import { STYLE_LABEL } from "@/features/think/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your session" };

const BASE = "/app/today/morning";
const VALID = new Set<string>(["move", "remember", "think", "play", "reflect", "done"]);

/**
 * The finite daily session (Morning Mode). One column, one thing at a time, light on data:
 * Move → Remember → Think → (Play) → Reflect → done.
 */
export default async function MorningPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step: requested } = await searchParams;
  const { supabase, profile } = await requirePlayer();
  const today = await getToday(supabase, profile);
  const { status, puzzle, story, thought, session } = today;
  // Always pin the step in the URL: finishing a step revalidates the page, and the
  // player must stay on it (to see the solution or the story's outcome) until they continue.
  if (!requested || !VALID.has(requested)) redirect(`${BASE}?step=${nextStep(status)}`);
  const step = requested as StepKey | "done";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <ol className="flex flex-1 items-center gap-1.5" aria-label="Session progress">
          {STEPS.map((s) => (
            <li key={s.key} className="flex-1">
              <Link
                href={`${BASE}?step=${s.key}`}
                aria-current={step === s.key ? "step" : undefined}
                className="flex flex-col gap-1"
                title={s.label}
              >
                <span
                  className={cn(
                    "h-1.5 rounded-full",
                    status[s.key] ? "bg-success" : step === s.key ? "bg-gold" : "bg-surface-2",
                    !s.core && !status[s.key] && step !== s.key && "bg-surface-2/60",
                  )}
                />
                <span className={cn("hidden text-[0.7rem] font-semibold sm:block", step === s.key ? "text-foreground" : "text-faint")}>{s.label}</span>
              </Link>
            </li>
          ))}
        </ol>
        <Link href="/app/today" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-surface-2" aria-label="Leave session">
          <X className="size-5" />
        </Link>
      </div>

      {step === "move" && <MoveStep />}
      {step === "remember" && <RememberStep />}
      {step === "think" && <ThinkStep />}
      {step === "play" && <PlayStep />}
      {step === "reflect" && (
        <ReflectionForm
          choices={reflectionChoices({ puzzle: puzzle?.title, story: story?.title, thought: thought?.prompt, played: status.play })}
          doneHref={`${BASE}?step=done`}
          initialChoice={session.reflection_choice}
        />
      )}
      {step === "done" && <DoneStep />}
    </div>
  );

  async function MoveStep() {
    if (!puzzle) return <Empty what="position" next="remember" />;
    const { solved } = await getPuzzleProgress(supabase, profile.id, profile.timezone);
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-accent-foreground">Move · today’s position</p>
        <PuzzleClient puzzle={puzzle} alreadySolved={solved.has(puzzle.id)} nextHref={BASE} continueHref={BASE} continueLabel="Next: today’s story" />
      </div>
    );
  }

  async function RememberStep() {
    if (!story) return <Empty what="story" next="think" />;
    const { data } = await supabase.from("story_reads").select("think_choice").eq("user_id", profile.id).eq("story_id", story.id).maybeSingle();
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-accent-foreground">Remember{today.storyReason ? ` · ${today.storyReason}` : ""}</p>
        <StoryExperience
          story={story}
          previousChoice={(data as { think_choice: string | null } | null)?.think_choice ?? null}
          continueHref={BASE}
          continueLabel="Next: a question"
        />
      </div>
    );
  }

  async function ThinkStep() {
    if (!thought) return <Empty what="question" next="play" />;
    const [{ data: ans }, { data: lesson }] = await Promise.all([
      supabase.from("thought_answers").select("choice").eq("user_id", profile.id).eq("thought_id", thought.id).maybeSingle(),
      thought.lesson_slug ? supabase.from("lessons").select("title").eq("slug", thought.lesson_slug).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return (
      <ThoughtCard
        thought={thought}
        previousChoice={(ans as { choice: string } | null)?.choice ?? null}
        lessonTitle={(lesson as { title: string } | null)?.title ?? null}
        continueHref={BASE}
        continueLabel="Next"
      />
    );
  }

  function PlayStep() {
    return (
      <div className="mx-auto flex w-full max-w-[620px] flex-col gap-5" data-testid="play-step">
        <p className="text-sm font-semibold text-accent-foreground">Play · bonus</p>
        <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.5rem]">Use it in a real game.</h1>
        <p className="text-muted-foreground">
          A game isn’t required to finish today: it doesn’t always fit a commute. But this is where the thinking becomes yours.
        </p>
        <OnlineCount userId={profile.id} />
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link
            href="/app/play?tab=people&mode=rapid&auto=1"
            className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 hover:border-gold/60"
          >
            <Users className="size-6 text-accent-foreground" />
            <span>
              <span className="block font-semibold">Find a real opponent</span>
              <span className="text-xs text-muted-foreground">Rapid 10 min. If nobody’s around, play Abena instead.</span>
            </span>
          </Link>
          <Link
            href="/app/play?tab=computer&vs=abena&tc=5%2B0"
            className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 hover:border-gold/60"
          >
            <Bot className="size-6 text-accent-foreground" />
            <span>
              <span className="block font-semibold">A 5-minute game with Abena</span>
              <span className="text-xs text-muted-foreground">A computer opponent. Works on a weak connection.</span>
            </span>
          </Link>
        </div>
        <Button asChild variant="ghost" className="w-fit" data-testid="skip-play">
          <Link href={`${BASE}?step=reflect`}>
            Not today: go to reflection <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }

  async function DoneStep() {
    const complete = isDayComplete(status);
    const { data: ans } = thought
      ? await supabase.from("thought_answers").select("style").eq("user_id", profile.id).eq("thought_id", thought.id).maybeSingle()
      : { data: null };
    const style = (ans as { style: keyof typeof STYLE_LABEL | null } | null)?.style;
    const missing = STEPS.filter((s) => s.core && !status[s.key]);
    return (
      <div className="mx-auto flex w-full max-w-[620px] flex-col gap-6" data-testid="session-done">
        <Sunrise className="size-10 text-accent-foreground" />
        <h1 className="text-[2.2rem] font-semibold leading-tight sm:text-[2.8rem]">
          {complete ? "You’ve sharpened your mind for today." : "Almost there."}
        </h1>
        <ul className="flex flex-col gap-2">
          {[
            status.move && puzzle && `You solved “${puzzle.title}”.`,
            status.remember && story && `You remembered: ${story.title}.`,
            status.think && style && `Your instinct today was ${STYLE_LABEL[style].short.toLowerCase()}.`,
            status.play && "You played a game.",
            session.reflection && `You wrote: “${session.reflection}”`,
          ]
            .filter(Boolean)
            .map((line) => (
              <li key={line as string} className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-success" />
                <span>{line}</span>
              </li>
            ))}
        </ul>
        {complete ? (
          <p className="text-muted-foreground">There’s nothing more to scroll. Tomorrow brings a new position, a new story and a new question.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground">Still to do: {missing.map((m) => m.label).join(", ")}.</p>
            <Button asChild className="w-fit">
              <Link href={BASE}>
                Continue <ArrowRight />
              </Link>
            </Button>
          </div>
        )}
        <Button asChild variant="secondary" className="w-fit">
          <Link href="/app/today">Back to Today</Link>
        </Button>
      </div>
    );
  }

  function Empty({ what, next }: { what: string; next: StepKey }) {
    return (
      <div className="mx-auto flex max-w-[620px] flex-col gap-4">
        <p className="text-muted-foreground">There’s no {what} available right now.</p>
        <Button asChild className="w-fit">
          <Link href={`${BASE}?step=${next}`}>Skip</Link>
        </Button>
      </div>
    );
  }
}

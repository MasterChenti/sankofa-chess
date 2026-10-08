"use client";

import * as React from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { BookOpen, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Loader2, Send, Target } from "lucide-react";
import { ChessBoard } from "@/components/chess/chess-board";
import { MoveList } from "@/components/chess/move-list";
import { EvalGraph } from "@/components/chess/eval-graph";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getEngine } from "@/lib/chess/engine";
import { lineScore } from "@/lib/chess/engine/types";
import { analyzeGame } from "@/lib/chess/analysis";
import type { GameAnalysis } from "@/lib/chess/analysis-types";
import { TERMINATION_LABEL, uciToMove, type Termination } from "@/lib/chess/rules";
import { START_FEN } from "@/lib/chess/fen";
import { saveAnalysis } from "@/features/chess/actions";
import { CAUSE_OPTIONS, coachingCause } from "@/lib/chess/coaching";
import type { CoachingCause } from "@/lib/chess/analysis-types";
import { celebrate } from "@/features/progress/celebrate";
import type { GameRow } from "@/types/database";
import { cn } from "@/lib/utils";

type Lessons = Record<string, { title: string }>;

export function ReviewClient({ game, lessons }: { game: GameRow; lessons: Lessons }) {
  const [analysis, setAnalysis] = React.useState<GameAnalysis | null>(game.analysis);
  const [progress, setProgress] = React.useState(0);
  const [failed, setFailed] = React.useState(false);

  const run = React.useCallback(async () => {
    setFailed(false);
    setProgress(0);
    try {
      const engine = await getEngine();
      const a = await analyzeGame(
        engine,
        { moves: game.moves, userColor: game.user_color, outcome: game.outcome, termination: game.termination },
        (d, t) => setProgress(Math.round((100 * d) / t)),
      );
      setAnalysis(a);
      const saved = await saveAnalysis(game.id, a);
      if (saved.ok) celebrate(saved.progress, "Game reviewed");
    } catch (e) {
      console.error(e);
      setFailed(true);
    }
  }, [game]);

  React.useEffect(() => {
    if (!game.analysis) void run();
  }, [game.analysis, run]);

  if (!analysis) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col gap-4 pt-6">
          {failed ? (
            <>
              <p className="font-semibold">We couldn’t finish the review.</p>
              <p className="text-sm text-muted-foreground">The engine didn’t respond on this device. Your game is saved — try again.</p>
              <Button onClick={run}>Try again</Button>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 font-semibold">
                <Loader2 className="size-4 animate-spin" /> Going back through your game…
              </p>
              <Progress value={progress} aria-label="Review progress" />
              <p className="text-sm text-muted-foreground">
                Stockfish is checking every move. Then the coach turns it into plain language.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return <ReviewBody game={game} analysis={analysis} lessons={lessons} />;
}

function ReviewBody({ game, analysis, lessons }: { game: GameRow; analysis: GameAnalysis; lessons: Lessons }) {
  const c = analysis.coaching;
  const [ply, setPly] = React.useState<number>(c.keyPly ?? analysis.plies.length - 1);
  const orientation = game.user_color === "w" ? "white" : "black";
  const fenAt = (p: number) => {
    if (p < 0) return START_FEN;
    const g = new Chess(analysis.plies[p].fenBefore);
    g.move(uciToMove(analysis.plies[p].uci));
    return g.fen();
  };
  const cur = ply >= 0 ? analysis.plies[ply] : null;
  const lesson = c.lessonSlug ? lessons[c.lessonSlug] : null;
  const cause = coachingCause(c);
  const askFirst = cause !== "clean" && cause !== "early-resign";
  const [guess, setGuess] = React.useState<string | null>(null);
  const revealed = !askFirst || guess !== null;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") setPly((p) => Math.max(-1, p - 1));
      if (e.key === "ArrowRight") setPly((p) => Math.min(analysis.plies.length - 1, p + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [analysis.plies.length]);

  const stats: [string | number, string][] = [
    [`${analysis.accuracy}%`, "Accuracy"],
    [Math.ceil(analysis.plies.length / 2), "Moves"],
    [analysis.counts.best + analysis.counts.good, "Best / good"],
    [analysis.counts.inaccuracy + analysis.counts.mistake, "Mistakes"],
    [analysis.counts.blunder, "Blunders"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {stats.map(([v, l]) => (
          <div key={l} className="rounded-[var(--radius-md)] border border-border bg-card px-4 py-3">
            <p className="num font-display text-2xl font-semibold">{v}</p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          {askFirst && (
            <ThinkFirst
              gameId={game.id}
              moveLabel={c.keyMoveLabel && c.keyMoveSan ? `${c.keyMoveLabel} ${c.keyMoveSan}` : null}
              correct={cause}
              guess={guess}
              onGuess={(g) => {
                setGuess(g);
                if (c.keyPly != null) setPly(c.keyPly);
              }}
            />
          )}
          {revealed && (
            <>
          <Card>
              <CardHeader>
                <p className="text-sm text-muted-foreground">Your biggest lesson</p>
                <CardTitle className="text-2xl" data-testid="biggest-lesson">
                  {c.headline}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex flex-col gap-4">
                  {[
                    ["What happened", c.what || "Nothing went badly wrong."],
                    ["Why it happened", c.why],
                    ["What to do next time", c.next],
                  ].map(([t, body], i) => (
                    <li key={t} className="grid grid-cols-[1.75rem_1fr] gap-3">
                      <span className="num grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold">{t}</p>
                        <p className="text-[0.95rem] text-muted-foreground">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                {lesson && c.lessonSlug && (
                  <Button asChild variant="secondary" className="mt-5">
                    <Link href={`/app/learn/${c.lessonSlug}`}>
                      <BookOpen /> Lesson: {lesson.title}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
            </>
          )}

          {revealed && c.keyFen && <PracticePosition fen={c.keyFen} bestUci={c.keyBestUci} bestSan={c.keyBestSan} color={game.user_color} label={c.keyMoveLabel} />}

          <CoachChat gameId={game.id} />
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-24">
          <ChessBoard
            id="review-board"
            fen={fenAt(ply)}
            orientation={orientation}
            movable="none"
            lastMove={cur ? { from: cur.uci.slice(0, 2), to: cur.uci.slice(2, 4) } : null}
            arrows={cur && cur.bestUci && cur.bestUci !== cur.uci && cur.loss >= 90 ? [{ from: cur.bestUci.slice(0, 2), to: cur.bestUci.slice(2, 4) }] : []}
            label="Game replay"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button variant="secondary" size="icon" aria-label="Start" onClick={() => setPly(-1)}>
                <ChevronFirst />
              </Button>
              <Button variant="secondary" size="icon" aria-label="Previous move" onClick={() => setPly((p) => Math.max(-1, p - 1))}>
                <ChevronLeft />
              </Button>
            </div>
            <p className="text-center text-sm">
              {cur ? (
                <>
                  <span className="font-semibold">
                    {Math.floor(ply / 2) + 1}
                    {cur.color === "w" ? "." : "..."} {cur.san}
                  </span>{" "}
                  <span className={cn("text-muted-foreground", (cur.cls === "mistake" || cur.cls === "blunder") && "text-destructive")}>
                    {cur.cls}
                    {cur.bestSan && cur.bestUci !== cur.uci && cur.loss >= 60 ? ` · best was ${cur.bestSan}` : ""}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Starting position</span>
              )}
            </p>
            <div className="flex gap-1">
              <Button variant="secondary" size="icon" aria-label="Next move" onClick={() => setPly((p) => Math.min(analysis.plies.length - 1, p + 1))}>
                <ChevronRight />
              </Button>
              <Button variant="secondary" size="icon" aria-label="End" onClick={() => setPly(analysis.plies.length - 1)}>
                <ChevronLast />
              </Button>
            </div>
          </div>
          <EvalGraph plies={analysis.plies} activePly={ply} onSelect={setPly} keyPly={c.keyPly} />
          <MoveList sans={analysis.plies.map((p) => p.san)} classes={analysis.plies.map((p) => p.cls)} activePly={ply} onSelect={setPly} className="max-h-72" />
          <p className="text-xs text-faint">
            Engine: {analysis.engine}. Result: {game.result} by {TERMINATION_LABEL[game.termination as Termination] ?? game.termination}.
          </p>
        </div>
      </div>
    </div>
  );
}

function PracticePosition({
  fen,
  bestUci,
  bestSan,
  color,
  label,
}: {
  fen: string;
  bestUci: string | null;
  bestSan: string | null;
  color: "w" | "b";
  label: string | null;
}) {
  const [cur, setCur] = React.useState(fen);
  const [state, setState] = React.useState<"idle" | "checking" | "right" | "good" | "wrong" | "shown">("idle");

  async function onMove(uci: string) {
    const g = new Chess(cur);
    const m = g.move(uciToMove(uci));
    setCur(g.fen());
    if (uci === bestUci) {
      setState("right");
      return true;
    }
    setState("checking");
    try {
      const engine = await getEngine();
      const [before, after] = await Promise.all([
        engine.analyse(fen, { depth: 10, movetimeMs: 300 }),
        engine.analyse(g.fen(), { depth: 10, movetimeMs: 300 }),
      ]);
      const loss = lineScore(before.lines[0]) + lineScore(after.lines[0]);
      setState(loss <= 40 || m.san.endsWith("#") ? "good" : "wrong");
    } catch {
      setState("wrong");
    }
    return true;
  }

  function reset() {
    setCur(fen);
    setState("idle");
  }

  const message = {
    idle: `Back to move ${label ?? ""} — find the stronger move.`,
    checking: "Checking your move…",
    right: "Excellent. You found it — that’s the move the game needed.",
    good: "Good move. That works nearly as well as the engine’s choice.",
    wrong: "Not quite. Look again at what your opponent threatens, then try again.",
    shown: `The stronger move was ${bestSan}.`,
  }[state];

  return (
    <Card>
      <CardHeader>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="size-4" /> Try this position again
        </p>
        <CardTitle>Practice position</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="mx-auto w-full max-w-[420px]">
          <ChessBoard
            id="practice-board"
            fen={cur}
            orientation={color === "w" ? "white" : "black"}
            movable={state === "idle" ? color : "none"}
            onMove={onMove}
            hintSquares={state === "shown" && bestUci ? [bestUci.slice(0, 2), bestUci.slice(2, 4)] : []}
            label="Practice board"
          />
        </div>
        <p
          className={cn(
            "rounded-[var(--radius-md)] px-4 py-3 text-sm font-semibold",
            state === "right" || state === "good" ? "bg-success/15 text-success" : state === "wrong" ? "bg-destructive/12 text-destructive" : "bg-surface-2",
          )}
          aria-live="polite"
        >
          {message}
        </p>
        <div className="flex flex-wrap gap-2">
          {(state === "wrong" || state === "right" || state === "good" || state === "shown") && (
            <Button variant="secondary" size="sm" onClick={reset}>
              Try again
            </Button>
          )}
          {bestSan && state !== "right" && state !== "shown" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCur(fen);
                setState("shown");
              }}
            >
              Show the move
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type Msg = { role: "user" | "coach"; text: string };
const SUGGESTIONS = ["Why was my worst move bad?", "What should I have done?", "What should I practise next?"];

function CoachChat({ gameId }: { gameId: string }) {
  const [msgs, setMsgs] = React.useState<Msg[]>([
    { role: "coach", text: "I’ve gone through your game. Ask me anything about it — I’ll explain the idea, not just the engine line." },
  ]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [provider, setProvider] = React.useState<"ai" | "guided" | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [msgs.length, busy]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const history = msgs.slice(1);
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameId, question, history }),
      });
      const data = (await res.json()) as { answer?: string; provider?: "ai" | "guided"; error?: string };
      setMsgs((m) => [...m, { role: "coach", text: data.answer ?? data.error ?? "I couldn’t answer that just now." }]);
      if (data.provider) setProvider(data.provider);
    } catch {
      setMsgs((m) => [...m, { role: "coach", text: "I couldn’t reach the coach. Check your connection and try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Ask the coach</CardTitle>
        {provider && <Badge variant={provider === "ai" ? "gold" : "default"}>{provider === "ai" ? "Live coach" : "Guided coach"}</Badge>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex max-h-96 flex-col gap-2.5 overflow-y-auto" aria-live="polite" data-testid="coach-chat">
          {msgs.map((m, i) => (
            <p
              key={i}
              className={cn(
                "max-w-[88%] whitespace-pre-line rounded-[var(--radius-md)] px-3.5 py-2.5 text-[0.95rem]",
                m.role === "coach" ? "self-start bg-surface-2" : "self-end bg-accent text-foreground",
              )}
            >
              {m.text}
            </p>
          ))}
          {busy && (
            <p className="self-start rounded-[var(--radius-md)] bg-surface-2 px-3.5 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline size-4 animate-spin" />
              Thinking…
            </p>
          )}
          <div ref={endRef} />
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={busy}
              className="rounded-full border border-border-strong px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-gold hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this game" maxLength={500} aria-label="Ask the coach" />
          <Button type="submit" size="icon" className="size-12" disabled={busy || !input.trim()} aria-label="Send">
            <Send />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ThinkFirst({
  gameId,
  moveLabel,
  correct,
  guess,
  onGuess,
}: {
  gameId: string;
  moveLabel: string | null;
  correct: CoachingCause;
  guess: string | null;
  onGuess: (g: string) => void;
}) {
  // Correct answer plus three others, in a stable order for this game.
  const options = React.useMemo(() => {
    const others = CAUSE_OPTIONS.filter((o) => o.cause !== correct);
    const seed = [...gameId].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const picked = [...others].sort((a, b) => ((seed ^ a.cause.length * 97) % 7) - ((seed ^ b.cause.length * 97) % 7)).slice(0, 3);
    const all = [...picked, CAUSE_OPTIONS.find((o) => o.cause === correct)!];
    return all.sort((a, b) => ((seed + a.text.length) % 5) - ((seed + b.text.length) % 5));
  }, [gameId, correct]);

  return (
    <Card className="border-gold/40" data-testid="think-first">
      <CardHeader>
        <p className="text-sm text-muted-foreground">Think first</p>
        <CardTitle className="text-2xl">What do you think went wrong{moveLabel ? ` around ${moveLabel}` : ""}?</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {options.map((o) => {
          const chosen = guess === o.cause;
          const right = guess && o.cause === correct;
          return (
            <button
              key={o.cause}
              type="button"
              disabled={guess !== null}
              onClick={() => onGuess(o.cause)}
              className={cn(
                "rounded-[var(--radius-md)] border px-4 py-3 text-left text-[0.95rem] transition-colors",
                !guess && "border-border hover:border-gold",
                right && "border-success bg-success/10",
                chosen && !right && "border-destructive/60 bg-destructive/10",
                guess && !chosen && !right && "border-border opacity-60",
              )}
            >
              {o.text}
            </button>
          );
        })}
        {!guess && (
          <button type="button" onClick={() => onGuess("unsure")} className="mt-1 w-fit text-sm font-semibold text-muted-foreground hover:text-foreground">
            I’m not sure: show me
          </button>
        )}
        {guess && (
          <p className="mt-1 text-sm font-semibold" aria-live="polite">
            {guess === correct ? "You spotted it. That’s exactly what decided the game." : guess === "unsure" ? "Here’s what decided the game." : "Not quite. Here’s what actually decided the game."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

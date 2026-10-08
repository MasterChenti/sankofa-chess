"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Chess } from "chess.js";
import { toast } from "sonner";
import { ArrowUpDown, Flag, Handshake, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { ChessBoard } from "@/components/chess/chess-board";
import { MoveList } from "@/components/chess/move-list";
import { materialSummary, PlayerStrip } from "@/components/chess/player-strip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getEngine } from "@/lib/chess/engine";
import { lineScore } from "@/lib/chess/engine/types";
import { PERSONA_LIST, PERSONAS, TIME_CONTROLS, type PersonaId, type TimeControlId } from "@/lib/chess/personas";
import { naturalEnd, replay, TERMINATION_LABEL, type GameResult, type Termination } from "@/lib/chess/rules";
import { START_FEN } from "@/lib/chess/fen";
import { finishGame, type FinishGameResult } from "@/features/chess/actions";
import { celebrate } from "@/features/progress/celebrate";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Mode = "ai" | "local";
type Setup = { mode: Mode; personaId: PersonaId; color: "w" | "b" | "random"; timeControl: TimeControlId };
type End = { result: GameResult; termination: Termination; loser?: "w" | "b" };
type Live = {
  mode: Mode;
  personaId: PersonaId;
  userColor: "w" | "b";
  timeControl: TimeControlId;
  moves: string[];
  clocks: { w: number | null; b: number | null };
  /** When the side to move started thinking (epoch ms); null until the first move. */
  turnStartedAt: number | null;
  end: End | null;
};

const STORAGE_KEY = "sankofa.active-game.v1";

function loadLive(): Live | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as Live;
    return g && Array.isArray(g.moves) && !g.end ? g : null;
  } catch {
    return null;
  }
}
function saveLive(g: Live | null) {
  try {
    if (!g || g.end) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(g));
  } catch {
    /* storage unavailable — the game still works */
  }
}

/** True when an unfinished game against the computer is saved on this device. */
export function hasActiveComputerGame() {
  return loadLive() !== null;
}

export type PlayPreset = Partial<Pick<Setup, "personaId" | "timeControl">>;

export function PlayClient({
  playerName,
  playerRating,
  initial,
  preset,
}: {
  playerName: string;
  playerRating: number;
  initial: string;
  preset?: PlayPreset;
}) {
  const router = useRouter();
  const [setup, setSetup] = React.useState<Setup>({ mode: "ai", personaId: "kwaku", color: "w", timeControl: "10+0", ...preset });
  const [live, setLive] = React.useState<Live | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const [engineState, setEngineState] = React.useState<"loading" | "ready" | "fallback">("loading");
  const [thinking, setThinking] = React.useState(false);
  const [flipped, setFlipped] = React.useState(false);
  const [viewPly, setViewPly] = React.useState<number | null>(null);
  const [confirmResign, setConfirmResign] = React.useState(false);
  const [saved, setSaved] = React.useState<FinishGameResult | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [, setTick] = React.useState(0);

  // Restore an unfinished game after refresh; warm the engine up in the background.
  React.useEffect(() => {
    setLive(loadLive());
    setHydrated(true);
    getEngine().then((e) => setEngineState(e.name.startsWith("Stockfish") ? "ready" : "fallback"));
  }, []);

  React.useEffect(() => {
    if (hydrated) saveLive(live);
  }, [live, hydrated]);

  const game = React.useMemo(() => (live ? replay(live.moves) ?? new Chess() : null), [live]);
  const fen = game?.fen() ?? START_FEN;
  const history = React.useMemo(() => game?.history({ verbose: true }) ?? [], [game]);
  const turn = (game?.turn() ?? "w") as "w" | "b";
  const persona = live ? PERSONAS[live.personaId] : PERSONAS[setup.personaId];
  const isAiTurn = Boolean(live && live.mode === "ai" && !live.end && turn !== live.userColor);

  // ----- clocks -----
  const remaining = React.useCallback(
    (color: "w" | "b") => {
      if (!live) return null;
      const base = live.clocks[color];
      if (base == null) return null;
      if (live.end || turn !== color || live.turnStartedAt == null) return base;
      return base - (Date.now() - live.turnStartedAt);
    },
    [live, turn],
  );

  const endGame = React.useCallback((end: End) => {
    setLive((g) => (g && !g.end ? { ...g, end } : g));
  }, []);

  React.useEffect(() => {
    if (!live || live.end || live.clocks.w == null || live.turnStartedAt == null) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      const left = remaining(turn);
      if (left != null && left <= 0) endGame({ result: turn === "w" ? "0-1" : "1-0", termination: "timeout", loser: turn });
    }, 100);
    return () => window.clearInterval(id);
  }, [live, turn, remaining, endGame]);

  // ----- moves -----
  /** Appends a move. `expectedPly` guards against stale engine replies. */
  const applyMove = React.useCallback((uci: string, expectedPly?: number) => {
    setLive((g) => {
      if (!g || g.end) return g;
      if (expectedPly != null && g.moves.length !== expectedPly) return g;
      const board = replay(g.moves);
      if (!board) return g;
      const mover = board.turn() as "w" | "b";
      try {
        board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      } catch {
        return g;
      }
      const now = Date.now();
      const clocks = { ...g.clocks };
      const inc = TIME_CONTROLS[g.timeControl].incrementMs;
      if (clocks[mover] != null && g.turnStartedAt != null) clocks[mover] = clocks[mover]! - (now - g.turnStartedAt) + inc;
      const moves = [...g.moves, uci];
      const natural = naturalEnd(board);
      // Clocks start after Black's first move, as on most platforms.
      const turnStartedAt = moves.length >= 2 ? now : null;
      return { ...g, moves, clocks, turnStartedAt, end: natural ? { ...natural } : null };
    });
    setViewPly(null);
  }, []);

  const onUserMove = React.useCallback(
    (uci: string) => {
      if (!live || live.end) return false;
      if (live.mode === "ai" && turn !== live.userColor) return false;
      applyMove(uci);
      return true;
    },
    [live, turn, applyMove],
  );

  // Computer's turn
  React.useEffect(() => {
    if (!isAiTurn || !live || thinking) return;
    let cancelled = false;
    const movesAtStart = live.moves.length;
    setThinking(true);
    (async () => {
      const started = Date.now();
      const engine = await getEngine();
      const uci = await engine.chooseMove(fen, persona);
      const minThink = 450 + Math.random() * 500;
      const wait = Math.max(0, minThink - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      if (cancelled) return;
      setThinking(false);
      if (!uci) return;
      applyMove(uci, movesAtStart);
    })().catch(() => {
      if (!cancelled) {
        setThinking(false);
        toast("The engine stumbled. Your move stays — try again in a moment.");
      }
    });
    return () => {
      cancelled = true;
      setThinking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAiTurn, live?.moves.length]);

  // Persist the finished game once.
  React.useEffect(() => {
    if (!live?.end || saved || saving) return;
    setSaving(true);
    const payload = {
      moves: live.moves,
      termination: live.end.termination,
      loser: live.end.loser,
      source: live.mode === "ai" ? "vs_computer" : "pass_and_play",
      personaId: live.mode === "ai" ? live.personaId : undefined,
      userColor: live.userColor,
      timeControl: live.timeControl,
    };
    finishGame(payload)
      .then((res) => {
        setSaved(res);
        if (res.ok) celebrate(res.progress, res.outcome === "win" ? "Game won" : "Game played");
      })
      .catch(() => setSaved({ ok: false, error: "We couldn’t reach the server to save this game." }))
      .finally(() => setSaving(false));
  }, [live, saved, saving]);

  // ----- actions -----
  function start() {
    const userColor = setup.color === "random" ? (Math.random() < 0.5 ? "w" : "b") : setup.color;
    const tc = TIME_CONTROLS[setup.timeControl];
    const g: Live = {
      mode: setup.mode,
      personaId: setup.personaId,
      userColor,
      timeControl: setup.timeControl,
      moves: [],
      clocks: { w: tc.initialMs, b: tc.initialMs },
      turnStartedAt: null,
      end: null,
    };
    setSaved(null);
    setViewPly(null);
    setFlipped(setup.mode === "ai" && userColor === "b");
    setLive(g);
    track("game_started", { mode: setup.mode, persona: setup.personaId, tc: setup.timeControl });
  }

  function resign() {
    if (!live) return;
    const loser = live.mode === "local" ? turn : live.userColor;
    setConfirmResign(false);
    endGame({ result: loser === "w" ? "0-1" : "1-0", termination: "resignation", loser });
  }

  async function offerDraw() {
    if (!live || live.end) return;
    if (live.mode === "local") {
      endGame({ result: "1/2-1/2", termination: "agreement" });
      return;
    }
    const engine = await getEngine();
    const a = await engine.analyse(fen, { depth: 10, movetimeMs: 400 });
    const stm = lineScore(a.lines[0]);
    const aiScore = turn === live.userColor ? -stm : stm;
    const accept = aiScore <= -150 || (live.moves.length >= 60 && Math.abs(aiScore) < 40);
    if (accept) {
      toast(`${persona.name} accepts the draw.`);
      endGame({ result: "1/2-1/2", termination: "agreement" });
    } else {
      toast(`${persona.name} declines — there’s still play in this position.`);
    }
  }

  function newGame() {
    setLive(null);
    setSaved(null);
    saveLive(null);
  }

  // ----- render -----
  if (!hydrated) {
    return <div className="h-[70dvh] animate-pulse rounded-[var(--radius-lg)] bg-surface-2" aria-label="Loading" />;
  }

  if (!live) {
    return (
      <SetupPanel
        setup={setup}
        onChange={setSetup}
        onStart={start}
        engineState={engineState}
      />
    );
  }

  const orientation: "white" | "black" = flipped ? "black" : "white";
  const bottomColor: "w" | "b" = flipped ? "b" : "w";
  const topColor: "w" | "b" = bottomColor === "w" ? "b" : "w";
  const capturedBy = { w: [] as string[], b: [] as string[] };
  history.forEach((m) => m.captured && capturedBy[m.color].push(m.captured));
  const { whiteLead, blackLead } = materialSummary(capturedBy.w, capturedBy.b);
  const sideInfo = (c: "w" | "b") => {
    const isUser = live.mode === "local" || c === live.userColor;
    return {
      name: live.mode === "local" ? (c === "w" ? "White" : "Black") : isUser ? playerName : persona.name,
      rating: live.mode === "local" ? null : isUser ? playerRating : persona.rating,
      initial: live.mode === "local" ? (c === "w" ? "W" : "B") : isUser ? initial : persona.name[0],
      captured: capturedBy[c],
      materialLead: c === "w" ? whiteLead : blackLead,
      clockMs: live.clocks.w == null ? undefined : remaining(c),
      active: !live.end && turn === c,
      thinking: live.mode === "ai" && c !== live.userColor && thinking,
      color: c,
    };
  };

  const viewing = viewPly != null && viewPly < live.moves.length - 1;
  const viewFen = viewing ? history[viewPly!].after : fen;
  const last = viewing ? history[viewPly!] : history[history.length - 1];
  const statusText = live.end
    ? live.end.result === "1/2-1/2"
      ? `Draw by ${TERMINATION_LABEL[live.end.termination]}.`
      : `${live.end.result === "1-0" ? "White" : "Black"} wins by ${TERMINATION_LABEL[live.end.termination]}.`
    : thinking
      ? `${persona.name} is thinking…`
      : game?.inCheck()
        ? "Check."
        : live.mode === "local"
          ? `${turn === "w" ? "White" : "Black"} to move.`
          : turn === live.userColor
            ? "Your move."
            : `${persona.name} to move.`;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="mx-auto w-full max-w-[640px]">
        <PlayerStrip {...sideInfo(topColor)} />
        <ChessBoard
          id="play-board"
          fen={viewFen}
          orientation={orientation}
          movable={viewing || live.end ? "none" : live.mode === "local" ? "both" : live.userColor}
          onMove={onUserMove}
          lastMove={last ? { from: last.from, to: last.to } : null}
          label="Game board"
        />
        <PlayerStrip {...sideInfo(bottomColor)} />
      </div>

      <aside className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold" aria-live="polite" data-testid="game-status">
            {statusText}
          </p>
          <Button variant="ghost" size="icon" onClick={() => setFlipped((f) => !f)} aria-label="Flip board">
            <ArrowUpDown />
          </Button>
        </div>
        <MoveList
          sans={history.map((m) => m.san)}
          activePly={viewing ? viewPly : null}
          onSelect={(p) => setViewPly(p === live.moves.length - 1 ? null : p)}
        />
        {viewing && (
          <Button variant="secondary" size="sm" onClick={() => setViewPly(null)}>
            Back to the game
          </Button>
        )}
        {!live.end ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={offerDraw} disabled={live.moves.length < 2 || thinking}>
              <Handshake /> Offer draw
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmResign(true)} disabled={live.moves.length < 2}>
              <Flag /> Resign
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => saved?.ok && router.push(`/app/play/${saved.gameId}`)} disabled={!saved?.ok}>
              <Sparkles /> Review with the coach
            </Button>
            <Button variant="secondary" size="sm" onClick={newGame}>
              <RotateCcw /> New game
            </Button>
          </div>
        )}
        {engineState === "fallback" && live.mode === "ai" && (
          <p className="text-xs text-muted-foreground">Stockfish couldn’t start on this device, so a lighter engine is playing.</p>
        )}
      </aside>

      <Dialog open={confirmResign} onOpenChange={setConfirmResign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resign this game?</DialogTitle>
            <DialogDescription>You’ll still get your full review with the coach.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmResign(false)}>
              Keep playing
            </Button>
            <Button variant="destructive" onClick={resign}>
              Resign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResultDialog live={live} saved={saved} saving={saving} personaName={persona.name} onReview={(id) => router.push(`/app/play/${id}`)} onNew={newGame} onRetry={() => setSaved(null)} />
    </div>
  );
}

function ResultDialog({
  live,
  saved,
  saving,
  personaName,
  onReview,
  onNew,
  onRetry,
}: {
  live: Live;
  saved: FinishGameResult | null;
  saving: boolean;
  personaName: string;
  onReview: (id: string) => void;
  onNew: () => void;
  onRetry: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (live.end) {
      const t = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(t);
    }
  }, [live.end]);
  if (!live.end) return null;
  const end = live.end;
  const outcome =
    live.mode === "local" ? null : end.result === "1/2-1/2" ? "draw" : (end.result === "1-0") === (live.userColor === "w") ? "win" : "loss";
  const title =
    outcome === "win" ? "You won." : outcome === "loss" ? "You lost." : outcome === "draw" ? "A draw." : end.result === "1/2-1/2" ? "A draw." : `${end.result === "1-0" ? "White" : "Black"} wins.`;
  const line =
    outcome === "win"
      ? `Well played against ${personaName}. Now see what made it work.`
      : outcome === "loss"
        ? "Every game teaches you something. Let’s find out what this one taught."
        : "Balanced to the end. The review shows where the game could have tipped.";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-testid="result-dialog">
        <DialogHeader>
          <p className="text-sm text-muted-foreground">
            {end.result === "1/2-1/2" ? "Draw" : `${end.result === "1-0" ? "White" : "Black"} wins`} by {TERMINATION_LABEL[end.termination]}
          </p>
          <DialogTitle className="text-3xl">{title}</DialogTitle>
          <DialogDescription>{line}</DialogDescription>
        </DialogHeader>
        {saving && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Saving your game…
          </p>
        )}
        {saved?.ok && saved.rated && (
          <div className="flex gap-6">
            <div>
              <p className="num font-display text-3xl font-semibold">{saved.ratingAfter}</p>
              <p className="text-xs text-muted-foreground">
                Rating{" "}
                <span className={cn("num font-semibold", (saved.ratingChange ?? 0) >= 0 ? "text-success" : "text-destructive")}>
                  {(saved.ratingChange ?? 0) >= 0 ? "+" : ""}
                  {saved.ratingChange}
                </span>
              </p>
            </div>
            <div>
              <p className="num font-display text-3xl font-semibold">+{saved.progress.xpGained}</p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
          </div>
        )}
        {saved?.ok && !saved.rated && <Badge>Unrated game</Badge>}
        {saved && !saved.ok && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm font-medium text-destructive">{saved.error}</p>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try saving again
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onNew}>
            Play again
          </Button>
          <Button onClick={() => saved?.ok && onReview(saved.gameId)} disabled={!saved?.ok}>
            Review with the coach
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetupPanel({
  setup,
  onChange,
  onStart,
  engineState,
}: {
  setup: Setup;
  onChange: (s: Setup) => void;
  onStart: () => void;
  engineState: "loading" | "ready" | "fallback";
}) {
  const choice = (active: boolean) =>
    cn(
      "flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-md)] border p-4 text-left transition-colors",
      active ? "border-gold bg-accent" : "border-border bg-card hover:border-border-strong",
    );
  const seg = (active: boolean) =>
    cn(
      "h-11 rounded-[var(--radius-md)] border px-4 text-sm font-semibold transition-colors",
      active ? "border-gold bg-accent text-accent-foreground" : "border-border-strong text-foreground hover:bg-surface-2",
    );
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="order-2 mx-auto w-full max-w-[520px] opacity-90 lg:order-1 lg:max-w-[640px]">
        <ChessBoard fen={START_FEN} movable="none" label="Starting position" />
      </div>
      <div className="order-1 flex flex-col gap-6 lg:order-2">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm font-semibold">Opponent</legend>
          {PERSONA_LIST.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={setup.mode === "ai" && setup.personaId === p.id}
              className={choice(setup.mode === "ai" && setup.personaId === p.id)}
              onClick={() => onChange({ ...setup, mode: "ai", personaId: p.id })}
            >
              <span className="font-semibold">
                {p.name} <span className="font-medium text-muted-foreground">· {p.label}</span>
              </span>
              <span className="text-sm text-muted-foreground">
                {p.blurb} About {p.rating}.
              </span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={setup.mode === "local"}
            className={choice(setup.mode === "local")}
            onClick={() => onChange({ ...setup, mode: "local" })}
          >
            <span className="font-semibold">Pass &amp; play</span>
            <span className="text-sm text-muted-foreground">Two players, one device. Not rated.</span>
          </button>
        </fieldset>

        {setup.mode === "ai" && (
          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold">Your pieces</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["w", "White"],
                  ["b", "Black"],
                  ["random", "Random"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" aria-pressed={setup.color === v} className={seg(setup.color === v)} onClick={() => onChange({ ...setup, color: v })}>
                  {l}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-2.5 text-sm font-semibold">Time control</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TIME_CONTROLS) as TimeControlId[]).map((k) => (
              <button key={k} type="button" aria-pressed={setup.timeControl === k} className={seg(setup.timeControl === k)} onClick={() => onChange({ ...setup, timeControl: k })}>
                {TIME_CONTROLS[k].label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={onStart} data-testid="start-game">
            Start game
          </Button>
          <p className="text-xs text-muted-foreground">
            {engineState === "loading"
              ? "Warming up the engine…"
              : engineState === "ready"
                ? "Powered by Stockfish. Every game ends with a personal review."
                : "Using the lightweight engine on this device."}
          </p>
        </div>
      </div>
    </div>
  );
}

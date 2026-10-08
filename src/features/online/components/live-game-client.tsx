"use client";

import * as React from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { toast } from "sonner";
import { ArrowUpDown, Flag, Handshake, Share2, Sparkles, Wifi, WifiOff, X } from "lucide-react";
import { ChessBoard } from "@/components/chess/chess-board";
import { MoveList } from "@/components/chess/move-list";
import { materialSummary, PlayerStrip } from "@/components/chess/player-strip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clocksAt, clockRunning, formatPerMove, LIVE_MODES, sideToMove } from "@/lib/chess/live";
import { TERMINATION_LABEL, uciToMove, type Termination } from "@/lib/chess/rules";
import { abortLive, cancelInvite, claimTimeoutLive, offerDrawLive, resignLive, respondDrawLive, submitMove } from "@/features/online/actions";
import { useLiveGame } from "@/features/online/use-live-game";
import type { LiveGame } from "@/types/database";
import { countryFlag } from "@/config/countries";

export type LivePlayer = { id: string; username: string; display_name: string; rating: number; country: string } | null;

export function LiveGameClient({
  initial,
  meId,
  white,
  black,
  inviteUrl,
  reviewGameId,
}: {
  initial: LiveGame;
  meId: string;
  white: LivePlayer;
  black: LivePlayer;
  inviteUrl: string | null;
  reviewGameId: string | null;
}) {
  const { game, accept, refresh, connected } = useLiveGame(initial);
  const [pending, setPending] = React.useState<string | null>(null);
  const [flipped, setFlipped] = React.useState(initial.black_id === meId);
  const [confirmResign, setConfirmResign] = React.useState(false);
  const [, setTick] = React.useState(0);
  const claimed = React.useRef<number>(-1);

  const myColor: "w" | "b" | null = game.white_id === meId ? "w" : game.black_id === meId ? "b" : null;
  const moves = pending ? [...game.moves, pending] : game.moves;
  const board = React.useMemo(() => {
    const g = new Chess();
    for (const m of moves) {
      try {
        g.move(uciToMove(m));
      } catch {
        break;
      }
    }
    return g;
  }, [moves]);
  const history = board.history({ verbose: true });
  const last = history[history.length - 1];
  const turn = sideToMove(game.moves);
  const active = game.status === "active";
  const myTurn = active && myColor === turn && !pending;
  const cfg = LIVE_MODES[game.mode];

  // Tick clocks while running.
  React.useEffect(() => {
    if (!active || !clockRunning(game.moves.length)) return;
    const t = window.setInterval(() => setTick((x) => x + 1), cfg.perMove ? 30_000 : 250);
    return () => window.clearInterval(t);
  }, [active, game.moves.length, cfg.perMove]);

  const clocks = clocksAt(game, Date.now());

  // When the side to move hits zero on our screen, ask the server (the only judge) to check.
  React.useEffect(() => {
    if (!active || !clockRunning(game.moves.length)) return;
    if (clocks[turn] > 0 || claimed.current === game.ply) return;
    claimed.current = game.ply;
    void claimTimeoutLive(game.id).then((r) => accept(r.game ?? null));
  }, [active, clocks, turn, game.ply, game.moves.length, game.id, accept]);

  // Finished-game notice
  const prevStatus = React.useRef(game.status);
  React.useEffect(() => {
    if (prevStatus.current === "active" && game.status === "finished") {
      // Give the server a moment to write the game history so the review link resolves.
      window.setTimeout(() => void refresh(), 1500);
    }
    prevStatus.current = game.status;
  }, [game.status, refresh]);

  async function onMove(uci: string) {
    if (!myTurn) return false;
    setPending(uci);
    const res = await submitMove(game.id, uci, game.ply);
    setPending(null);
    if (res.game) accept(res.game);
    if (!res.ok) {
      toast(res.message);
      void refresh();
    }
    return true;
  }

  async function act(fn: () => Promise<{ ok: boolean; message?: string; game?: LiveGame | null }>) {
    const r = await fn();
    if (r.game) accept(r.game);
    if (!r.ok && r.message) toast(r.message);
  }

  const capturedBy = { w: [] as string[], b: [] as string[] };
  history.forEach((m) => m.captured && capturedBy[m.color].push(m.captured));
  const { whiteLead, blackLead } = materialSummary(capturedBy.w, capturedBy.b);
  const strip = (c: "w" | "b") => {
    const p = c === "w" ? white : black;
    return (
      <PlayerStrip
        name={p ? `${countryFlag(p.country)} ${p.username}${p.id === meId ? " (you)" : ""}` : "Waiting for a friend…"}
        rating={p?.rating}
        initial={p ? p.display_name.slice(0, 1).toUpperCase() : "?"}
        color={c}
        captured={capturedBy[c]}
        materialLead={c === "w" ? whiteLead : blackLead}
        clockMs={cfg.perMove ? undefined : clockRunning(game.moves.length) ? clocks[c] : game[c === "w" ? "white_ms" : "black_ms"]}
        active={active && turn === c}
      />
    );
  };
  const orientation = flipped ? "black" : "white";
  const top: "w" | "b" = flipped ? "w" : "b";
  const bottom: "w" | "b" = flipped ? "b" : "w";

  const opponentOffered = game.draw_offer_by && game.draw_offer_by !== meId;
  const status =
    game.status === "waiting"
      ? "Waiting for your friend to join…"
      : game.status === "aborted"
        ? "Game aborted. No rating change."
        : game.status === "finished" && game.result
          ? game.result === "1/2-1/2"
            ? `Draw by ${TERMINATION_LABEL[game.termination as Termination] ?? game.termination}.`
            : `${game.result === "1-0" ? "White" : "Black"} wins by ${TERMINATION_LABEL[game.termination as Termination] ?? game.termination}.`
          : pending
            ? "Sending your move…"
            : myTurn
              ? board.inCheck()
                ? "Check. Your move."
                : "Your move."
              : "Opponent to move.";

  const iWon =
    game.status === "finished" && game.result && myColor && game.result !== "1/2-1/2" && (game.result === "1-0") === (myColor === "w");

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="mx-auto w-full max-w-[640px]" data-my-color={myColor ?? ""}>
        {strip(top)}
        <ChessBoard
          id="live-board"
          fen={board.fen()}
          orientation={orientation}
          movable={myTurn ? myColor! : "none"}
          onMove={onMove}
          lastMove={last ? { from: last.from, to: last.to } : null}
          label="Live game board"
        />
        {strip(bottom)}
      </div>

      <aside className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="gold">
              {cfg.label} · {cfg.detail}
            </Badge>
            <span className="text-faint" title={connected === "live" ? "Live connection" : "Reconnecting: updates may be slower"}>
              {connected === "live" ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setFlipped((f) => !f)} aria-label="Flip board">
            <ArrowUpDown />
          </Button>
        </div>
        <p className="text-sm font-semibold" aria-live="polite" data-testid="live-status">
          {status}
        </p>
        {cfg.perMove && active && clockRunning(game.moves.length) && (
          <p className="text-sm text-muted-foreground">
            {turn === myColor ? "You have" : "Your opponent has"} {formatPerMove(clocks[turn])} to move.
          </p>
        )}

        {game.status === "waiting" && inviteUrl && <InviteShare url={inviteUrl} />}

        {opponentOffered && active && (
          <div className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-accent p-3">
            <p className="text-sm font-semibold">Your opponent offers a draw.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => act(() => respondDrawLive(game.id, true))}>
                Accept
              </Button>
              <Button size="sm" variant="secondary" onClick={() => act(() => respondDrawLive(game.id, false))}>
                Decline
              </Button>
            </div>
          </div>
        )}

        <MoveList sans={history.map((m) => m.san)} emptyText={game.status === "waiting" ? "The game starts when your friend joins." : "White moves first."} />

        {active && myColor && (
          <div className="flex flex-wrap gap-2">
            {game.ply < 2 ? (
              <Button variant="secondary" size="sm" onClick={() => act(() => abortLive(game.id))}>
                <X /> Abort
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="sm" disabled={Boolean(game.draw_offer_by)} onClick={() => act(() => offerDrawLive(game.id))}>
                  <Handshake /> {game.draw_offer_by === meId ? "Draw offered" : "Offer draw"}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setConfirmResign(true)}>
                  <Flag /> Resign
                </Button>
              </>
            )}
          </div>
        )}
        {game.status === "waiting" && game.created_by === meId && (
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => act(() => cancelInvite(game.id))}>
            Cancel invite
          </Button>
        )}

        {(game.status === "finished" || game.status === "aborted") && (
          <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface-2 p-4" data-testid="live-result">
            <p className="font-display text-2xl font-semibold">
              {game.status === "aborted" ? "Aborted." : game.result === "1/2-1/2" ? "A draw." : iWon ? "You won." : myColor ? "You learned something." : "Game over."}
            </p>
            <div className="flex flex-wrap gap-2">
              {reviewGameId ? (
                <Button asChild size="sm">
                  <Link href={`/app/play/${reviewGameId}`}>
                    <Sparkles /> Review with the coach
                  </Link>
                </Button>
              ) : (
                game.status === "finished" && (
                  <Button size="sm" variant="secondary" onClick={() => void refresh()}>
                    Preparing your review…
                  </Button>
                )
              )}
              <Button asChild size="sm" variant="secondary">
                <Link href="/app/play?tab=people">Play again</Link>
              </Button>
            </div>
          </div>
        )}
      </aside>

      <Dialog open={confirmResign} onOpenChange={setConfirmResign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resign this game?</DialogTitle>
            <DialogDescription>You’ll still get your review with the coach.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmResign(false)}>
              Keep playing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmResign(false);
                void act(() => resignLive(game.id));
              }}
            >
              Resign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function InviteShare({ url }: { url: string }) {
  const text = `I challenge you to a game of chess on Sankofa ♟️ ${url}`;
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border p-3">
      <p className="text-sm font-semibold">Send this link to your opponent</p>
      <code className="break-all rounded-[var(--radius-sm)] bg-background-2 px-2 py-1.5 text-xs" data-testid="invite-link">
        {url}
      </code>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
            <Share2 /> WhatsApp
          </a>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ title: "Sankofa Chess", text, url });
              else {
                await navigator.clipboard.writeText(url);
                toast("Link copied.");
              }
            } catch {
              /* user cancelled */
            }
          }}
        >
          Share or copy
        </Button>
      </div>
    </div>
  );
}

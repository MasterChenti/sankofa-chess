"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LIVE_MODES, liveTurnLabel } from "@/lib/chess/live";
import { cancelMatch, createInvite, findMatch } from "@/features/online/actions";
import { InviteShare } from "@/features/online/components/live-game-client";
import { OnlineCount } from "@/features/online/components/online-count";
import type { LiveGame, LiveMode } from "@/types/database";
import { cn } from "@/lib/utils";

export type MyLiveGame = Pick<LiveGame, "id" | "status" | "mode" | "moves" | "white_id" | "black_id" | "invite_code"> & { opponent: string | null };

export function OnlinePanel({
  meId,
  games,
  origin,
  initialMode = "rapid",
  autoStart = false,
}: {
  meId: string;
  games: MyLiveGame[];
  origin: string;
  initialMode?: LiveMode;
  autoStart?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<LiveMode>(initialMode);
  const [searching, setSearching] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [invite, setInvite] = React.useState<{ url: string; gameId: string } | null>(null);
  const [inviting, setInviting] = React.useState(false);
  const started = React.useRef(false);

  const search = React.useCallback(async () => {
    setError(null);
    setSearching(true);
    setSeconds(0);
  }, []);

  // While searching: poll the matchmaker every 2 s (this also keeps our queue entry fresh).
  React.useEffect(() => {
    if (!searching) return;
    let stop = false;
    const tick = async () => {
      const r = await findMatch(mode);
      if (stop) return;
      if (r.status === "matched") {
        setSearching(false);
        router.push(`/app/play/live/${r.gameId}`);
      } else if (r.status === "error") {
        setSearching(false);
        setError(r.message);
      }
    };
    void tick();
    const poll = window.setInterval(() => void tick(), 2000);
    const clock = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      stop = true;
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [searching, mode, router]);

  React.useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      void search();
    }
  }, [autoStart, search]);

  // Leave the queue if the player navigates away mid-search.
  React.useEffect(() => {
    return () => {
      void cancelMatch();
    };
  }, []);

  async function stopSearch() {
    setSearching(false);
    await cancelMatch();
  }

  async function makeInvite() {
    setInviting(true);
    setError(null);
    const r = await createInvite(mode, "random");
    setInviting(false);
    if (!r.ok) setError(r.message);
    else setInvite({ url: `${origin}/app/play/join/${r.code}`, gameId: r.gameId });
  }

  const seg = (on: boolean) =>
    cn(
      "flex flex-col items-start rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
      on ? "border-gold bg-accent" : "border-border bg-card hover:border-border-strong",
    );

  const yourTurn = games.filter((g) => g.status === "active" && liveTurnLabel(g, meId) === "Your move");

  return (
    <div className="flex flex-col gap-6">
      <OnlineCount userId={meId} />

      {games.length > 0 && (
        <section aria-labelledby="ongoing-h" className="flex flex-col gap-2">
          <h2 id="ongoing-h" className="text-lg font-semibold">
            Your games {yourTurn.length > 0 && <Badge variant="gold">{yourTurn.length} waiting for you</Badge>}
          </h2>
          <ul className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
            {games.map((g) => (
              <li key={g.id} className="border-b border-border last:border-0">
                <Link href={`/app/play/live/${g.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{g.opponent ? `vs ${g.opponent}` : "Invite: waiting for a friend"}</span>
                    <span className="text-xs text-muted-foreground">
                      {LIVE_MODES[g.mode].label} · {g.moves.length} {g.moves.length === 1 ? "move" : "moves"}
                    </span>
                  </span>
                  <Badge variant={liveTurnLabel(g, meId) === "Your move" ? "gold" : "default"}>{liveTurnLabel(g, meId)}</Badge>
                  <ChevronRight className="size-4 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-sm font-semibold">Time control</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(LIVE_MODES) as LiveMode[]).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} disabled={searching} className={seg(mode === m)} onClick={() => setMode(m)}>
              <span className="font-semibold">{LIVE_MODES[m].label}</span>
              <span className="text-xs text-muted-foreground">{LIVE_MODES[m].detail}</span>
            </button>
          ))}
        </div>
        {mode === "daily" && (
          <p className="text-xs text-muted-foreground">One move a day. Made for commutes and weak connections: play whenever you have a minute.</p>
        )}
      </fieldset>

      {searching ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-gold/50 bg-accent p-5" data-testid="searching">
          <p className="flex items-center gap-2 font-semibold">
            <Loader2 className="size-4 animate-spin" /> Looking for an opponent near your rating… <span className="num text-muted-foreground">{seconds}s</span>
          </p>
          {seconds >= 20 && (
            <p className="text-sm text-muted-foreground">
              It’s quiet right now. Keep waiting, send a friend a link, or{" "}
              <Link href="/app/play?tab=computer" className="font-semibold text-accent-foreground underline">
                play the computer
              </Link>{" "}
              meanwhile.
            </p>
          )}
          <Button variant="secondary" size="sm" className="w-fit" onClick={stopSearch}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" onClick={search} data-testid="find-opponent" className="sm:flex-1">
            <Search /> Find an opponent
          </Button>
          <Button size="lg" variant="secondary" onClick={makeInvite} disabled={inviting} data-testid="invite-friend" className="sm:flex-1">
            <UserPlus /> {inviting ? "Creating link…" : "Challenge a friend"}
          </Button>
        </div>
      )}

      {invite && (
        <div className="flex flex-col gap-3">
          <InviteShare url={invite.url} />
          <Button asChild variant="ghost" size="sm" className="w-fit">
            <Link href={`/app/play/live/${invite.gameId}`}>Open the game board</Link>
          </Button>
        </div>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <p className="text-xs text-faint">
        Games against people are rated. Be respectful: Sankofa has no chat yet, by design, so every game is about the moves.
      </p>
    </div>
  );
}

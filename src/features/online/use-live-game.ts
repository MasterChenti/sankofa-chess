"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { LiveGame } from "@/types/database";

/**
 * Keeps a live game in sync: Supabase Realtime for instant updates, plus a light
 * polling fallback so the game still works on weak or interrupted mobile connections.
 */
export function useLiveGame(initial: LiveGame) {
  const [game, setGame] = React.useState<LiveGame>(initial);
  const [connected, setConnected] = React.useState<"live" | "polling">("polling");
  const supabase = React.useMemo(() => createClient(), []);

  const accept = React.useCallback((next: LiveGame | null | undefined) => {
    if (!next) return;
    setGame((cur) => {
      if (next.id !== cur.id) return cur;
      // Never go backwards: a newer ply or a status change wins.
      if (next.ply < cur.ply) return cur;
      if (next.ply === cur.ply && next.status === cur.status && next.updated_at <= cur.updated_at && next.draw_offer_by === cur.draw_offer_by) return cur;
      return next;
    });
  }, []);

  const refresh = React.useCallback(async () => {
    const { data } = await supabase.from("live_games").select("*").eq("id", initial.id).maybeSingle();
    accept(data as LiveGame | null);
  }, [supabase, initial.id, accept]);

  React.useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`live-game-${initial.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_games", filter: `id=eq.${initial.id}` }, (payload) =>
          accept(payload.new as LiveGame),
        )
        .subscribe((status) => setConnected(status === "SUBSCRIBED" ? "live" : "polling"));
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, initial.id, accept]);

  // Polling fallback: frequent while a fast game is running, gentle for daily chess or when realtime is healthy.
  React.useEffect(() => {
    if (game.status === "finished" || game.status === "aborted") return;
    const fast = game.mode !== "daily";
    const ms = connected === "live" ? (fast ? 8000 : 60000) : fast ? 2000 : 20000;
    const t = window.setInterval(() => void refresh(), ms);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [game.status, game.mode, connected, refresh]);

  return { game, accept, refresh, connected };
}

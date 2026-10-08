"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Real presence: counts people with Sankofa open right now (Supabase Realtime presence).
 * We never show an invented number.
 */
export function useOnlineCount(userId: string) {
  const [count, setCount] = React.useState<number | null>(null);
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("presence:sankofa", { config: { presence: { key: userId } } });
    channel
      .on("presence", { event: "sync" }, () => setCount(Object.keys(channel.presenceState()).length))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ at: Date.now() });
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
  return count;
}

export function OnlineCount({ userId, className }: { userId: string; className?: string }) {
  const count = useOnlineCount(userId);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", className)} data-testid="online-count">
      <span className={cn("size-2 rounded-full", count && count > 1 ? "bg-success" : "bg-faint")} aria-hidden />
      {count == null
        ? "Checking who’s online…"
        : count > 1
          ? `${count} players online now`
          : "You’re the first one here right now. Invite a friend."}
    </span>
  );
}

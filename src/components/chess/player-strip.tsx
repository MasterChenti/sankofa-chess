"use client";

import { PieceSvg, type PieceCode } from "@/components/brand/pieces";
import { cn } from "@/lib/utils";

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const ORDER = ["q", "r", "b", "n", "p"];

export function formatClock(ms: number | null) {
  if (ms == null) return "∞";
  const t = Math.max(0, ms);
  if (t < 10_000) return (t / 1000).toFixed(1);
  const s = Math.ceil(t / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Name, rating, captured material and clock for one side of the board. */
export function PlayerStrip({
  name,
  rating,
  initial,
  color,
  captured,
  materialLead,
  clockMs,
  active,
  thinking,
}: {
  name: string;
  rating?: number | null;
  initial: string;
  color: "w" | "b";
  /** piece letters this player has captured (opponent's pieces), e.g. ["p","n"] */
  captured: string[];
  materialLead: number;
  clockMs: number | null | undefined;
  active: boolean;
  thinking?: boolean;
}) {
  const oppColor = color === "w" ? "b" : "w";
  const sorted = [...captured].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const low = clockMs != null && clockMs < 20_000;
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-semibold",
          color === "w" ? "bg-ivory text-obsidian" : "bg-obsidian text-ivory ring-1 ring-border-strong",
        )}
        aria-hidden
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {name} {rating ? <span className="num font-medium text-muted-foreground">{rating}</span> : null}
          {thinking && <span className="ml-2 text-xs font-medium text-accent-foreground">thinking…</span>}
        </p>
        <div className="flex h-4 items-center" aria-label={`Captured: ${sorted.length ? sorted.join(", ") : "none"}`}>
          {sorted.map((p, i) => (
            <span key={i} className="-mr-1.5 size-4">
              <PieceSvg code={`${oppColor}${p.toUpperCase()}` as PieceCode} />
            </span>
          ))}
          {materialLead > 0 && <span className="num ml-3 text-xs font-semibold text-muted-foreground">+{materialLead}</span>}
        </div>
      </div>
      {clockMs !== undefined && (
        <span
          role="timer"
          aria-label={`${name} clock`}
          className={cn(
            "num min-w-[5.5rem] rounded-[var(--radius-sm)] px-3 py-1.5 text-right font-display text-xl font-semibold transition-colors",
            active ? "bg-ivory text-obsidian" : "bg-surface-2 text-muted-foreground",
            active && low && "bg-destructive text-destructive-foreground",
          )}
        >
          {formatClock(clockMs)}
        </span>
      )}
    </div>
  );
}

export function materialSummary(capturedByWhite: string[], capturedByBlack: string[]) {
  const w = capturedByWhite.reduce((s, p) => s + (VALUE[p] ?? 0), 0);
  const b = capturedByBlack.reduce((s, p) => s + (VALUE[p] ?? 0), 0);
  return { whiteLead: Math.max(0, w - b), blackLead: Math.max(0, b - w) };
}

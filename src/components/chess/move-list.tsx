"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { MoveClass } from "@/lib/chess/analysis-types";

const CLS_DOT: Record<MoveClass, string> = {
  best: "bg-success",
  good: "bg-success/60",
  inaccuracy: "bg-warning",
  mistake: "bg-[color-mix(in_oklab,var(--warning),var(--destructive))]",
  blunder: "bg-destructive",
};

/** Numbered move list. Click a move to view that position (when onSelect is provided). */
export function MoveList({
  sans,
  activePly,
  onSelect,
  classes,
  className,
  emptyText = "Moves will appear here.",
}: {
  sans: string[];
  activePly?: number | null; // index into sans, -1 = start
  onSelect?: (ply: number) => void;
  classes?: MoveClass[];
  className?: string;
  emptyText?: string;
}) {
  const ref = React.useRef<HTMLOListElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>("[data-active=true]");
    if (active) active.scrollIntoView({ block: "nearest" });
    else if (activePly == null) el.scrollTop = el.scrollHeight;
  }, [sans.length, activePly]);

  if (!sans.length) return <p className={cn("px-1 py-3 text-sm text-faint", className)}>{emptyText}</p>;

  const rows = [];
  for (let i = 0; i < sans.length; i += 2) rows.push(i);

  const cell = (ply: number) => {
    const san = sans[ply];
    if (!san) return <span />;
    const active = activePly === ply;
    const cls = classes?.[ply];
    const content = (
      <>
        {cls && <i aria-hidden className={cn("size-2 shrink-0 rounded-full", CLS_DOT[cls])} />}
        <span className="font-notation">{san}</span>
      </>
    );
    return onSelect ? (
      <button
        type="button"
        data-active={active}
        onClick={() => onSelect(ply)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm font-medium hover:bg-surface-3",
          active && "bg-accent text-accent-foreground",
        )}
      >
        {content}
      </button>
    ) : (
      <span data-active={active} className={cn("flex items-center gap-1.5 px-2 py-1 text-sm font-medium", active && "text-accent-foreground")}>
        {content}
      </span>
    );
  };

  return (
    <ol ref={ref} className={cn("max-h-64 overflow-y-auto rounded-[var(--radius-md)] bg-background-2 p-1.5", className)} aria-label="Moves">
      {rows.map((ply) => (
        <li key={ply} className="grid grid-cols-[2.2rem_1fr_1fr] items-center">
          <span className="num pl-2 text-xs text-faint">{ply / 2 + 1}.</span>
          {cell(ply)}
          {cell(ply + 1)}
        </li>
      ))}
    </ol>
  );
}

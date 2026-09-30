"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { PlyAnalysis } from "@/lib/chess/analysis-types";

/** Advantage over the game (White's perspective). Tap a point to jump to that move. */
export function EvalGraph({
  plies,
  activePly,
  onSelect,
  keyPly,
  className,
}: {
  plies: PlyAnalysis[];
  activePly: number | null;
  onSelect: (ply: number) => void;
  keyPly?: number | null;
  className?: string;
}) {
  const W = 600;
  const H = 120;
  const n = plies.length;
  if (!n) return null;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (ev: number) => {
    const v = Math.max(-1000, Math.min(1000, ev));
    // soft scale so small edges are visible and big ones don't dominate
    const s = Math.sign(v) * Math.sqrt(Math.abs(v) / 1000);
    return H / 2 - s * (H / 2 - 6);
  };
  const pts = plies.map((p, i) => `${x(i).toFixed(1)},${y(p.evalWhite).toFixed(1)}`);
  const area = `M0,${H / 2} L${pts.join(" L")} L${W},${H / 2} Z`;

  return (
    <figure className={cn("rounded-[var(--radius-md)] bg-background-2 p-2", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-28 w-full cursor-pointer"
        preserveAspectRatio="none"
        role="img"
        aria-label="Advantage graph. Above the line favours White."
        onClick={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
          onSelect(Math.max(0, Math.min(n - 1, i)));
        }}
      >
        <rect x="0" y="0" width={W} height={H / 2} fill="var(--ivory)" opacity="0.08" />
        <path d={area} fill="var(--ivory)" opacity="0.28" />
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--border-strong)" strokeWidth="1" />
        <polyline points={pts.join(" ")} fill="none" stroke="var(--gold)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {keyPly != null && keyPly < n && (
          <circle cx={x(keyPly)} cy={y(plies[keyPly].evalWhite)} r="5" fill="var(--destructive)" vectorEffect="non-scaling-stroke" />
        )}
        {activePly != null && activePly < n && (
          <line x1={x(activePly)} x2={x(activePly)} y1="0" y2={H} stroke="var(--foreground)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.6" />
        )}
      </svg>
      <figcaption className="px-1 pt-1.5 text-xs text-muted-foreground">Advantage over the game. Above the line favours White. Tap to jump.</figcaption>
    </figure>
  );
}

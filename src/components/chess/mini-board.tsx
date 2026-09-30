import { parseFenBoard } from "@/lib/chess/fen";
import { PieceGlyph, type PieceCode } from "@/components/brand/pieces";
import { cn } from "@/lib/utils";

/** Static, server-renderable board preview (lists, cards, story art). */
export function MiniBoard({
  fen,
  flip = false,
  className,
  label = "Chess position",
}: {
  fen: string;
  flip?: boolean;
  className?: string;
  label?: string;
}) {
  const board = parseFenBoard(fen);
  return (
    <svg viewBox="0 0 360 360" className={cn("block w-full rounded-[6px]", className)} role="img" aria-label={label}>
      {Array.from({ length: 64 }, (_, i) => {
        const vi = flip ? 63 - i : i;
        const r = Math.floor(i / 8);
        const f = i % 8;
        const p = board[vi];
        return (
          <g key={i} transform={`translate(${f * 45} ${r * 45})`}>
            <rect width="45" height="45" fill={(r + f) % 2 ? "var(--sq-dark)" : "var(--sq-light)"} />
            {p && <PieceGlyph code={p as PieceCode} />}
          </g>
        );
      })}
    </svg>
  );
}

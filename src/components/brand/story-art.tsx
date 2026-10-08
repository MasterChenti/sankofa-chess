import { Armchair, Bone, BookOpen, BrickWall, Coins, Handshake, ScrollText, Shield, Swords, TreePine, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { PieceSvg } from "@/components/brand/pieces";
import { MiniBoard } from "@/components/chess/mini-board";
import { START_FEN } from "@/lib/chess/fen";

/** Simple line symbols for stories that don't have a bespoke drawing. */
const LINE: Record<string, LucideIcon> = {
  stool: Armchair,
  shield: Shield,
  coin: Coins,
  book: BookOpen,
  wall: BrickWall,
  horns: Swords,
  seat: Handshake,
  scroll: ScrollText,
  bone: Bone,
  tree: TreePine,
};

/** Editorial art for Sankofa Stories — one restrained symbol per story. */
export function StoryArt({ symbol, className }: { symbol: string | null; className?: string }) {
  const Line = symbol ? LINE[symbol] : undefined;
  if (Line) return <Line className={className} strokeWidth={1.25} aria-hidden />;
  switch (symbol) {
    case "knight":
      return <PieceSvg code="wN" className={className} />;
    case "sankofa":
      return <LogoMark className={className} egg="var(--ivory)" />;
    case "nyansapo":
      return (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.2" className={className} aria-hidden>
          <rect x="18" y="4" width="28" height="28" rx="14" />
          <rect x="18" y="32" width="28" height="28" rx="14" />
          <rect x="4" y="18" width="28" height="28" rx="14" />
          <rect x="32" y="18" width="28" height="28" rx="14" />
        </svg>
      );
    case "oware":
      return (
        <svg viewBox="0 0 120 50" fill="none" stroke="currentColor" strokeWidth="2.4" className={className} aria-hidden>
          <rect x="2" y="2" width="116" height="46" rx="23" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i}>
              <circle cx={18 + i * 16.8} cy="16" r="6.5" />
              <circle cx={18 + i * 16.8} cy="34" r="6.5" />
            </g>
          ))}
        </svg>
      );
    case "crown":
      return <PieceSvg code="wQ" className={className} />;
    case "arabian":
      return <MiniBoard fen="7k/7R/5N2/8/8/8/8/6K1 b - - 0 1" className={className} label="The Arabian mate" />;
    case "board":
    default:
      return <MiniBoard fen={START_FEN} className={className} label="A chessboard" />;
  }
}

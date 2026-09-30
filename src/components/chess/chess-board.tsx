"use client";

import * as React from "react";
import { Chessboard, type PieceRenderObject } from "react-chessboard";
import { Chess, type Square } from "chess.js";
import { PIECE_CODES, PieceSvg, type PieceCode } from "@/components/brand/pieces";
import { cn } from "@/lib/utils";

export type BoardArrow = { from: string; to: string; color?: string };

export type ChessBoardProps = {
  id?: string;
  fen: string;
  orientation?: "white" | "black";
  /** Which side the user may move. */
  movable?: "w" | "b" | "both" | "none";
  /** Return true if the move was accepted (the parent then updates `fen`). */
  onMove?: (uci: string) => boolean | Promise<boolean>;
  lastMove?: { from: string; to: string } | null;
  hintSquares?: string[];
  extraSquareStyles?: Record<string, React.CSSProperties>;
  arrows?: BoardArrow[];
  showCoordinates?: boolean;
  className?: string;
  label?: string;
};

const pieces: PieceRenderObject = Object.fromEntries(
  PIECE_CODES.map((code) => [code, (props?: { svgStyle?: React.CSSProperties }) => <PieceSvg code={code} style={props?.svgStyle} />]),
) as PieceRenderObject;

const DOT = "radial-gradient(circle, var(--sq-dot) 21%, transparent 23%)";
const RING = "radial-gradient(circle, transparent 58%, var(--sq-dot) 60%, var(--sq-dot) 76%, transparent 78%)";

/**
 * The Sankofa board: react-chessboard for rendering + drag, with our own
 * tap-to-move, legal-move dots, check glow, last-move trail and promotion picker.
 */
export function ChessBoard({
  id = "sankofa-board",
  fen,
  orientation = "white",
  movable = "none",
  onMove,
  lastMove,
  hintSquares = [],
  extraSquareStyles,
  arrows = [],
  showCoordinates = true,
  className,
  label = "Chess board",
}: ChessBoardProps) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [promotion, setPromotion] = React.useState<{ from: string; to: string; color: "w" | "b" } | null>(null);

  const game = React.useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return null;
    }
  }, [fen]);

  React.useEffect(() => {
    setSelected(null);
    setPromotion(null);
  }, [fen]);

  const turn = game?.turn() ?? "w";
  const canMoveSide = (color: string) => movable === "both" || movable === color;
  const interactive = Boolean(game && onMove && movable !== "none" && canMoveSide(turn) && !game.isGameOver());

  const targets = React.useMemo(() => {
    if (!game || !selected) return [] as { to: string; capture: boolean; promo: boolean }[];
    return game.moves({ square: selected as Square, verbose: true }).map((m) => ({
      to: m.to as string,
      capture: Boolean(m.captured),
      promo: Boolean(m.promotion),
    }));
  }, [game, selected]);

  const checkSquare = React.useMemo(() => {
    if (!game || !game.inCheck()) return null;
    for (const row of game.board()) for (const sq of row) if (sq && sq.type === "k" && sq.color === game.turn()) return sq.square;
    return null;
  }, [game]);

  const attempt = React.useCallback(
    async (from: string, to: string, promo?: string) => {
      if (!game || !onMove) return false;
      const legal = game.moves({ square: from as Square, verbose: true }).filter((m) => m.to === to);
      if (!legal.length) return false;
      if (legal.some((m) => m.promotion) && !promo) {
        setPromotion({ from, to, color: game.turn() });
        return false;
      }
      setSelected(null);
      return await onMove(from + to + (promo ?? ""));
    },
    [game, onMove],
  );

  const onSquareClick = React.useCallback(
    ({ square, piece }: { square: string; piece: { pieceType: string } | null }) => {
      if (!interactive || promotion) return;
      if (selected && targets.some((t) => t.to === square)) {
        void attempt(selected, square);
        return;
      }
      if (piece && piece.pieceType[0] === turn) {
        setSelected(square === selected ? null : square);
        return;
      }
      setSelected(null);
    },
    [interactive, promotion, selected, targets, attempt, turn],
  );

  const squareStyles = React.useMemo(() => {
    const s: Record<string, React.CSSProperties> = {};
    const add = (sq: string, style: React.CSSProperties) => {
      s[sq] = { ...(s[sq] ?? {}), ...style };
    };
    if (lastMove) {
      add(lastMove.from, { backgroundColor: "var(--sq-last)" });
      add(lastMove.to, { backgroundColor: "var(--sq-last)" });
    }
    hintSquares.forEach((sq) => add(sq, { backgroundColor: "var(--sq-hint)" }));
    if (checkSquare) add(checkSquare, { background: "radial-gradient(circle, var(--sq-check) 0%, transparent 72%)" });
    if (selected) add(selected, { backgroundColor: "var(--sq-selected)" });
    targets.forEach((t) => add(t.to, { backgroundImage: t.capture ? RING : DOT, cursor: "pointer" }));
    if (extraSquareStyles) Object.entries(extraSquareStyles).forEach(([sq, st]) => add(sq, st));
    return s;
  }, [lastMove, hintSquares, checkSquare, selected, targets, extraSquareStyles]);

  const promoFile = promotion ? "abcdefgh".indexOf(promotion.to[0]) : 0;
  const promoLeftPct = ((orientation === "white" ? promoFile : 7 - promoFile) * 100) / 8;
  const promoFromTop = promotion ? (promotion.to[1] === "8") === (orientation === "white") : true;

  return (
    <div
      className={cn(
        "relative w-full select-none overflow-hidden rounded-[10px] bg-[var(--board-frame)] p-[3px] shadow-float",
        className,
      )}
      role="group"
      aria-label={label}
      data-testid="chess-board"
      data-fen={fen}
    >
      <div className="overflow-hidden rounded-[7px]">
        <Chessboard
          options={{
            id,
            position: fen,
            boardOrientation: orientation,
            pieces,
            showNotation: showCoordinates,
            animationDurationInMs: 170,
            allowDragging: interactive,
            allowDrawingArrows: false,
            dragActivationDistance: 6,
            arrows: arrows.map((a) => ({ startSquare: a.from, endSquare: a.to, color: a.color ?? "rgba(143,191,122,.85)" })),
            canDragPiece: ({ piece }) => interactive && piece.pieceType[0] === turn,
            onPieceDrag: ({ square }) => {
              if (square) setSelected(square);
            },
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!targetSquare || sourceSquare === targetSquare) return false;
              if (!game) return false;
              const legal = game.moves({ square: sourceSquare as Square, verbose: true }).filter((m) => m.to === targetSquare);
              if (!legal.length) {
                setSelected(null);
                return false;
              }
              void attempt(sourceSquare, targetSquare);
              // Promotion waits for the picker; normal moves animate immediately.
              return !legal.some((m) => m.promotion);
            },
            onSquareClick,
            squareStyles,
            darkSquareStyle: { backgroundColor: "var(--sq-dark)" },
            lightSquareStyle: { backgroundColor: "var(--sq-light)" },
            dropSquareStyle: { boxShadow: "inset 0 0 0 3px var(--gold)" },
            darkSquareNotationStyle: { color: "var(--sq-light)", fontWeight: 700, opacity: 0.85 },
            lightSquareNotationStyle: { color: "var(--sq-dark)", fontWeight: 700, opacity: 0.85 },
            alphaNotationStyle: { fontSize: "10px", position: "absolute", bottom: 1, right: 3, userSelect: "none" },
            numericNotationStyle: { fontSize: "10px", position: "absolute", top: 1, left: 3, userSelect: "none" },
          }}
        />
      </div>

      {promotion && (
        <div className="absolute inset-0 z-20 bg-black/45" onClick={() => setPromotion(null)}>
          <div
            role="dialog"
            aria-label="Choose a piece to promote to"
            className="absolute flex w-[12.5%] flex-col overflow-hidden rounded-md bg-ivory shadow-float"
            style={{ left: `${promoLeftPct}%`, ...(promoFromTop ? { top: 3 } : { bottom: 3 }), flexDirection: promoFromTop ? "column" : "column-reverse" }}
            onClick={(e) => e.stopPropagation()}
          >
            {(["q", "r", "b", "n"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className="aspect-square w-full p-[8%] hover:bg-gold/40 focus-visible:bg-gold/40"
                aria-label={`Promote to ${{ q: "queen", r: "rook", b: "bishop", n: "knight" }[p]}`}
                onClick={() => {
                  const pr = promotion;
                  setPromotion(null);
                  void attempt(pr.from, pr.to, p);
                }}
              >
                <PieceSvg code={`${promotion.color}${p.toUpperCase()}` as PieceCode} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

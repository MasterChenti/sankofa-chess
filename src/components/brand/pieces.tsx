import * as React from "react";

/**
 * Sankofa piece set — geometric silhouettes designed for small mobile squares.
 * Colours come from CSS tokens (--pw-*, --pb-*) so pieces follow the theme.
 */
export type PieceCode = "wP" | "wN" | "wB" | "wR" | "wQ" | "wK" | "bP" | "bN" | "bB" | "bR" | "bQ" | "bK";
export const PIECE_CODES: PieceCode[] = ["wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK"];

function Shape({ type, detail }: { type: string; detail: string }) {
  switch (type) {
    case "P":
      return (
        <>
          <circle cx="22.5" cy="12.8" r="5.3" />
          <rect x="16.5" y="18.6" width="12" height="3.2" rx="1.6" />
          <path d="M17.6 21.8c0 5.4-2 9.4-3.6 13.7h17c-1.6-4.3-3.6-8.3-3.6-13.7z" />
        </>
      );
    case "R":
      return (
        <>
          <path d="M13.5 8.6h4.2v3.2h3v-3.2h3.6v3.2h3v-3.2h4.2v8.4l-2.6 2.1H16.1l-2.6-2.1z" />
          <path d="M16.2 19.1h12.6l1.5 16.4H14.7z" />
        </>
      );
    case "B":
      return (
        <>
          <circle cx="22.5" cy="5.6" r="2.2" />
          <path d="M22.5 8.2c5.2 3.6 7.8 8.8 5.2 13.9H17.3c-2.6-5.1 0-10.3 5.2-13.9z" />
          <rect x="16" y="22.1" width="13" height="3.1" rx="1.55" />
          <path d="M18 25.2c0 4-1.5 7-3 10.3h15c-1.5-3.3-3-6.3-3-10.3z" />
          <path d="M24.8 12.3 21 17.2" stroke={detail} fill="none" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case "N":
      return (
        <>
          <path d="M15 35.5c.5-5.5 3.5-8.5 6.5-11-2.5 0-6.5 1-9-.1-2.6-1-3-3.4-2-5.4l5-7.5 1-4.5 3 2.5c8-1.5 14 4.5 13.5 14.5l-1 11.5z" />
          <circle cx="16.6" cy="14.6" r="1.15" fill={detail} stroke="none" />
          <path d="M24 11.4c4.4 2.6 6.4 7.6 6 14.6" stroke={detail} fill="none" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
        </>
      );
    case "Q":
      return (
        <>
          <circle cx="9.3" cy="11.8" r="2.2" />
          <circle cx="16" cy="8.8" r="2.2" />
          <circle cx="22.5" cy="7.4" r="2.2" />
          <circle cx="29" cy="8.8" r="2.2" />
          <circle cx="35.7" cy="11.8" r="2.2" />
          <path d="M10 13.4 14.3 26h16.4L35 13.4l-5.8 6.4-.7-9.3-4.4 8.8-1.6-9.2-1.6 9.2-4.4-8.8-.7 9.3z" />
          <rect x="13.6" y="26" width="17.8" height="3.1" rx="1.55" />
          <path d="M15.6 29.1 14 35.5h17l-1.6-6.4z" />
        </>
      );
    case "K":
    default:
      return (
        <>
          <path d="M21.3 2.8h2.4v3.4h3.1v2.4h-3.1v3.6h-2.4V8.6h-3.1V6.2h3.1z" />
          <path d="M13.1 22.6c-3.1-6.6 3.4-11.1 9.4-6.6 6-4.5 12.5 0 9.4 6.6z" />
          <rect x="13.6" y="22.6" width="17.8" height="3.1" rx="1.55" />
          <path d="M15.6 25.7 14 35.5h17l-1.6-9.8z" />
        </>
      );
  }
}

/** Piece shapes as an SVG <g>, for composing into larger SVGs (mini boards). */
export function PieceGlyph({ code }: { code: PieceCode }) {
  const white = code[0] === "w";
  const fill = white ? "var(--pw-fill)" : "var(--pb-fill)";
  const stroke = white ? "var(--pw-stroke)" : "var(--pb-stroke)";
  return (
    <g fill={fill} stroke={stroke} strokeWidth={white ? 1.5 : 1.15} strokeLinejoin="round">
      <Shape type={code[1]} detail={stroke} />
      <rect x="10" y="35.5" width="25" height="4.6" rx="1.8" />
    </g>
  );
}

export function PieceSvg({ code, className, style }: { code: PieceCode; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" className={className} style={style} aria-hidden="true">
      <PieceGlyph code={code} />
    </svg>
  );
}

export const PIECE_NAMES: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

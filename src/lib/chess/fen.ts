/** Minimal FEN helpers that don't need chess.js — safe for server components. */
export type BoardArray = (string | null)[]; // 64 entries, a8..h1, e.g. "wN"

export function parseFenBoard(fen: string): BoardArray {
  const rows = fen.split(" ")[0].split("/");
  const out: BoardArray = [];
  for (const row of rows) {
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) out.push(null);
      else out.push((ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase());
    }
  }
  return out;
}

export function sideToMove(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function squareName(index: number): string {
  return "abcdefgh"[index % 8] + (8 - Math.floor(index / 8));
}

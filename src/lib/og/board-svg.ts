/**
 * A chess position as a standalone SVG string, for generated images (link previews, share cards).
 * Same shapes as the in-app piece set (src/components/brand/pieces.tsx), with fixed colours,
 * because image renderers can't read CSS variables.
 */

const LIGHT = "#e8dbc0";
const DARK = "#735039";
const WHITE = { fill: "#fbf6ea", stroke: "#241913", width: 1.5 };
const BLACK = { fill: "#1e1613", stroke: "#c9b48a", width: 1.15 };

function shape(type: string, detail: string): string {
  switch (type) {
    case "p":
      return `<circle cx="22.5" cy="12.8" r="5.3"/><rect x="16.5" y="18.6" width="12" height="3.2" rx="1.6"/><path d="M17.6 21.8c0 5.4-2 9.4-3.6 13.7h17c-1.6-4.3-3.6-8.3-3.6-13.7z"/>`;
    case "r":
      return `<path d="M13.5 8.6h4.2v3.2h3v-3.2h3.6v3.2h3v-3.2h4.2v8.4l-2.6 2.1H16.1l-2.6-2.1z"/><path d="M16.2 19.1h12.6l1.5 16.4H14.7z"/>`;
    case "b":
      return `<circle cx="22.5" cy="5.6" r="2.2"/><path d="M22.5 8.2c5.2 3.6 7.8 8.8 5.2 13.9H17.3c-2.6-5.1 0-10.3 5.2-13.9z"/><rect x="16" y="22.1" width="13" height="3.1" rx="1.55"/><path d="M18 25.2c0 4-1.5 7-3 10.3h15c-1.5-3.3-3-6.3-3-10.3z"/><path d="M24.8 12.3 21 17.2" stroke="${detail}" fill="none" stroke-width="1.6" stroke-linecap="round"/>`;
    case "n":
      return `<path d="M15 35.5c.5-5.5 3.5-8.5 6.5-11-2.5 0-6.5 1-9-.1-2.6-1-3-3.4-2-5.4l5-7.5 1-4.5 3 2.5c8-1.5 14 4.5 13.5 14.5l-1 11.5z"/><circle cx="16.6" cy="14.6" r="1.15" fill="${detail}" stroke="none"/><path d="M24 11.4c4.4 2.6 6.4 7.6 6 14.6" stroke="${detail}" fill="none" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`;
    case "q":
      return `<circle cx="9.3" cy="11.8" r="2.2"/><circle cx="16" cy="8.8" r="2.2"/><circle cx="22.5" cy="7.4" r="2.2"/><circle cx="29" cy="8.8" r="2.2"/><circle cx="35.7" cy="11.8" r="2.2"/><path d="M10 13.4 14.3 26h16.4L35 13.4l-5.8 6.4-.7-9.3-4.4 8.8-1.6-9.2-1.6 9.2-4.4-8.8-.7 9.3z"/><rect x="13.6" y="26" width="17.8" height="3.1" rx="1.55"/><path d="M15.6 29.1 14 35.5h17l-1.6-6.4z"/>`;
    default:
      return `<path d="M21.3 2.8h2.4v3.4h3.1v2.4h-3.1v3.6h-2.4V8.6h-3.1V6.2h3.1z"/><path d="M13.1 22.6c-3.1-6.6 3.4-11.1 9.4-6.6 6-4.5 12.5 0 9.4 6.6z"/><rect x="13.6" y="22.6" width="17.8" height="3.1" rx="1.55"/><path d="M15.6 25.7 14 35.5h17l-1.6-9.8z"/>`;
  }
}

/** Piece placement from a FEN as an 8×8 grid, rank 8 first. Invalid input yields an empty board. */
export function fenGrid(fen: string): (string | null)[][] {
  const rows = (fen.split(" ")[0] ?? "").split("/");
  if (rows.length !== 8) return Array.from({ length: 8 }, () => Array(8).fill(null));
  return rows.map((row) => {
    const out: (string | null)[] = [];
    for (const ch of row) {
      if (/[1-8]/.test(ch)) for (let i = 0; i < Number(ch); i++) out.push(null);
      else if (/[prnbqkPRNBQK]/.test(ch)) out.push(ch);
    }
    while (out.length < 8) out.push(null);
    return out.slice(0, 8);
  });
}

/** The board as SVG markup (viewBox 0 0 360 360). Flip to show it from Black's side. */
export function boardSvg(fen: string, flip = false): string {
  const grid = fenGrid(fen);
  let squares = "";
  let pieces = "";
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const row = flip ? 7 - r : r;
      const col = flip ? 7 - f : f;
      const x = f * 45;
      const y = r * 45;
      squares += `<rect x="${x}" y="${y}" width="45" height="45" fill="${(row + col) % 2 === 0 ? LIGHT : DARK}"/>`;
      const p = grid[row][col];
      if (p) {
        const white = p === p.toUpperCase();
        const c = white ? WHITE : BLACK;
        pieces += `<g transform="translate(${x} ${y})" fill="${c.fill}" stroke="${c.stroke}" stroke-width="${c.width}" stroke-linejoin="round">${shape(p.toLowerCase(), c.stroke)}<rect x="10" y="35.5" width="25" height="4.6" rx="1.8"/></g>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="360" height="360">${squares}${pieces}</svg>`;
}

/** As a data URI, for <img src> inside generated images. */
export function boardDataUri(fen: string, flip = false): string {
  return `data:image/svg+xml;base64,${Buffer.from(boardSvg(fen, flip)).toString("base64")}`;
}

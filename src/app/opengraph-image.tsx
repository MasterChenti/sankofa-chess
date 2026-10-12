import { ImageResponse } from "next/og";
import { Board, OG, Wordmark } from "@/lib/og/frame";
import { boardDataUri } from "@/lib/og/board-svg";

export const alt = "Sankofa Chess: ten minutes a day to sharpen your mind";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview shown when sankofa-chess links are shared on WhatsApp and elsewhere. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG.bg, padding: 60, gap: 56, alignItems: "center" }}>
        <Board src={boardDataUri("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4")} size={460} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 26 }}>
          <Wordmark size={36} />
          <div style={{ display: "flex", fontSize: 60, lineHeight: 1.05, color: OG.ivory, fontWeight: 700 }}>Learn from the past. Master your next move.</div>
          <div style={{ display: "flex", fontSize: 28, color: OG.muted, lineHeight: 1.35 }}>
            10 minutes a day: a chess position, a true story from African history, a strategic question. Play real people.
          </div>
        </div>
      </div>
    ),
    size,
  );
}

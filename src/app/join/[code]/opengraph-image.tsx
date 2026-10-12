import { ImageResponse } from "next/og";
import { Board, OG, Wordmark } from "@/lib/og/frame";
import { boardDataUri } from "@/lib/og/board-svg";
import { getInvite } from "@/features/online/invite";
import { LIVE_MODES } from "@/lib/chess/live";
import { countryName } from "@/config/countries";
import { START_FEN } from "@/lib/chess/fen";

export const alt = "A chess challenge on Sankofa Chess";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** WhatsApp shows this card under an invite link: who is challenging, and at what speed. */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = await getInvite(code);
  const host = invite?.host;
  const mode = invite ? LIVE_MODES[invite.game.mode] : null;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG.bg, padding: 60, gap: 56, alignItems: "center" }}>
        <Board src={boardDataUri(START_FEN)} size={460} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 22 }}>
          <Wordmark size={32} />
          <div style={{ display: "flex", fontSize: 68, lineHeight: 1.02, color: OG.ivory, fontWeight: 700 }}>
            {host ? `${host.display_name} challenges you.` : "You’ve been challenged."}
          </div>
          {host && (
            <div style={{ display: "flex", fontSize: 30, color: OG.muted }}>
              {countryName(host.country)} · rating {host.rating}
            </div>
          )}
          {mode && (
            <div style={{ display: "flex", fontSize: 30, color: OG.gold }}>
              {mode.label} · {mode.detail}
            </div>
          )}
          <div style={{ display: "flex", marginTop: 10, padding: "16px 28px", background: OG.gold, color: OG.bg, fontSize: 30, fontWeight: 700, borderRadius: 16, alignSelf: "flex-start" }}>
            Tap to accept
          </div>
        </div>
      </div>
    ),
    size,
  );
}

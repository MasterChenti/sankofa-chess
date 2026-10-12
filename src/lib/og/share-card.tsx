import { Board, OG, Wordmark, clip } from "@/lib/og/frame";
import { boardDataUri } from "@/lib/og/board-svg";
import type { ShareCard } from "@/features/share/queries";

/**
 * The daily card for WhatsApp Status / Instagram Stories (1080×1920).
 * It must work as a forwarded image with no caption, so it carries the link in plain text.
 * The owner's own choice stays hidden: that's the reason to tap.
 */
export function StatusCard({ card, linkText }: { card: ShareCard; linkText: string }) {
  const where = [card.story.place, card.story.era].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: OG.bg, padding: "90px 80px", gap: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark size={40} />
        {card.owner.streak > 0 && (
          <div style={{ display: "flex", fontSize: 34, color: OG.gold, fontWeight: 700 }}>{`${card.owner.streak}-day streak`}</div>
        )}
      </div>
      <div style={{ display: "flex", fontSize: 30, letterSpacing: 4, color: OG.gold, marginTop: 30 }}>{`${card.owner.firstName.toUpperCase()}’S DILEMMA TODAY`}</div>
      <div style={{ display: "flex", fontSize: 76, lineHeight: 1.04, color: OG.ivory, fontWeight: 700 }}>{clip(card.story.title, 60)}</div>
      {where && <div style={{ display: "flex", fontSize: 32, color: OG.muted }}>{where}</div>}
      <div style={{ display: "flex", fontSize: 38, lineHeight: 1.35, color: OG.ivory }}>{clip(card.story.excerpt, 150)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, background: OG.panel, border: `3px solid ${OG.gold}`, borderRadius: 28, padding: "34px 38px" }}>
        <div style={{ display: "flex", fontSize: 44, lineHeight: 1.25, color: OG.ivory, fontWeight: 700 }}>{clip(card.story.question, 110)}</div>
        <div style={{ display: "flex", fontSize: 32, color: OG.muted }}>I’ve made my choice. Would you choose the same?</div>
      </div>
      {card.puzzle && (
        <div style={{ display: "flex", gap: 34, alignItems: "center" }}>
          <Board src={boardDataUri(card.puzzle.fen, card.puzzle.fen.split(" ")[1] === "b")} size={330} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            <div style={{ display: "flex", fontSize: 28, color: OG.gold }}>TODAY’S POSITION</div>
            <div style={{ display: "flex", fontSize: 40, color: OG.ivory, fontWeight: 700, lineHeight: 1.15 }}>{clip(card.puzzle.title, 40)}</div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, background: OG.gold, borderRadius: 28, padding: "30px 20px" }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: OG.bg }}>Decide for yourself →</div>
        <div style={{ display: "flex", fontSize: 30, color: OG.bg }}>{linkText}</div>
      </div>
    </div>
  );
}

/** Link preview under a shared card (1200×630). */
export function PreviewCard({ card }: { card: ShareCard }) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: OG.bg, padding: 56, gap: 50, alignItems: "center" }}>
      {card.puzzle && <Board src={boardDataUri(card.puzzle.fen, card.puzzle.fen.split(" ")[1] === "b")} size={430} />}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 20 }}>
        <Wordmark size={30} />
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, color: OG.gold }}>{`${card.owner.firstName.toUpperCase()}’S DILEMMA TODAY`}</div>
        <div style={{ display: "flex", fontSize: 54, lineHeight: 1.05, color: OG.ivory, fontWeight: 700 }}>{clip(card.story.title, 60)}</div>
        <div style={{ display: "flex", fontSize: 30, lineHeight: 1.3, color: OG.muted }}>{clip(card.story.question, 110)}</div>
        <div style={{ display: "flex", marginTop: 8, padding: "14px 26px", background: OG.gold, color: OG.bg, fontSize: 28, fontWeight: 700, borderRadius: 14, alignSelf: "flex-start" }}>
          What would you do?
        </div>
      </div>
    </div>
  );
}

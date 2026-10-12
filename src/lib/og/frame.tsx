/* Shared look for generated images (link previews and share cards). Satori: every multi-child div needs display:flex. */
export const OG = {
  bg: "#0F0F0F",
  panel: "#1A1512",
  gold: "#D4AF37",
  ivory: "#F5F0E6",
  muted: "#B3A894",
  brown: "#4B2E2B",
};

export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.35), color: OG.ivory, fontSize: size, fontWeight: 700 }}>
      <div style={{ display: "flex", width: Math.round(size * 0.8), height: Math.round(size * 0.8), borderRadius: 999, background: OG.gold }} />
      <span>Sankofa Chess</span>
    </div>
  );
}

export function Board({ src, size }: { src: string; size: number }) {
  return (
    <div style={{ display: "flex", padding: Math.round(size * 0.012), background: "#2a1d16", borderRadius: Math.round(size * 0.03) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={size} height={size} style={{ borderRadius: Math.round(size * 0.02) }} alt="" />
    </div>
  );
}

export function clip(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

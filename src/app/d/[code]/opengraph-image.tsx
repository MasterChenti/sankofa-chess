import { ImageResponse } from "next/og";
import { PreviewCard } from "@/lib/og/share-card";
import { getShareCard } from "@/features/share/queries";
import { OG, Wordmark } from "@/lib/og/frame";

export const alt = "A daily dilemma on Sankofa Chess";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const card = await getShareCard(code);
  return new ImageResponse(
    card ? (
      <PreviewCard card={card} />
    ) : (
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG.bg, alignItems: "center", justifyContent: "center" }}>
        <Wordmark size={64} />
      </div>
    ),
    size,
  );
}

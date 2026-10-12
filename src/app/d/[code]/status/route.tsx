import { ImageResponse } from "next/og";
import { StatusCard } from "@/lib/og/share-card";
import { getShareCard } from "@/features/share/queries";
import { siteOrigin } from "@/lib/site";

/** The 1080×1920 image people post to WhatsApp Status / Instagram Stories. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const card = await getShareCard(code);
  if (!card) return new Response("Not found", { status: 404 });
  const linkText = `${(await siteOrigin()).replace(/^https?:\/\//, "")}/d/${code}`;
  return new ImageResponse(<StatusCard card={card} linkText={linkText} />, {
    width: 1080,
    height: 1920,
    headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}

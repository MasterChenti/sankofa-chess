"use client";

import * as React from "react";
import { Download, Image as ImageIcon, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createShareCard, type ShareCardResult } from "@/features/share/actions";

type Ready = Extract<ShareCardResult, { ok: true }> & { file: File | null };

/**
 * "Share my day": a card for WhatsApp Status or Instagram Stories with today's dilemma.
 * Two taps on purpose: the first prepares the image, the second opens the share sheet
 * (iPhone only allows sharing a file straight from a tap, not after a download).
 */
export function ShareDay({ compact = false }: { compact?: boolean }) {
  const [ready, setReady] = React.useState<Ready | null>(null);
  const [pending, start] = React.useTransition();

  function prepare() {
    start(async () => {
      const r = await createShareCard();
      if (!r.ok) {
        toast(r.message);
        return;
      }
      let file: File | null = null;
      try {
        const blob = await (await fetch(r.imageUrl)).blob();
        file = new File([blob], "sankofa-dilemma.png", { type: "image/png" });
      } catch {
        file = null;
      }
      setReady({ ...r, file });
    });
  }

  async function shareImage() {
    if (!ready) return;
    const data: ShareData = { text: ready.text };
    if (ready.file && typeof navigator.canShare === "function" && navigator.canShare({ files: [ready.file] })) data.files = [ready.file];
    else data.url = ready.url;
    try {
      if (navigator.share) await navigator.share(data);
      else window.open(`https://wa.me/?text=${encodeURIComponent(ready.text)}`, "_blank", "noopener");
    } catch {
      /* cancelled */
    }
  }

  async function copyLink() {
    if (!ready) return;
    try {
      await navigator.clipboard.writeText(ready.url);
      toast("Link copied.");
    } catch {
      toast(ready.url);
    }
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-2">
        <Button size={compact ? "default" : "lg"} className="w-fit" onClick={prepare} disabled={pending} data-testid="share-day">
          <Share2 /> {pending ? "Making your card…" : "Share today’s dilemma"}
        </Button>
        {!compact && <p className="text-xs text-muted-foreground">Friends answer the same question, then see what you chose. Your reflection stays private.</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-4" data-testid="share-ready">
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ready.imageUrl} alt="Your card for today" className="h-40 w-auto shrink-0 rounded-[var(--radius-md)] border border-border" />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Your card is ready.</p>
          <p className="text-xs text-muted-foreground">Post it to your WhatsApp Status, or send it to a friend who likes a good argument.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={shareImage} data-testid="share-image">
          <ImageIcon /> Share image
        </Button>
        <Button asChild variant="secondary">
          <a href={`https://wa.me/?text=${encodeURIComponent(ready.text)}`} target="_blank" rel="noopener noreferrer">
            <Share2 /> WhatsApp
          </a>
        </Button>
        <Button asChild variant="ghost">
          <a href={ready.imageUrl} download="sankofa-dilemma.png">
            <Download /> Save
          </a>
        </Button>
        <Button variant="ghost" onClick={copyLink}>
          <Link2 /> Copy link
        </Button>
      </div>
      <a href={ready.url} className="sr-only" data-testid="share-link">
        {ready.url}
      </a>
    </div>
  );
}

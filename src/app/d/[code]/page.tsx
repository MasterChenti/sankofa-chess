import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/brand/logo";
import { StoryArt } from "@/components/brand/story-art";
import { Button } from "@/components/ui/button";
import { getSession } from "@/features/auth/session";
import { getShareCard } from "@/features/share/queries";
import { DilemmaVote } from "@/features/share/components/dilemma-vote";
import { ShareDay } from "@/features/share/components/share-day";
import { logPageEvent } from "@/lib/analytics-server";
import { countryName } from "@/config/countries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const card = await getShareCard(code);
  if (!card) return { title: "Sankofa Chess" };
  const title = `${card.owner.firstName}’s dilemma: ${card.story.title}`;
  const description = `${card.story.question} ${card.owner.firstName} has decided. What would you do?`;
  return { title, description, openGraph: { title, description, type: "article" }, robots: { index: false } };
}

/**
 * The page behind a shared daily card. Public: a friend decides the same dilemma without an account,
 * then sees what the sharer chose and how everyone else answered.
 */
export default async function SharedCardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [card, { user }] = await Promise.all([getShareCard(code), getSession()]);
  if (!card) notFound();
  const isOwner = user?.id === card.owner.id;
  if (!isOwner) await logPageEvent("card_opened", { userId: user?.id ?? null });
  const where = [card.story.place, card.story.era].filter(Boolean).join(" · ");

  return (
    <div className="min-h-dvh">
      <header className="pt-safe mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link href={user ? "/app/today" : "/"} aria-label="Sankofa Chess home">
          <Wordmark />
        </Link>
        {!user && (
          <Button asChild size="sm" variant="secondary">
            <Link href={`/signup?next=${encodeURIComponent(`/d/${code}`)}`}>Join free</Link>
          </Button>
        )}
      </header>
      <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 pb-20 pt-6" data-testid="shared-card">
        <p className="text-sm font-semibold text-accent-foreground">
          {isOwner ? "Your card" : `${card.owner.firstName}’s dilemma today`}
          {card.owner.streak > 0 && <span className="font-normal text-muted-foreground"> · {card.owner.streak}-day streak</span>}
          <span className="font-normal text-muted-foreground"> · {countryName(card.owner.country)}</span>
        </p>
        <div className="flex items-start gap-4">
          <div className="w-14 shrink-0 text-gold">
            <StoryArt symbol={card.story.symbol} className="h-auto w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-[2.1rem] font-semibold leading-[1.05] sm:text-[2.6rem]">{card.story.title}</h1>
            {where && <p className="text-sm text-muted-foreground">{where}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {card.story.context.map((p, i) => (
            <p key={i} className="font-display text-[1.12rem] leading-[1.7] text-foreground/90">
              {p}
            </p>
          ))}
        </div>
        <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-gold/40 bg-accent/30 p-5">
          <h2 className="text-xl font-semibold">{card.story.question}</h2>
          {isOwner ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                This is the page your friends see. They answer first, then find out what you chose
                {card.ownerChoice ? "." : " (you haven’t answered yet: do today’s story)."}
              </p>
              <ShareDay compact />
            </div>
          ) : (
            <DilemmaVote code={code} options={card.story.options} ownerName={card.owner.firstName} signedIn={Boolean(user)} />
          )}
        </section>
        <p className="text-xs text-faint">
          Sankofa Chess: 10 minutes a day. A chess position, a true story from African history, a strategic question. Every story lists its sources.
        </p>
      </main>
    </div>
  );
}

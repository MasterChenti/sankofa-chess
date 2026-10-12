import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { JoinButton } from "@/features/online/components/join-button";
import { getSession } from "@/features/auth/session";
import { getInvite } from "@/features/online/invite";
import { logPageEvent } from "@/lib/analytics-server";
import { LIVE_MODES } from "@/lib/chess/live";
import { countryFlag, countryName } from "@/config/countries";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const invite = await getInvite(code);
  const name = invite?.host?.display_name;
  const title = name ? `${name} challenges you to a game of chess` : "You’ve been challenged";
  const description = invite ? `${LIVE_MODES[invite.game.mode].label} · ${LIVE_MODES[invite.game.mode].detail}. Tap to accept on Sankofa Chess.` : "Sankofa Chess";
  return { title, description, openGraph: { title, description, type: "website" }, robots: { index: false } };
}
export const dynamic = "force-dynamic";

/**
 * The page behind a shared invite link. Public on purpose: a friend without an account
 * sees who challenged them first, then signs up and comes straight back here to accept.
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const here = `/join/${code}`;
  const [{ user, profile }, invite] = await Promise.all([getSession(), getInvite(code)]);
  if (user && profile && !profile.onboarded_at) redirect(`/onboarding?next=${encodeURIComponent(here)}`);

  const h = invite?.host;
  const game = invite?.game;
  const isHost = Boolean(user && game?.created_by === user.id);
  if (game && !isHost) await logPageEvent("invite_opened", { userId: user?.id ?? null, props: { signedIn: Boolean(user) } });

  return (
    <div className="min-h-dvh">
      <header className="pt-safe mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <Link href={user ? "/app/today" : "/"} aria-label="Sankofa Chess home">
          <Wordmark />
        </Link>
      </header>
      <main className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-10 text-center" data-testid="invite-page">
        <LogoMark className="size-14 text-foreground" />
        {!game ? (
          <>
            <h1 className="text-3xl font-semibold">This invite has expired.</h1>
            <p className="text-muted-foreground">Ask your friend to send a new link.</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold">{h ? `${h.display_name} challenges you.` : "You’ve been challenged."}</h1>
            {h && (
              <p className="text-muted-foreground">
                @{h.username} · {countryFlag(h.country)} {countryName(h.country)} · rating {h.rating}
              </p>
            )}
            <p className="text-sm">
              {LIVE_MODES[game.mode].label} · {LIVE_MODES[game.mode].detail} · rated
            </p>
            {game.status !== "waiting" ? (
              <p className="text-sm text-muted-foreground">Someone already accepted this invite.</p>
            ) : isHost ? (
              <>
                <p className="text-sm text-muted-foreground">This is your own invite. Send the link to a friend.</p>
                <Button asChild variant="secondary">
                  <Link href={`/app/play/live/${game.id}`}>Open the game board</Link>
                </Button>
              </>
            ) : user ? (
              <JoinButton code={code} />
            ) : (
              <div className="flex w-full flex-col gap-2">
                <Button asChild size="lg" data-testid="invite-signup">
                  <Link href={`/signup?next=${encodeURIComponent(here)}`}>Create a free account to play</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/login?next=${encodeURIComponent(here)}`}>I already have an account</Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  An account keeps your rating, your games and your reviews. It takes a minute, and you come straight back to this game.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

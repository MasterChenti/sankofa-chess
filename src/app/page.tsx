import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { MiniBoard } from "@/components/chess/mini-board";
import { HeroPuzzle } from "@/components/marketing/hero-puzzle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/features/auth/session";

export const dynamic = "force-dynamic";

const LEARN = [
  { title: "Beginner", body: "How pieces move, check and checkmate, castling, first principles.", count: 6 },
  { title: "Tactics", body: "Forks, pins, skewers, discovered attacks and mating patterns.", count: 6 },
  { title: "Strategy", body: "The centre, development, king safety, pawn structure and space.", count: 6 },
  { title: "Endgame", body: "King and pawn, opposition, and the rook endings you will actually meet.", count: 3 },
];

const STORIES = [
  { title: "Go back and get it", body: "The Akan word behind this platform, and why it fits a game built on memory." },
  { title: "The wisdom knot", body: "Adinkra symbols carry whole ideas in a single shape. One of them describes a strong chess player." },
  { title: "Senterej: chess at the Ethiopian court", body: "Long before online blitz, Ethiopia had its own version of the game." },
];

export default async function LandingPage() {
  let signedIn = false;
  try {
    signedIn = Boolean((await getSession()).user);
  } catch {
    signedIn = false;
  }
  const join = signedIn ? "/app/home" : "/signup";

  return (
    <div className="min-h-dvh">
      <header className="pt-safe sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Sankofa Chess home">
            <Wordmark />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {signedIn ? (
              <Button asChild size="sm">
                <Link href="/app/home">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Join</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="flex flex-col gap-6">
            <h1 className="max-w-[11ch] text-[2.9rem] font-semibold leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-[4.8rem]">
              Learn from the past. Master your next move.
            </h1>
            <p className="max-w-[46ch] text-lg text-muted-foreground">
              Sankofa Chess is a new generation chess platform built around strategy, learning and African heritage.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={signedIn ? "/app/play" : "/signup"}>Play Chess</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={signedIn ? "/app/learn" : "/signup"}>Start Learning</Link>
              </Button>
            </div>
          </div>
          <HeroPuzzle />
        </section>

        {/* Why Sankofa */}
        <section className="border-t border-border bg-background-2">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[5fr_7fr] md:gap-16 lg:py-24">
            <h2 className="text-3xl font-semibold sm:text-4xl">Why Sankofa?</h2>
            <div className="flex flex-col gap-4">
              <p className="font-display text-2xl italic">Every move teaches something.</p>
              <p className="text-lg text-muted-foreground">
                Sankofa is an Akan idea from Ghana: go back and fetch what you left behind. Sankofa Chess turns every game, mistake and challenge into an
                opportunity to think deeper, learn faster and move forward smarter.
              </p>
            </div>
          </div>
        </section>

        {/* Learn */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[5fr_7fr] md:gap-16 lg:py-24">
            <div className="flex flex-col items-start gap-4">
              <h2 className="text-3xl font-semibold sm:text-4xl">Learn with structure</h2>
              <p className="text-muted-foreground">Short, interactive lessons. Read the idea, then play it on the board.</p>
              <Button asChild variant="secondary">
                <Link href={signedIn ? "/app/learn" : "/signup"}>Start Learning</Link>
              </Button>
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {LEARN.map((l) => (
                <li key={l.title} className="flex items-baseline justify-between gap-6 py-5">
                  <div>
                    <h3 className="text-xl font-semibold">{l.title}</h3>
                    <p className="text-sm text-muted-foreground">{l.body}</p>
                  </div>
                  <span className="num shrink-0 text-sm text-faint">{l.count} lessons</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Puzzles */}
        <section className="border-t border-border bg-background-2">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:gap-16 lg:py-24">
            <div className="flex flex-col items-start gap-4">
              <h2 className="text-3xl font-semibold sm:text-4xl">Today’s challenge</h2>
              <p className="text-xl">White to move. Can you find the winning move?</p>
              <p className="text-muted-foreground">A new puzzle every day, from one-move mates to multi-move combinations.</p>
              <Button asChild>
                <Link href={signedIn ? "/app/puzzles/daily" : "/signup"}>Solve Puzzle</Link>
              </Button>
            </div>
            <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[10px] bg-[var(--board-frame)] p-[3px]">
              <MiniBoard fen="r3k3/8/8/1N6/8/8/7P/4K3 w - - 0 1" label="Puzzle preview: white to move" />
            </div>
          </div>
        </section>

        {/* Progress */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <h2 className="text-3xl font-semibold sm:text-4xl">See yourself improve</h2>
            <p className="mt-2 text-muted-foreground">Every game, puzzle and lesson feeds your progress.</p>
            <dl className="mt-8 grid grid-cols-2 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-border [gap:1px] sm:grid-cols-5">
              {[
                ["1,247", "Chess rating"],
                ["76%", "Puzzle accuracy"],
                ["86", "Games played"],
                ["56%", "Win rate"],
                ["6 days", "Learning streak"],
              ].map(([v, l]) => (
                <div key={l} className="bg-card p-5 last:col-span-2 sm:last:col-span-1">
                  <dd className="num font-display text-3xl font-semibold">{v}</dd>
                  <dt className="text-sm text-muted-foreground">{l}</dt>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-faint">Example player profile.</p>
          </div>
        </section>

        {/* Stories */}
        <section className="border-t border-border bg-brown/25">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[5fr_7fr] md:gap-16 lg:py-24">
            <div className="flex flex-col gap-4">
              <LogoMark className="size-14 text-gold" egg="var(--ivory)" />
              <blockquote className="font-display text-3xl italic leading-snug">“It is not wrong to go back for that which you have forgotten.”</blockquote>
              <p className="text-sm text-muted-foreground">Akan proverb behind the word sankofa</p>
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl font-semibold">Sankofa Stories</h2>
              <p className="text-muted-foreground">
                Short reads that connect African philosophy, history and strategic traditions to the way you think at the board.
              </p>
              <ul className="divide-y divide-border border-y border-border">
                {STORIES.map((s) => (
                  <li key={s.title}>
                    <Link href={signedIn ? "/app/stories" : "/signup"} className="group flex items-start justify-between gap-4 py-4">
                      <span>
                        <span className="block font-display text-xl font-semibold group-hover:text-accent-foreground">{s.title}</span>
                        <span className="text-sm text-muted-foreground">{s.body}</span>
                      </span>
                      <ArrowUpRight className="mt-1 size-4 shrink-0 text-faint" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-20 text-center sm:py-28">
            <h2 className="text-4xl font-semibold sm:text-5xl">Your next move starts here.</h2>
            <p className="text-muted-foreground">Rooted in Africa. Open to the world.</p>
            <Button asChild size="lg">
              <Link href={join}>Join Sankofa Chess</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-faint sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Sankofa Chess</span>
          <span>Chess. Strategy. Heritage.</span>
        </div>
      </footer>
    </div>
  );
}

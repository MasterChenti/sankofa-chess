import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { MiniBoard } from "@/components/chess/mini-board";
import { HeroPuzzle } from "@/components/marketing/hero-puzzle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/features/auth/session";

export const dynamic = "force-dynamic";

const RITUAL = [
  { title: "Move", body: "One chess position, chosen for your level. Find the idea, then say why it works.", time: "3 min" },
  { title: "Remember", body: "One true story from African history. You face the decision before you learn what happened.", time: "4 min" },
  { title: "Think", body: "One strategic question with no single right answer. See how strategists weigh each option.", time: "2 min" },
  { title: "Reflect", body: "One sentence on what stayed with you. Then you’re done for the day.", time: "1 min" },
];

const STORIES = [
  { title: "Adwa: the battle won before it was fought", body: "Ethiopia, 1896. What would you prioritise before the decisive battle?" },
  { title: "The Golden Stool", body: "Asante, 1900. A governor asks to sit on a nation’s most sacred object. What would you do?" },
  { title: "Saving the manuscripts of Timbuktu", body: "Mali, 2012. If you were responsible for these libraries, what would you do?" },
];

export default async function LandingPage() {
  let signedIn = false;
  try {
    signedIn = Boolean((await getSession()).user);
  } catch {
    signedIn = false;
  }
  const join = signedIn ? "/app/today" : "/signup";

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
                <Link href="/app/today">Open dashboard</Link>
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
              Ten minutes a day to sharpen your mind: a chess position, a true story from African history, a strategic question, and real opponents
              when you want a game. Then you’re done.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={signedIn ? "/app/today" : "/signup"}>Start today</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={signedIn ? "/app/play?tab=people" : "/signup"}>Play a real person</Link>
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

        {/* The daily session */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[5fr_7fr] md:gap-16 lg:py-24">
            <div className="flex flex-col items-start gap-4">
              <h2 className="text-3xl font-semibold sm:text-4xl">A morning session, not a feed</h2>
              <p className="text-muted-foreground">
                Made for the bus, the tro-tro or the first coffee. It has an end: “You’ve sharpened your mind for today.” Your streak forgives one missed
                day a week, because life happens.
              </p>
              <Button asChild variant="secondary">
                <Link href={join}>Try today’s session</Link>
              </Button>
            </div>
            <ol className="divide-y divide-border border-y border-border">
              {RITUAL.map((l) => (
                <li key={l.title} className="flex items-baseline justify-between gap-6 py-5">
                  <div>
                    <h3 className="text-xl font-semibold">{l.title}</h3>
                    <p className="text-sm text-muted-foreground">{l.body}</p>
                  </div>
                  <span className="num shrink-0 text-sm text-faint">{l.time}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Puzzles */}
        <section className="border-t border-border bg-background-2">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:gap-16 lg:py-24">
            <div className="flex flex-col items-start gap-4">
              <h2 className="text-3xl font-semibold sm:text-4xl">Play people, near and far</h2>
              <p className="text-xl">Real opponents, matched by rating. No bots pretending to be people.</p>
              <p className="text-muted-foreground">
                Blitz and rapid when you have a few minutes. Daily chess, one move a day, when your connection is weak. Challenge a friend with a WhatsApp
                link. After every game, the coach asks what you think went wrong before it tells you.
              </p>
              <Button asChild>
                <Link href={signedIn ? "/app/play?tab=people" : "/signup"}>Find a game</Link>
              </Button>
            </div>
            <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[10px] bg-[var(--board-frame)] p-[3px]">
              <MiniBoard fen="r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4" label="A game in progress: white threatens mate on f7" />
            </div>
          </div>
        </section>

        {/* Progress */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <h2 className="text-3xl font-semibold sm:text-4xl">See yourself improve</h2>
            <p className="mt-2 text-muted-foreground">Your rating, and also how you think: the stories you’ve remembered and the days you’ve sharpened.</p>
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
              <h2 className="text-3xl font-semibold">Stories you live, not read</h2>
              <p className="text-muted-foreground">
                From Great Zimbabwe to Ibn Khaldun, Njinga to Wangari Maathai. Every story is researched, separates fact from tradition, and lists its
                sources.
              </p>
              <ul className="divide-y divide-border border-y border-border">
                {STORIES.map((s) => (
                  <li key={s.title}>
                    <Link href={signedIn ? "/app/discover" : "/signup"} className="group flex items-start justify-between gap-4 py-4">
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

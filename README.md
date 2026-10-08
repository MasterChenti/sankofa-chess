# Sankofa Chess

**Learn from the past. Master your next move.**

The mental arena of Africa: ten minutes a day to sharpen your mind. A chess position, a true story from African history, a strategic question and a one-line reflection, then you’re done. Play real people (or the computer) whenever you want a game, and get a coached review after every one.

Stack: **Next.js 15 (App Router) · TypeScript · React 19 · Tailwind CSS v4 · shadcn/ui (Radix) · Lucide · Supabase (Postgres, Auth, RLS) · chess.js · Stockfish 19 (WASM) · react-chessboard · React Hook Form + Zod · Vitest · Playwright · Vercel**

---

## What’s in the MVP

| Area | Status |
| --- | --- |
| Landing page with a playable hero position | Real |
| Email/password sign-up, login, logout, protected routes | Real (Supabase Auth) |
| Google sign-in | Wired; switch on with `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` once configured in Supabase |
| Onboarding (level → goal → plan) | Real |
| **Today**: a finite daily session, Move → Remember → Think → (Play) → Reflect → “You’ve sharpened your mind for today” | Real. Plan is deterministic per player per day; step status is derived from real records |
| Morning Mode (`/app/today/morning`): one step per screen, single column, light on data | Real |
| **Stories as experiences**: situation → “what would you do?” → what happened → Sankofa lesson → well established vs debated → sources | 17 researched stories across West, East, North, Central, Southern Africa and the diaspora |
| Discover (regions, themes, read marks, curated “today’s story” that rotates regions) | Real. No infinite feed |
| Think: strategic questions (no single right answer), a playful “how you think” mirror | 14 questions. The style mirror is labelled “just for fun”, not psychology |
| **Play real people**: matchmaking by rating (blitz 3+2, rapid 10+0, daily 24 h/move), invite links (WhatsApp share), realtime moves with polling fallback, server clocks, draw/resign/abort, rated results | Real (Supabase Realtime + server actions). Online count is real presence only |
| Coach “think first”: asks what went wrong before revealing | Real |
| Community: Global / Country / Countries (top-5 average) / Friends | Real queries; Friends lists not built yet (invite links work) |
| Healthy streak: forgives one missed day per ISO week | Real |
| Content locales (`stories.locale`, `thoughts.locale`) for Twi, Ga, Ewe, Hausa, Yoruba, Swahili, French, Portuguese, Arabic | Schema ready; only English content exists today |
| Organizations (schools, clubs) | Tables only, no UI yet |
| Play vs computer (3 personas), pass & play, clocks, draw offers, resignation | Real — Stockfish 19 lite in a Web Worker, fallback engine for old devices |
| All chess rules (check, mate, castling, promotion, en passant, draws) | chess.js |
| Post-game review: accuracy, mistakes, biggest lesson (what → why → next), practice position, eval graph | Real — engine layer + deterministic coaching layer |
| AI coach chat | `ChessCoachService`: guided (deterministic) by default; live LLM when `AI_API_KEY` is set |
| Puzzles (11), lessons (21), stories (17), strategic questions (14), challenges (5), achievements (12) | Seeded content in Postgres |
| XP, Sankofa levels, streaks, rating, challenges, achievements | Real, computed server-side |
| Tournaments, clubs UI, friend lists, chat, payments | Not built |

**Mocked / demo on purpose:** the 20 leaderboard players (marked “demo” in Community) and the demo login account are seed data. They never appear in matchmaking. Remove them before a public launch (see *Going live*). Story facts are sourced but need an editorial check before launch.

---

## Architecture

```
Browser ──► Next.js on Vercel ──► Supabase (Postgres + Auth + RLS)
            │  Server Components read with the user's session (RLS applies)
            │  Server Actions validate every progress event, then write with the service role
            └─ Stockfish WASM runs client-side in a Web Worker (play + analysis)
```

- **Never trust the client.** Finished games are replayed move-by-move on the server before they count; puzzle solutions and lesson moves are re-checked server-side; XP, rating and streaks can only change in server code (column-level grants block direct writes).
- **Engine vs coaching.** `src/lib/chess/engine/*` produces engine facts (eval, depth, PV, best move). `src/lib/chess/coaching.ts` turns them into plain language. `src/lib/ai/coach/*` is the provider seam (`guided` / `ai`).
- **Content in the data layer.** `supabase/content/content.ts` is the source of truth; `npm run db:seed:generate` produces `supabase/seed.sql` and the one-paste `supabase/setup.sql`. Unit tests validate every FEN, solution and lesson.

```
src/
  app/                 routes: / (marketing), (auth), onboarding, app/*, api/coach, auth/*
  components/ui        shadcn-style primitives, restyled with Sankofa tokens
  components/chess     board, move list, player strip, eval graph, mini board
  components/brand     logo, piece set, story art
  features/            auth, chess, puzzles, learning, challenges, progress, profile
  lib/                 supabase clients, chess (rules, engine, analysis, coaching), ai/coach, utils
  config/              env, nav, countries, daily proverbs
supabase/              migrations, seed, content, config
e2e/                   Playwright flows
```

---

## Local development

**Prerequisites:** Node.js 20.18+ (22 recommended), npm, Docker (for local Supabase).

```bash
npm install
npm run db:start          # starts local Supabase, applies migrations and seed
npx supabase status       # copy API URL, anon key and service_role key
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm run dev               # http://localhost:3000
```

Demo login (local/staging only): `demo@sankofachess.app` / `sankofa-demo-2026`.

Other commands:

```bash
npm run lint
npm run typecheck
npm test                  # Vitest unit tests
npm run test:e2e          # Playwright (needs local Supabase + a production build: npm run build)
npm run db:reset          # re-apply migrations + seed locally
npm run db:seed:generate  # regenerate seed.sql / setup.sql after editing supabase/content/content.ts
```

---

## Production setup (Supabase + Vercel)

1. **Create a Supabase project** (supabase.com → New project). Region: closest to your players (e.g. `eu-central-1`).
2. **Create the database:** Supabase dashboard → SQL Editor → New query → paste the whole of `supabase/setup.sql` → Run.
   (Developers can instead use `npx supabase link` + `npx supabase db push` and run `supabase/seed.sql`.)
3. **Auth settings:** Authentication → URL Configuration → Site URL = your Vercel URL; add `https://<your-domain>/**` to Redirect URLs. Keep email confirmation ON.
4. **Keys:** Project Settings → API → copy the Project URL, `anon` key and `service_role` key.
5. **Deploy on Vercel:** Import the GitHub repo → Framework: Next.js → add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = your Vercel URL
   - optional `AI_API_KEY` (+ `AI_MODEL`) for the live coach
   → Deploy.
6. **Google sign-in (optional):** create an OAuth client in Google Cloud, add it in Supabase → Authentication → Providers → Google, then set `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` in Vercel and redeploy.

### Upgrading an existing database

When a release adds a migration, the repo ships an idempotent `supabase/upgrade-<name>.sql` (migration + content). Run it in the Supabase SQL Editor **before** deploying the new code. It is safe to run more than once. For phase 2 that file is `supabase/upgrade-phase2_daily_and_online.sql`. Also make sure Realtime is enabled for the project (it is by default).

### Going live checklist
- Delete demo users: `delete from auth.users where email like '%@demo.sankofachess.app' or email = 'demo@sankofachess.app';`
- Editorial review of `STORIES` sources.
- Add self-service account deletion and a privacy policy page.
- Move the coach rate limit to a shared store if traffic grows.

---

## Testing

- **Unit (Vitest):** progression rules, dates/time zones, chess rules (castling, promotion, en passant, mate, stalemate), server-side game verification, puzzle and lesson checking, every seeded FEN/solution, coaching layer.
- **End-to-end (Playwright, mobile viewport):** the full Today session to “sharpened”, two real players by invite link playing to checkmate, matchmaking + abort, discover/think, landing, sign-up validation, sign-up → onboarding → dashboard, logout/login, demo login + leaderboard, full game vs computer → resign → saved → coached review → chat, pass & play checkmate, puzzle wrong → retry → correct, multi-move puzzle, daily progress, lesson completion persisting across reloads, profile and challenges.
- **CI:** `.github/workflows/ci.yml` runs lint, typecheck, unit tests, seed freshness, a local Supabase, the production build and Playwright on every push.

---

## Notes & decisions

- **Date of birth** is not collected — the brief asked to avoid unnecessary personal data, and nothing in the MVP uses it.
- **Stockfish** (GPL-3.0) is served from `public/stockfish` with its licence. The lite single-threaded build (~1.8 MB) loads fast on phones and needs no special headers.
- **Sankofa levels** are progression levels, not official chess titles. Ratings are Sankofa ratings against computer personas, not FIDE ratings.
- **Analytics:** typed event seam in `src/lib/analytics.ts` (no provider, no personal data).

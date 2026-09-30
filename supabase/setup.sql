-- Sankofa Chess: one-paste setup for a NEW Supabase project (SQL Editor → New query → Run).
-- Contains every migration followed by the seed data. Generated — do not edit by hand.

-- ===== 20260930120000_init.sql =====
-- ============================================================
-- Sankofa Chess — initial schema
-- Content is public-read; player data is private to its owner.
-- All progress writes go through validated server actions (service role);
-- players can only edit their own display fields directly.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null,
  country text not null default 'OT' check (country ~ '^[A-Z]{2}$'),
  chess_level text not null default 'beginner' check (chess_level in ('beginner', 'intermediate', 'advanced')),
  goal text check (goal in ('basics', 'tactics', 'strategy', 'tournaments', 'fun')),
  timezone text not null default 'UTC',
  rating integer not null default 800 check (rating between 100 and 3500),
  peak_rating integer not null default 800,
  xp integer not null default 0 check (xp >= 0),
  sankofa_level integer not null default 1 check (sankofa_level between 1 and 7),
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_active_date date,
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  puzzles_solved integer not null default 0,
  puzzle_first_attempts integer not null default 0,
  puzzle_first_correct integer not null default 0,
  puzzle_run integer not null default 0,
  best_puzzle_run integer not null default 0,
  lessons_completed integer not null default 0,
  games_reviewed integer not null default 0,
  is_demo boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_.]{3,20}$'),
  constraint display_name_length check (char_length(display_name) between 1 and 40)
);
create unique index profiles_username_key on public.profiles (lower(username));
create index profiles_rating_idx on public.profiles (rating desc);
create index profiles_country_rating_idx on public.profiles (country, rating desc);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile for every new auth user, from the sign-up metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  lvl text := coalesce(nullif(meta ->> 'chess_level', ''), 'beginner');
  uname text := lower(coalesce(nullif(meta ->> 'username', ''), 'player_' || substr(replace(new.id::text, '-', ''), 1, 8)));
  start_rating integer;
begin
  if lvl not in ('beginner', 'intermediate', 'advanced') then lvl := 'beginner'; end if;
  if uname !~ '^[a-z0-9_.]{3,20}$' then uname := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8); end if;
  -- Username collisions (e.g. Google sign-ups) fall back to a unique generated handle.
  if exists (select 1 from public.profiles p where lower(p.username) = uname) then
    uname := left(uname, 11) || '_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  start_rating := case lvl when 'advanced' then 1600 when 'intermediate' then 1200 else 800 end;
  insert into public.profiles (id, username, display_name, country, chess_level, rating, peak_rating)
  values (
    new.id,
    uname,
    left(coalesce(nullif(meta ->> 'display_name', ''), nullif(meta ->> 'full_name', ''), nullif(split_part(meta ->> 'name', ' ', 1), ''), 'Player'), 40),
    case when (meta ->> 'country') ~ '^[A-Z]{2}$' then meta ->> 'country' else 'OT' end,
    lvl,
    start_rating,
    start_rating
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- content ----------
create table public.puzzles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  hint text,
  fen text not null,
  solution text[] not null check (cardinality(solution) >= 1),
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  category text not null,
  rating integer not null default 1000,
  is_mate boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index puzzles_sort_idx on public.puzzles (sort_order);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('beginner', 'strategy', 'tactics', 'endgame')),
  description text not null,
  content jsonb not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  duration_minutes integer not null default 5,
  order_index integer not null,
  created_at timestamptz not null default now()
);
create index lessons_order_idx on public.lessons (order_index);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  content text not null,
  category text not null,
  symbol text,
  image_url text,
  read_minutes integer not null default 3,
  source text,
  published_at timestamptz not null default now()
);
create index stories_published_idx on public.stories (published_at desc);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  type text not null check (type in ('daily', 'weekly', 'learning', 'strategy')),
  metric text not null check (metric in ('puzzles_solved', 'games_played', 'lessons_completed', 'win_after_lesson')),
  period text not null check (period in ('day', 'week')),
  target integer not null check (target > 0),
  reward_xp integer not null check (reward_xp >= 0),
  href text,
  sort_order integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  requirement jsonb not null,
  sort_order integer not null default 0
);

-- ---------- player data ----------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  white_player_id uuid references public.profiles (id) on delete set null,
  black_player_id uuid references public.profiles (id) on delete set null,
  source text not null check (source in ('vs_computer', 'pass_and_play')),
  opponent_name text not null,
  opponent_rating integer,
  user_color text not null check (user_color in ('w', 'b')),
  result text not null check (result in ('1-0', '0-1', '1/2-1/2')),
  outcome text not null check (outcome in ('win', 'loss', 'draw')),
  termination text not null,
  fen text not null,
  pgn text not null,
  moves text[] not null,
  time_control text not null,
  rated boolean not null default false,
  rating_before integer,
  rating_after integer,
  rating_change integer,
  accuracy integer,
  analysis jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index games_user_created_idx on public.games (user_id, created_at desc);

create table public.puzzle_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  puzzle_id uuid not null references public.puzzles (id) on delete cascade,
  correct boolean not null,
  moves text[] not null default '{}',
  day_key text not null,
  created_at timestamptz not null default now()
);
create index puzzle_attempts_user_idx on public.puzzle_attempts (user_id, created_at desc);
create index puzzle_attempts_user_puzzle_idx on public.puzzle_attempts (user_id, puzzle_id);
create index puzzle_attempts_user_day_idx on public.puzzle_attempts (user_id, day_key) where correct;

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed boolean not null default false,
  progress integer not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create trigger lesson_progress_updated_at before update on public.lesson_progress
  for each row execute function public.set_updated_at();

create table public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  period_key text not null,
  progress integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, challenge_id, period_key)
);
create trigger user_challenges_updated_at before update on public.user_challenges
  for each row execute function public.set_updated_at();

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- Audit trail of every XP award (makes progression explainable and tamper-evident).
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index xp_events_user_idx on public.xp_events (user_id, created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.puzzles enable row level security;
alter table public.lessons enable row level security;
alter table public.stories enable row level security;
alter table public.challenges enable row level security;
alter table public.achievements enable row level security;
alter table public.games enable row level security;
alter table public.puzzle_attempts enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.user_challenges enable row level security;
alter table public.user_achievements enable row level security;
alter table public.xp_events enable row level security;

-- Public content
create policy "Content is readable by everyone" on public.puzzles for select to anon, authenticated using (true);
create policy "Content is readable by everyone" on public.lessons for select to anon, authenticated using (true);
create policy "Content is readable by everyone" on public.stories for select to anon, authenticated using (true);
create policy "Content is readable by everyone" on public.challenges for select to anon, authenticated using (active);
create policy "Content is readable by everyone" on public.achievements for select to anon, authenticated using (true);

-- Profiles: signed-in players can see public player cards (leaderboard); only you can edit yours.
create policy "Players can read profiles" on public.profiles for select to authenticated using (true);
create policy "Players can update their own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Column-level protection: rating, XP, streaks and counters can only change through the server.
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, country, chess_level, timezone) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- Private player data: owner can read. Writes happen only via validated server actions.
create policy "Owners read their games" on public.games for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners read their puzzle attempts" on public.puzzle_attempts for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners read their lesson progress" on public.lesson_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners read their challenge progress" on public.user_challenges for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners read their achievements" on public.user_achievements for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners read their xp events" on public.xp_events for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.games, public.puzzle_attempts, public.lesson_progress,
  public.user_challenges, public.user_achievements, public.xp_events from anon, authenticated;
revoke insert, update, delete on public.puzzles, public.lessons, public.stories, public.challenges,
  public.achievements from anon, authenticated;


-- ===== seed =====
-- Generated by scripts/generate-seed.ts — edit supabase/content/content.ts instead.
begin;

-- Puzzles
insert into public.puzzles (slug, title, description, hint, fen, solution, difficulty, category, rating, is_mate, sort_order) values ('the-oldest-trap', 'The oldest trap', 'Rook and knight working together: the knight protects the rook and seals g8.', 'Your knight already guards two key squares next to the king.', '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1', array['b7h7']::text[], 'beginner', 'Arabian mate', 700, true, 1) on conflict (slug) do update set title = excluded.title, description = excluded.description, hint = excluded.hint, fen = excluded.fen, solution = excluded.solution, difficulty = excluded.difficulty, category = excluded.category, rating = excluded.rating, is_mate = excluded.is_mate, sort_order = excluded.sort_order;
insert into public.puzzles (slug, title, description, hint, fen, solution, difficulty, category, rating, is_mate, sort_order) values ('back-rank', 'Back rank', 'A king with no escape square on the back rank is vulnerable to any rook or queen check.', 'Black’s own pawns are boxing the king in.', '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', array['d1d8']::text[], 'beginner', 'Back-rank mate', 650, true, 2) on conflict (slug) do update set title = excluded.title, description = excluded.description, hint = excluded.hint, fen = excluded.fen, solution = excluded.solution, difficulty = excluded.difficulty, category = excluded.category, rating = excluded.rating, is_mate = excluded.is_mate, sort_order = excluded.sort_order;
insert into public.puzzles (slug, title, description, hint, fen, solution, difficulty, category, rating, is_mate, sort_order) values ('smothered', 'Smothered', 'The knight is the only piece that jumps — a king buried by its own pieces cannot escape its check.', 'Only one piece can check a king that is surrounded by its own army.', '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', array['g5f7']::text[], 'beginner', 'Smothered mate', 800, true, 3) on conflict (slug) do update set title = excluded.title, description = excluded.description, hint = excluded.hint, fen = excluded.fen, solution = excluded.solution, difficulty = excluded.difficulty, category = excluded.category, rating = excluded.rating, is_mate = excluded.is_mate, sort_order = excluded.sort_order;
insert into public.puzzles (slug, title, description, hint, fen, solution, difficulty, category, rating, is_mate, sort_order) values ('four-move-lesson', 'Four-move lesson', 'f7 is guarded only by the king at the start. Queen plus bishop on it is deadly.', 'Which black square is defended only by the king?', 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', array['h5f7']::text[], 'beginner', 'Weak f7', 600, true, 4) on conflict (slug) do update set title = excluded.title, description = excluded.description, hint = excluded.hint, fen = excluded.fen, solution = excluded.solution, difficulty = excluded.difficulty, category = excluded.category, rating = excluded.rating, is_mate = excluded.is_mate, sort_order = excluded.sort_order;
insert into public.puzzles (slug, title, description, hint, fen, solution, difficulty, category, rating, is_mate, sort_order) values ('the-ladder', 'The ladder', 'Rooks take turns controlling ranks: one cuts off, the other delivers mate.', 'One rook already holds the seventh rank.', 'k7/7R/8/8/8/8/8/6RK w - - 0 1', array['g1g8']::text[], 'beginner', 'Two-rook mate', 550, true, 5) on conflict (slug) do update set title = excluded.title, description = excluded.description, hint = excluded.hint, fen = excluded.fen, solution = excluded.solution, difficulty = excluded.difficulty, category = excluded.category, rating = excluded.rating, is_mate = excluded.is_mate, sort_order = excluded.sort_order;
insert into public.puzzles (slug, title, description, hint, fen, solution, difficulty, category, rating, is_mate, sort_order) values ('pawn-with-a-purpose', 'Pawn with a purpose', 'Pawn forks are cheap and powerful: a pawn attacking two pieces always wins material.', 'Even the smallest piece can attack two at once.', '4k3/8/3n1b2/8/3PP3/8/8/4K3 w - - 0 1', array['e4e5', 'd6c4', 'e5f6']::text[], 'beginner', 'Pawn fork', 750, false, 6) on conflict (slug) do update set title = excluded.title, description = excluded.description, hint = excluded.hint, fen = excluded.fen, solution = excluded.solution, difficulty = excluded.difficulty, category = excluded.category, rating = excluded.rating, is_mate = excluded.is_mate, sort_order = excluded.sort_order;
insert into public.puzzles (slug, title, description, hint, fen, solution, difficulty, category, rating, is_mate, sort_order) values ('double-duty', 'Double duty', 'A queen checking the king along one line while attacking along another wins material.', 'Find a queen move that checks and hits the corner.', 'r3k3/8/8/8/8/3Q4/8/4K3 w - - 0 1', array['d3e4', 'e8d7', 'e4a8']::text[], 'intermediate', 'Double attack', 950, false, 7) on conflict (slug) do update set title = excluded.title, description = excluded.description, hint = excluded.hint, fen = excluded.fen, solution = excluded.solution, difficulty = excluded.difficulty, category = excluded.category, rating = excluded.rating, is_mate = excluded.is_mate, sort_order = excluded.sort_order;
insert into public.puzzles (slug, title, description, hint, fen, solution, difficulty, category, rating, is_mate, sort_order) values ('royal-fork', 'Royal fork', 'A check plus an attack on a second piece: the opponent can only answer one.', 'Look for a knight jump that hits the king and something valuable at once.', 'r3k3/8/8/1N6/8/8/7P/4K3 w - - 0 1', array['b5c7', 'e8d7', 'c7a8']::text[], 'intermediate', 'Knight fork', 1000, false, 8) on conflict (slug) do update set title = excluded.title, description = excluded.description, hint = excluded.hint, fen = excluded.fen, solution = excluded.solution, difficulty = excluded.difficulty, category = excluded.category, rating = excluded.rating, is_mate = excluded.is_mate, sort_order = excluded.sort_order;
insert into public.puzzles (slug, title, description, hint, fen, solution, difficulty, category, rating, is_mate, sort_order) values ('through-the-king', 'Through the king', 'A skewer attacks a valuable piece first; when it moves, you take what was behind.', 'Line up your rook with the king and what stands behind it.', '8/8/q2k4/8/8/8/6R1/7K w - - 0 1', array['g2g6', 'd6d5', 'g6a6']::text[], 'intermediate', 'Skewer', 1100, false, 9) on conflict (slug) do update set title = excluded.title, description = excluded.description, hint = excluded.hint, fen = excluded.fen, solution = excluded.solution, difficulty = excluded.difficulty, category = excluded.category, rating = excluded.rating, is_mate = excluded.is_mate, sort_order = excluded.sort_order;
insert into public.puzzles (slug, title, description, hint, fen, solution, difficulty, category, rating, is_mate, sort_order) values ('hidden-power', 'Hidden power', 'Move one piece to give check, and the piece behind it strikes.', 'Something is standing in your bishop’s way. Move it with tempo.', '8/4k1q1/8/5P2/3N4/8/8/B3K3 w - - 0 1', array['d4c6', 'e7d6', 'a1g7']::text[], 'intermediate', 'Discovered attack', 1150, false, 10) on conflict (slug) do update set title = excluded.title, description = excluded.description, hint = excluded.hint, fen = excluded.fen, solution = excluded.solution, difficulty = excluded.difficulty, category = excluded.category, rating = excluded.rating, is_mate = excluded.is_mate, sort_order = excluded.sort_order;
insert into public.puzzles (slug, title, description, hint, fen, solution, difficulty, category, rating, is_mate, sort_order) values ('queen-offering', 'Queen offering', 'Sacrifice to drag a defender away from the square that matters.', 'Which defender stops your rook from reaching the back rank?', 'r1b2k1r/ppp1bppp/8/1B1Q4/5q2/2P5/PPP2PPP/R3R1K1 w - - 1 1', array['d5d8', 'e7d8', 'e1e8']::text[], 'advanced', 'Deflection', 1500, false, 11) on conflict (slug) do update set title = excluded.title, description = excluded.description, hint = excluded.hint, fen = excluded.fen, solution = excluded.solution, difficulty = excluded.difficulty, category = excluded.category, rating = excluded.rating, is_mate = excluded.is_mate, sort_order = excluded.sort_order;

-- Lessons
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('the-chessboard', 'The chessboard', 'beginner', 'The board has 64 squares in 8 files (a–h) and 8 ranks (1–8). Every square has a name, like e4.', '{"paragraphs":["The board has 64 squares in 8 files (a–h) and 8 ranks (1–8). Every square has a name, like e4.","White always starts, and pawns move forward one square — or two on their very first move."],"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","task":"Move the e-pawn two squares forward to e4.","accept":["e2e4"],"requireMate":false}'::jsonb, 'beginner', 3, 1) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('the-pieces', 'The pieces', 'beginner', 'Rooks move in straight lines. Bishops move diagonally. The queen does both. The king moves one square in any direction.', '{"paragraphs":["Rooks move in straight lines. Bishops move diagonally. The queen does both. The king moves one square in any direction.","The knight is special: it moves in an L-shape and is the only piece that can jump over others."],"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","task":"Jump the g1 knight to f3.","accept":["g1f3"],"requireMate":false}'::jsonb, 'beginner', 4, 2) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('legal-moves-and-captures', 'Legal moves and captures', 'beginner', 'You capture by moving onto a square occupied by an opponent’s piece. The captured piece leaves the board.', '{"paragraphs":["You capture by moving onto a square occupied by an opponent’s piece. The captured piece leaves the board.","Before every move, ask: is anything of theirs undefended?"],"fen":"4k3/8/8/3b4/8/8/8/3RK3 w - - 0 1","task":"Capture the undefended bishop with your rook.","accept":["d1d5"],"requireMate":false}'::jsonb, 'beginner', 4, 3) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('check-and-checkmate', 'Check and checkmate', 'beginner', 'Check means the king is attacked. The player in check must escape it immediately.', '{"paragraphs":["Check means the king is attacked. The player in check must escape it immediately.","Checkmate is a check with no escape — the game ends."],"fen":"6k1/R7/8/8/8/8/8/1R4K1 w - - 0 1","task":"Deliver checkmate in one move.","accept":[],"requireMate":true}'::jsonb, 'beginner', 5, 4) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('castling', 'Castling', 'beginner', 'Castling moves your king two squares toward a rook, and the rook jumps to the other side of it. It tucks the king away and activates the rook.', '{"paragraphs":["Castling moves your king two squares toward a rook, and the rook jumps to the other side of it. It tucks the king away and activates the rook.","You can’t castle out of check, through an attacked square, or after the king or that rook has moved."],"fen":"r3k2r/pppq1ppp/2npbn2/4p3/2B1P3/2NP1N2/PPP2PPP/R2QK2R w KQkq - 0 1","task":"Castle kingside: move the king from e1 to g1.","accept":["e1g1"],"requireMate":false}'::jsonb, 'beginner', 4, 5) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('opening-principles', 'Opening principles', 'beginner', 'In the opening: control the centre, develop knights and bishops, and castle early.', '{"paragraphs":["In the opening: control the centre, develop knights and bishops, and castle early.","Knights usually belong on f3 and c3 — pointing at the centre, not the edge."],"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2","task":"Develop a knight toward the centre.","accept":["g1f3","b1c3"],"requireMate":false}'::jsonb, 'beginner', 5, 6) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('control-the-centre', 'Control the centre', 'strategy', 'The four central squares — d4, e4, d5, e5 — are the high ground. Pieces placed near them reach more of the board.', '{"paragraphs":["The four central squares — d4, e4, d5, e5 — are the high ground. Pieces placed near them reach more of the board.","Claiming the centre with pawns gives your pieces room to breathe."],"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","task":"Place a pawn in the centre with your first move.","accept":["e2e4","d2d4"],"requireMate":false}'::jsonb, 'intermediate', 5, 7) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('develop-your-pieces', 'Develop your pieces', 'strategy', 'A piece still on its starting square is a soldier who hasn’t joined the fight.', '{"paragraphs":["A piece still on its starting square is a soldier who hasn’t joined the fight.","Bring out a new piece with nearly every opening move. Don’t move the same piece twice without a reason."],"fen":"r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3","task":"Develop a new minor piece to an active square.","accept":["f1c4","f1b5","b1c3"],"requireMate":false}'::jsonb, 'intermediate', 5, 8) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('king-safety', 'King safety', 'strategy', 'A king in the centre is a target once the position opens. Castle before you attack.', '{"paragraphs":["A king in the centre is a target once the position opens. Castle before you attack.","Keep the pawns in front of your castled king where they are unless you have a clear reason."],"fen":"r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4","task":"Get your king to safety.","accept":["e1g1"],"requireMate":false}'::jsonb, 'intermediate', 5, 9) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('pawn-structure', 'Pawn structure', 'strategy', 'Pawns can’t move backwards, so every pawn decision is permanent.', '{"paragraphs":["Pawns can’t move backwards, so every pawn decision is permanent.","When you have a choice of recapture, capturing toward the centre usually keeps a healthier structure."],"fen":"r1bqkb1r/pppp1ppp/8/4p3/4P3/2n5/PPPP1PPP/R1BQKBNR w KQkq - 0 5","task":"Recapture the knight on c3 — toward the centre.","accept":["b2c3"],"requireMate":false}'::jsonb, 'intermediate', 6, 10) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('space', 'Space', 'strategy', 'Advanced pawns claim territory. The side with more space has easier manoeuvres; the cramped side struggles to coordinate.', '{"paragraphs":["Advanced pawns claim territory. The side with more space has easier manoeuvres; the cramped side struggles to coordinate.","Space is only an advantage if you can support your advanced pawns."],"fen":"rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6 0 3","task":"Gain space by advancing your e-pawn.","accept":["e4e5"],"requireMate":false}'::jsonb, 'intermediate', 5, 11) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('exchanges', 'Exchanges', 'strategy', 'When you are ahead in material, trade pieces. Every exchange makes your extra material count for more.', '{"paragraphs":["When you are ahead in material, trade pieces. Every exchange makes your extra material count for more.","When you are behind, avoid trades and look for complications."],"fen":"3r2k1/5pp1/7p/8/8/8/5PPP/R2R2K1 w - - 0 1","task":"You are a rook up. Offer the trade.","accept":["d1d8"],"requireMate":false}'::jsonb, 'intermediate', 5, 12) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('fork', 'Fork', 'tactics', 'A fork is one piece attacking two targets at once. Knights are the classic forking piece.', '{"paragraphs":["A fork is one piece attacking two targets at once. Knights are the classic forking piece.","The most powerful forks include a check, so the opponent has no time to save the other piece."],"fen":"r3k3/8/8/1N6/8/8/7P/4K3 w - - 0 1","task":"Fork the king and rook.","accept":["b5c7"],"requireMate":false}'::jsonb, 'intermediate', 4, 13) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('pin', 'Pin', 'tactics', 'A pin freezes a piece because moving it would expose something more valuable behind it.', '{"paragraphs":["A pin freezes a piece because moving it would expose something more valuable behind it.","If the piece behind is the king, the pinned piece cannot legally move at all."],"fen":"4k3/3n4/8/8/8/8/8/4KB2 w - - 0 1","task":"Pin the knight to the king.","accept":["f1b5"],"requireMate":false}'::jsonb, 'intermediate', 4, 14) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('skewer', 'Skewer', 'tactics', 'A skewer is a pin in reverse: the valuable piece is in front, and when it moves you take the piece behind.', '{"paragraphs":["A skewer is a pin in reverse: the valuable piece is in front, and when it moves you take the piece behind."],"fen":"8/8/q2k4/8/8/8/6R1/7K w - - 0 1","task":"Skewer the king and queen.","accept":["g2g6"],"requireMate":false}'::jsonb, 'intermediate', 4, 15) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('discovered-attack', 'Discovered attack', 'tactics', 'When one piece moves out of the way, the piece behind it attacks. If the moving piece gives check too, it is a discovered attack with check.', '{"paragraphs":["When one piece moves out of the way, the piece behind it attacks. If the moving piece gives check too, it is a discovered attack with check."],"fen":"8/4k1q1/8/5P2/3N4/8/8/B3K3 w - - 0 1","task":"Move the knight with check to uncover your bishop.","accept":["d4c6"],"requireMate":false}'::jsonb, 'intermediate', 5, 16) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('double-attack', 'Double attack', 'tactics', 'The queen can attack in eight directions. Combine a check with a second threat and something falls.', '{"paragraphs":["The queen can attack in eight directions. Combine a check with a second threat and something falls."],"fen":"r3k3/8/8/8/8/3Q4/8/4K3 w - - 0 1","task":"Check the king and attack the rook in one move.","accept":["d3e4"],"requireMate":false}'::jsonb, 'intermediate', 4, 17) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('checkmate-patterns', 'Checkmate patterns', 'tactics', 'Strong players don’t calculate every mate — they recognise patterns. The back-rank mate is one of the most common in real games.', '{"paragraphs":["Strong players don’t calculate every mate — they recognise patterns. The back-rank mate is one of the most common in real games.","Give your own king an escape square (called luft) to avoid it."],"fen":"6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1","task":"Find the back-rank mate.","accept":[],"requireMate":true}'::jsonb, 'intermediate', 5, 18) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('king-and-pawn', 'King and pawn', 'endgame', 'The rule of the square: draw a square from the pawn to the promotion rank. If the enemy king can’t step inside it, the pawn runs through alone.', '{"paragraphs":["The rule of the square: draw a square from the pawn to the promotion rank. If the enemy king can’t step inside it, the pawn runs through alone."],"fen":"8/8/8/8/k7/8/7P/7K w - - 0 1","task":"The king is outside the square. Push the pawn as far as you can.","accept":["h2h4"],"requireMate":false}'::jsonb, 'intermediate', 5, 19) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('opposition', 'Opposition', 'endgame', 'When kings face each other with one square between them, the player who does not have to move has the opposition.', '{"paragraphs":["When kings face each other with one square between them, the player who does not have to move has the opposition.","Taking the opposition forces the enemy king to give way."],"fen":"8/8/4k3/8/8/4K3/4P3/8 w - - 0 1","task":"Take the opposition by stepping your king forward.","accept":["e3e4"],"requireMate":false}'::jsonb, 'intermediate', 6, 20) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;
insert into public.lessons (slug, title, category, description, content, difficulty, duration_minutes, order_index) values ('basic-rook-endings', 'Basic rook endings', 'endgame', 'A rook is at its best cutting off the enemy king. A king kept away from your pawn cannot stop it.', '{"paragraphs":["A rook is at its best cutting off the enemy king. A king kept away from your pawn cannot stop it."],"fen":"8/8/8/8/2k5/8/4P3/R3K3 w - - 0 1","task":"Cut the black king off along the d-file.","accept":["a1d1"],"requireMate":false}'::jsonb, 'intermediate', 6, 21) on conflict (slug) do update set title = excluded.title, category = excluded.category, description = excluded.description, content = excluded.content, difficulty = excluded.difficulty, duration_minutes = excluded.duration_minutes, order_index = excluded.order_index;

-- Stories
insert into public.stories (slug, title, excerpt, content, category, symbol, read_minutes, source, published_at) values ('go-back-and-get-it', 'Go back and get it', 'The Akan word behind this platform, and why it fits a game built on memory.', 'Sankofa comes from the Akan people of Ghana. The word is usually explained as a joining of san (return), ko (go) and fa (fetch): go back and get it.

It is tied to a proverb: “Se wo were fi na wosankofa a yenkyi” — it is not wrong to go back for that which you have forgotten.

The Adinkra symbol shows a bird whose feet face forward while its head turns back to pick up an egg from its back. The egg is the knowledge of the past; the forward-facing feet say that you keep moving.

Chess players live this idea every day. The games you lost, the patterns you almost saw, the openings that went wrong — reviewing them is how you get stronger. Every game review in Sankofa Chess is a small act of sankofa.', 'Philosophy', 'sankofa', 3, 'W. Bruce Willis, The Adinkra Dictionary (1998); Akan oral tradition.', now() - interval '6 days') on conflict (slug) do update set title = excluded.title, excerpt = excluded.excerpt, content = excluded.content, category = excluded.category, symbol = excluded.symbol, read_minutes = excluded.read_minutes, source = excluded.source;
insert into public.stories (slug, title, excerpt, content, category, symbol, read_minutes, source, published_at) values ('the-wisdom-knot', 'The wisdom knot', 'Adinkra symbols carry whole ideas in a single shape. One of them describes a strong chess player.', 'Adinkra symbols come from the Asante (Ashanti) region of Ghana, where they were traditionally stamped onto cloth. Each symbol stands for a proverb, a value or a historical idea.

Nyansapo — the wisdom knot — is associated with the idea that a wise person can choose the best means to reach a goal. That is close to a definition of good chess: not the most brilliant move, but the right one for the position.

Dwennimmen, the ram’s horns, stands for strength combined with humility. Anyone who has lost a won game through overconfidence knows why that pairing matters.', 'Adinkra', 'nyansapo', 3, 'W. Bruce Willis, The Adinkra Dictionary (1998).', now() - interval '5 days') on conflict (slug) do update set title = excluded.title, excerpt = excluded.excerpt, content = excluded.content, category = excluded.category, symbol = excluded.symbol, read_minutes = excluded.read_minutes, source = excluded.source;
insert into public.stories (slug, title, excerpt, content, category, symbol, read_minutes, source, published_at) values ('senterej-chess-at-the-ethiopian-court', 'Senterej: chess at the Ethiopian court', 'Long before online blitz, Ethiopia had its own version of the game.', 'Senterej is a traditional Ethiopian form of chess descended from the older shatranj family of games. It was played in Ethiopia for centuries, including at the royal court.

One of its best-known features is its opening: rather than strictly alternating single moves from the first turn, players could develop freely at their own pace until the first capture, after which play alternated normally.

That opening rewards exactly what modern coaches teach: quick, purposeful development. Senterej faded in the twentieth century as international rules spread, but it remains part of Africa’s chess story.', 'History', 'board', 4, 'H. J. R. Murray, A History of Chess (1913); Richard Pankhurst’s writings on Ethiopian games.', now() - interval '4 days') on conflict (slug) do update set title = excluded.title, excerpt = excluded.excerpt, content = excluded.content, category = excluded.category, symbol = excluded.symbol, read_minutes = excluded.read_minutes, source = excluded.source;
insert into public.stories (slug, title, excerpt, content, category, symbol, read_minutes, source, published_at) values ('oware-and-the-art-of-counting-ahead', 'Oware and the art of counting ahead', 'A West African board game that trains the same muscles as chess calculation.', 'Oware is a mancala game played across Ghana and West Africa; the Yoruba version in Nigeria is known as ayo. Two players sow seeds around a board of pits and capture by landing on the right count.

Good oware players count many sowings ahead and set up captures their opponent doesn’t see coming. It is calculation without pieces — a skill that transfers directly to chess tactics.

Games like oware remind us that strategic thinking has deep roots on the continent. Chess is one vehicle among many.', 'Strategy traditions', 'oware', 3, 'General ethnographic literature on mancala games (editorial review pending before launch).', now() - interval '3 days') on conflict (slug) do update set title = excluded.title, excerpt = excluded.excerpt, content = excluded.content, category = excluded.category, symbol = excluded.symbol, read_minutes = excluded.read_minutes, source = excluded.source;
insert into public.stories (slug, title, excerpt, content, category, symbol, read_minutes, source, published_at) values ('africas-modern-masters', 'Africa’s modern masters', 'The players who put African chess on the world map.', 'Egypt’s Bassem Amin is widely regarded as Africa’s strongest player of recent years and a multiple African champion.

Zambia’s Amon Simutowe became one of the first grandmasters from sub-Saharan Africa, and South Africa’s Kenny Solomon became the country’s first grandmaster in 2014.

Uganda’s Phiona Mutesi learned the game in the Katwe neighbourhood of Kampala and represented her country at Chess Olympiads; her story was told in the 2016 film Queen of Katwe.

Each of them started somewhere ordinary. The next one could be starting today.', 'Innovators', 'crown', 4, 'FIDE records and public reporting (editorial review pending before launch).', now() - interval '2 days') on conflict (slug) do update set title = excluded.title, excerpt = excluded.excerpt, content = excluded.content, category = excluded.category, symbol = excluded.symbol, read_minutes = excluded.read_minutes, source = excluded.source;
insert into public.stories (slug, title, excerpt, content, category, symbol, read_minutes, source, published_at) values ('the-oldest-trap-on-the-board', 'The oldest trap on the board', 'A rook and knight pattern that has been winning games for over a thousand years.', 'The Arabian mate — rook and knight trapping a king in the corner — is one of the oldest checkmate patterns on record, found in early Arabic writings on shatranj, the ancestor of modern chess.

Chess itself travelled through the Islamic world and across North Africa into Spain and the rest of Europe. The game Europe inherited had already passed through many African and Arab hands.

You can solve this exact pattern in the puzzle set. Old wisdom still wins games.', 'History', 'arabian', 3, 'H. J. R. Murray, A History of Chess (1913).', now() - interval '1 days') on conflict (slug) do update set title = excluded.title, excerpt = excluded.excerpt, content = excluded.content, category = excluded.category, symbol = excluded.symbol, read_minutes = excluded.read_minutes, source = excluded.source;

-- Challenges
insert into public.challenges (slug, title, description, type, metric, period, target, reward_xp, href, sort_order) values ('daily-3-puzzles', 'Solve 3 puzzles', 'Keep your pattern memory sharp.', 'daily', 'puzzles_solved', 'day', 3, 50, '/app/puzzles', 1) on conflict (slug) do update set title = excluded.title, description = excluded.description, type = excluded.type, metric = excluded.metric, period = excluded.period, target = excluded.target, reward_xp = excluded.reward_xp, href = excluded.href, sort_order = excluded.sort_order;
insert into public.challenges (slug, title, description, type, metric, period, target, reward_xp, href, sort_order) values ('weekly-10-games', 'Play 10 games', 'Any time control, any opponent.', 'weekly', 'games_played', 'week', 10, 150, '/app/play', 2) on conflict (slug) do update set title = excluded.title, description = excluded.description, type = excluded.type, metric = excluded.metric, period = excluded.period, target = excluded.target, reward_xp = excluded.reward_xp, href = excluded.href, sort_order = excluded.sort_order;
insert into public.challenges (slug, title, description, type, metric, period, target, reward_xp, href, sort_order) values ('learning-2-lessons', 'Complete 2 lessons', 'Two new ideas this week.', 'learning', 'lessons_completed', 'week', 2, 80, '/app/learn', 3) on conflict (slug) do update set title = excluded.title, description = excluded.description, type = excluded.type, metric = excluded.metric, period = excluded.period, target = excluded.target, reward_xp = excluded.reward_xp, href = excluded.href, sort_order = excluded.sort_order;
insert into public.challenges (slug, title, description, type, metric, period, target, reward_xp, href, sort_order) values ('strategy-win-after-lesson', 'Win a game after completing a lesson', 'Learn it, then use it.', 'strategy', 'win_after_lesson', 'week', 1, 100, '/app/learn', 4) on conflict (slug) do update set title = excluded.title, description = excluded.description, type = excluded.type, metric = excluded.metric, period = excluded.period, target = excluded.target, reward_xp = excluded.reward_xp, href = excluded.href, sort_order = excluded.sort_order;

-- Achievements
insert into public.achievements (slug, name, description, icon, requirement, sort_order) values ('first-victory', 'First Victory', 'Win your first game', 'medal', '{"metric":"wins","count":1}'::jsonb, 1) on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, requirement = excluded.requirement, sort_order = excluded.sort_order;
insert into public.achievements (slug, name, description, icon, requirement, sort_order) values ('puzzle-solver', 'Puzzle Solver', 'Solve 5 different puzzles', 'brain', '{"metric":"puzzles_solved","count":5}'::jsonb, 2) on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, requirement = excluded.requirement, sort_order = excluded.sort_order;
insert into public.achievements (slug, name, description, icon, requirement, sort_order) values ('seven-day-streak', '7 Day Streak', 'Train 7 days in a row', 'flame', '{"metric":"best_streak","count":7}'::jsonb, 3) on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, requirement = excluded.requirement, sort_order = excluded.sort_order;
insert into public.achievements (slug, name, description, icon, requirement, sort_order) values ('fifty-games', '50 Games', 'Play 50 games', 'swords', '{"metric":"games_played","count":50}'::jsonb, 4) on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, requirement = excluded.requirement, sort_order = excluded.sort_order;
insert into public.achievements (slug, name, description, icon, requirement, sort_order) values ('student', 'Student', 'Complete 5 lessons', 'book-open', '{"metric":"lessons_completed","count":5}'::jsonb, 5) on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, requirement = excluded.requirement, sort_order = excluded.sort_order;
insert into public.achievements (slug, name, description, icon, requirement, sort_order) values ('go-back-and-get-it', 'Go Back and Get It', 'Review a game with the coach', 'rotate-ccw', '{"metric":"games_reviewed","count":1}'::jsonb, 6) on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, requirement = excluded.requirement, sort_order = excluded.sort_order;
insert into public.achievements (slug, name, description, icon, requirement, sort_order) values ('sharp-eye', 'Sharp Eye', 'Solve 5 puzzles in a row first time', 'zap', '{"metric":"best_puzzle_run","count":5}'::jsonb, 7) on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, requirement = excluded.requirement, sort_order = excluded.sort_order;
insert into public.achievements (slug, name, description, icon, requirement, sort_order) values ('strategist', 'Strategist', 'Reach Sankofa Level 4', 'crown', '{"metric":"sankofa_level","count":4}'::jsonb, 8) on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, requirement = excluded.requirement, sort_order = excluded.sort_order;

-- Demo leaderboard players (cannot log in: random passwords)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'kwame_opens@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"kwame_opens","display_name":"Kwame","country":"GH","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '{"sub":"d0000000-0000-4000-8000-000000000001","email":"kwame_opens@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1842, peak_rating = 1867, xp = 2350, sankofa_level = 7, games_played = 212, wins = 110, draws = 17, losses = 85, streak = 0, best_streak = 10 where id = 'd0000000-0000-4000-8000-000000000001';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'adaeze-k@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"adaeze.k","display_name":"Adaeze","country":"NG","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', '{"sub":"d0000000-0000-4000-8000-000000000002","email":"adaeze-k@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1795, peak_rating = 1820, xp = 2140, sankofa_level = 7, games_played = 190, wins = 99, draws = 15, losses = 76, streak = 3, best_streak = 11 where id = 'd0000000-0000-4000-8000-000000000002';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'nairobi_knight@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"nairobi_knight","display_name":"Wanjiru","country":"KE","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', '{"sub":"d0000000-0000-4000-8000-000000000003","email":"nairobi_knight@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1760, peak_rating = 1785, xp = 1720, sankofa_level = 6, games_played = 164, wins = 85, draws = 13, losses = 66, streak = 6, best_streak = 12 where id = 'd0000000-0000-4000-8000-000000000003';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'rook_of_rabat@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"rook_of_rabat","display_name":"Youssef","country":"MA","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000004', '{"sub":"d0000000-0000-4000-8000-000000000004","email":"rook_of_rabat@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1712, peak_rating = 1737, xp = 1610, sankofa_level = 6, games_played = 151, wins = 79, draws = 12, losses = 60, streak = 9, best_streak = 13 where id = 'd0000000-0000-4000-8000-000000000004';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'tamale_tactics@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"tamale_tactics","display_name":"Fuseini","country":"GH","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000005', '{"sub":"d0000000-0000-4000-8000-000000000005","email":"tamale_tactics@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1655, peak_rating = 1680, xp = 1480, sankofa_level = 6, games_played = 140, wins = 73, draws = 11, losses = 56, streak = 1, best_streak = 14 where id = 'd0000000-0000-4000-8000-000000000005';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'zanele_z@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"zanele_z","display_name":"Zanele","country":"ZA","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000006', '{"sub":"d0000000-0000-4000-8000-000000000006","email":"zanele_z@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1610, peak_rating = 1635, xp = 1210, sankofa_level = 5, games_played = 122, wins = 63, draws = 10, losses = 49, streak = 4, best_streak = 15 where id = 'd0000000-0000-4000-8000-000000000006';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'bruxelles_b@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"bruxelles_b","display_name":"Bram","country":"BE","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000007', '{"sub":"d0000000-0000-4000-8000-000000000007","email":"bruxelles_b@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1588, peak_rating = 1613, xp = 1150, sankofa_level = 5, games_played = 118, wins = 61, draws = 9, losses = 48, streak = 7, best_streak = 16 where id = 'd0000000-0000-4000-8000-000000000007';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'kofi_endgames@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"kofi_endgames","display_name":"Kofi","country":"GH","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000008', '{"sub":"d0000000-0000-4000-8000-000000000008","email":"kofi_endgames@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1540, peak_rating = 1565, xp = 980, sankofa_level = 5, games_played = 104, wins = 54, draws = 8, losses = 42, streak = 10, best_streak = 17 where id = 'd0000000-0000-4000-8000-000000000008';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'lagos_lion@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"lagos_lion","display_name":"Tunde","country":"NG","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000009', '{"sub":"d0000000-0000-4000-8000-000000000009","email":"lagos_lion@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1497, peak_rating = 1522, xp = 940, sankofa_level = 5, games_played = 97, wins = 50, draws = 8, losses = 39, streak = 2, best_streak = 18 where id = 'd0000000-0000-4000-8000-000000000009';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'addis_senterej@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"addis_senterej","display_name":"Selam","country":"ET","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000010', '{"sub":"d0000000-0000-4000-8000-000000000010","email":"addis_senterej@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1463, peak_rating = 1488, xp = 720, sankofa_level = 4, games_played = 88, wins = 46, draws = 7, losses = 35, streak = 5, best_streak = 10 where id = 'd0000000-0000-4000-8000-000000000010';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'mariama-b@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"mariama.b","display_name":"Mariama","country":"SN","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000011', '{"sub":"d0000000-0000-4000-8000-000000000011","email":"mariama-b@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1420, peak_rating = 1445, xp = 650, sankofa_level = 4, games_played = 81, wins = 42, draws = 6, losses = 33, streak = 8, best_streak = 11 where id = 'd0000000-0000-4000-8000-000000000011';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'antwerp_ama@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"antwerp_ama","display_name":"Ama","country":"BE","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000012', '{"sub":"d0000000-0000-4000-8000-000000000012","email":"antwerp_ama@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1388, peak_rating = 1413, xp = 610, sankofa_level = 4, games_played = 76, wins = 40, draws = 6, losses = 30, streak = 0, best_streak = 12 where id = 'd0000000-0000-4000-8000-000000000012';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'kigali_queen@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"kigali_queen","display_name":"Aline","country":"RW","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000013', '{"sub":"d0000000-0000-4000-8000-000000000013","email":"kigali_queen@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1342, peak_rating = 1367, xp = 540, sankofa_level = 4, games_played = 70, wins = 36, draws = 6, losses = 28, streak = 3, best_streak = 13 where id = 'd0000000-0000-4000-8000-000000000013';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'yaw_forks@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"yaw_forks","display_name":"Yaw","country":"GH","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000014', '{"sub":"d0000000-0000-4000-8000-000000000014","email":"yaw_forks@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1301, peak_rating = 1326, xp = 420, sankofa_level = 3, games_played = 61, wins = 32, draws = 5, losses = 24, streak = 6, best_streak = 14 where id = 'd0000000-0000-4000-8000-000000000014';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000015', 'authenticated', 'authenticated', 'dakar_dev@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"dakar_dev","display_name":"Moussa","country":"SN","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000015', '{"sub":"d0000000-0000-4000-8000-000000000015","email":"dakar_dev@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1255, peak_rating = 1280, xp = 380, sankofa_level = 3, games_played = 55, wins = 29, draws = 4, losses = 22, streak = 9, best_streak = 15 where id = 'd0000000-0000-4000-8000-000000000015';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000016', 'authenticated', 'authenticated', 'kl_castles@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"kl_castles","display_name":"Aiman","country":"MY","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000016', 'd0000000-0000-4000-8000-000000000016', 'd0000000-0000-4000-8000-000000000016', '{"sub":"d0000000-0000-4000-8000-000000000016","email":"kl_castles@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1214, peak_rating = 1239, xp = 300, sankofa_level = 3, games_played = 47, wins = 24, draws = 4, losses = 19, streak = 1, best_streak = 16 where id = 'd0000000-0000-4000-8000-000000000016';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000017', 'authenticated', 'authenticated', 'abena_plays@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"abena_plays","display_name":"Abena","country":"GH","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000017', '{"sub":"d0000000-0000-4000-8000-000000000017","email":"abena_plays@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1170, peak_rating = 1195, xp = 260, sankofa_level = 3, games_played = 40, wins = 21, draws = 3, losses = 16, streak = 4, best_streak = 17 where id = 'd0000000-0000-4000-8000-000000000017';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000018', 'authenticated', 'authenticated', 'accra_pawn@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"accra_pawn","display_name":"Efua","country":"GH","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000018', 'd0000000-0000-4000-8000-000000000018', 'd0000000-0000-4000-8000-000000000018', '{"sub":"d0000000-0000-4000-8000-000000000018","email":"accra_pawn@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1088, peak_rating = 1113, xp = 180, sankofa_level = 2, games_played = 29, wins = 15, draws = 2, losses = 12, streak = 7, best_streak = 18 where id = 'd0000000-0000-4000-8000-000000000018';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000019', 'authenticated', 'authenticated', 'london_luft@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"london_luft","display_name":"Sam","country":"GB","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000019', 'd0000000-0000-4000-8000-000000000019', 'd0000000-0000-4000-8000-000000000019', '{"sub":"d0000000-0000-4000-8000-000000000019","email":"london_luft@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 1046, peak_rating = 1071, xp = 140, sankofa_level = 2, games_played = 22, wins = 11, draws = 2, losses = 9, streak = 10, best_streak = 10 where id = 'd0000000-0000-4000-8000-000000000019';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000020', 'authenticated', 'authenticated', 'new_seed_22@demo.sankofachess.app', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"new_seed_22","display_name":"Chidi","country":"NG","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000020', 'd0000000-0000-4000-8000-000000000020', 'd0000000-0000-4000-8000-000000000020', '{"sub":"d0000000-0000-4000-8000-000000000020","email":"new_seed_22@demo.sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), rating = 902, peak_rating = 927, xp = 40, sankofa_level = 1, games_played = 6, wins = 3, draws = 0, losses = 3, streak = 2, best_streak = 11 where id = 'd0000000-0000-4000-8000-000000000020';

-- Demo login account (for local development and previews — remove before public launch)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000999', 'authenticated', 'authenticated', 'demo@sankofachess.app', extensions.crypt('sankofa-demo-2026', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"sankofa_demo","display_name":"Marwan","country":"GH","chess_level":"intermediate"}'::jsonb, now() - interval '60 days', now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000999', 'd0000000-0000-4000-8000-000000000999', 'd0000000-0000-4000-8000-000000000999', '{"sub":"d0000000-0000-4000-8000-000000000999","email":"demo@sankofachess.app","email_verified":true}'::jsonb, 'email', now(), now(), now())
on conflict do nothing;
update public.profiles set is_demo = true, onboarded_at = now(), goal = 'tactics', timezone = 'Europe/Brussels' where id = 'd0000000-0000-4000-8000-000000000999';

commit;

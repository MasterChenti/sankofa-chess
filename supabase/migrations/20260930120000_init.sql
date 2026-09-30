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

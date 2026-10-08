-- ============================================================
-- Sankofa Chess — Phase 2: the daily ritual, the knowledge layer, and people playing people.
-- Additive and backwards compatible with the phase 1 app.
-- ============================================================

-- ---------- profiles: identity + knowledge counters ----------
alter table public.profiles
  add column if not exists locale text not null default 'en',
  add column if not exists stories_read integer not null default 0,
  add column if not exists thoughts_answered integer not null default 0,
  add column if not exists reflections integer not null default 0,
  add column if not exists days_sharpened integer not null default 0,
  add column if not exists online_games integer not null default 0,
  add column if not exists rest_week text;

grant update (locale) on public.profiles to authenticated;

-- ---------- stories become structured, regional, translatable ----------
alter table public.stories
  add column if not exists locale text not null default 'en',
  add column if not exists region text,
  add column if not exists country text,
  add column if not exists place text,
  add column if not exists era text,
  add column if not exists kind text not null default 'idea',
  add column if not exists structure jsonb;
alter table public.stories drop constraint if exists stories_slug_key;
create unique index if not exists stories_slug_locale_key on public.stories (slug, locale);
create index if not exists stories_region_idx on public.stories (region);
alter table public.stories drop constraint if exists stories_region_check;
alter table public.stories add constraint stories_region_check
  check (region is null or region in ('west', 'east', 'north', 'central', 'southern', 'diaspora', 'pan-african'));

-- ---------- strategic thoughts (Think) ----------
create table if not exists public.thoughts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  locale text not null default 'en',
  prompt text not null,
  context text,
  options jsonb not null,
  takeaway text not null,
  lesson_slug text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (slug, locale)
);
alter table public.thoughts enable row level security;
drop policy if exists "Content is readable by everyone" on public.thoughts;
create policy "Content is readable by everyone" on public.thoughts for select to anon, authenticated using (true);
revoke insert, update, delete on public.thoughts from anon, authenticated;

-- ---------- per-player knowledge records ----------
create table if not exists public.story_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  story_id uuid not null references public.stories (id) on delete cascade,
  think_choice text,
  day_key text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, story_id)
);
create index if not exists story_reads_user_day_idx on public.story_reads (user_id, day_key);

create table if not exists public.thought_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  thought_id uuid not null references public.thoughts (id) on delete cascade,
  choice text not null,
  style text,
  day_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, thought_id)
);
create index if not exists thought_answers_user_day_idx on public.thought_answers (user_id, day_key);

-- One row per player per day: the plan for "Today" and the reflection that closes it.
create table if not exists public.daily_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_key text not null,
  plan jsonb not null,
  reflection_choice text,
  reflection text check (reflection is null or char_length(reflection) <= 280),
  reflected_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, day_key)
);

alter table public.puzzle_attempts add column if not exists outcome text
  check (outcome is null or outcome in ('solved', 'failed', 'revealed'));
create index if not exists puzzle_attempts_user_day_outcome_idx on public.puzzle_attempts (user_id, day_key, outcome);

alter table public.xp_events add column if not exists pillar text
  check (pillar is null or pillar in ('play', 'think', 'remember', 'reflect'));

alter table public.challenges drop constraint if exists challenges_metric_check;
alter table public.challenges add constraint challenges_metric_check
  check (metric in ('puzzles_solved', 'games_played', 'lessons_completed', 'win_after_lesson', 'stories_read'));

alter table public.story_reads enable row level security;
alter table public.thought_answers enable row level security;
alter table public.daily_sessions enable row level security;
drop policy if exists "Owners read their story reads" on public.story_reads;
drop policy if exists "Owners read their thought answers" on public.thought_answers;
drop policy if exists "Owners read their daily sessions" on public.daily_sessions;
create policy "Owners read their story reads" on public.story_reads for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners read their thought answers" on public.thought_answers for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners read their daily sessions" on public.daily_sessions for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.story_reads, public.thought_answers, public.daily_sessions from anon, authenticated;

-- ---------- people playing people ----------
alter table public.games drop constraint if exists games_source_check;
alter table public.games add constraint games_source_check check (source in ('vs_computer', 'pass_and_play', 'online'));
alter table public.games add column if not exists opponent_id uuid references public.profiles (id) on delete set null;
alter table public.games add column if not exists live_game_id uuid;

create table if not exists public.live_games (
  id uuid primary key default gen_random_uuid(),
  white_id uuid references public.profiles (id) on delete cascade,
  black_id uuid references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'aborted')),
  mode text not null check (mode in ('blitz', 'rapid', 'daily')),
  initial_ms bigint not null,
  increment_ms bigint not null default 0,
  white_ms bigint not null,
  black_ms bigint not null,
  turn_started_at timestamptz,
  moves text[] not null default '{}',
  ply integer not null default 0,
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  result text check (result is null or result in ('1-0', '0-1', '1/2-1/2')),
  termination text,
  draw_offer_by uuid,
  invite_code text unique,
  rated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists live_games_white_idx on public.live_games (white_id, status);
create index if not exists live_games_black_idx on public.live_games (black_id, status);
drop trigger if exists live_games_updated_at on public.live_games;
create trigger live_games_updated_at before update on public.live_games
  for each row execute function public.set_updated_at();

create table if not exists public.match_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('blitz', 'rapid', 'daily')),
  rating integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.live_games enable row level security;
alter table public.match_queue enable row level security;
drop policy if exists "Players read their live games" on public.live_games;
create policy "Players read their live games" on public.live_games for select to authenticated
  using ((select auth.uid()) in (white_id, black_id, created_by));
drop policy if exists "Players read their queue entry" on public.match_queue;
create policy "Players read their queue entry" on public.match_queue for select to authenticated
  using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.live_games, public.match_queue from anon, authenticated;

-- Live updates for players watching their own games (RLS still applies).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'live_games') then
    alter publication supabase_realtime add table public.live_games;
  end if;
end $$;

-- Atomic matchmaking. Called only from the server (service role) after authentication.
create or replace function public.sankofa_find_match(
  p_user uuid, p_mode text, p_rating integer, p_initial_ms bigint, p_increment_ms bigint
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game uuid;
  v_opp public.match_queue%rowtype;
  v_white uuid;
  v_black uuid;
begin
  -- Already matched recently (the other player found us)? Hand back that game.
  select g.id into v_game from public.live_games g
   where g.status = 'active' and g.mode = p_mode and p_user in (g.white_id, g.black_id)
     and g.created_at > now() - interval '2 minutes' and g.ply = 0
   order by g.created_at desc limit 1;
  if v_game is not null then
    delete from public.match_queue where user_id = p_user;
    return v_game;
  end if;

  select * into v_opp from public.match_queue q
   where q.mode = p_mode and q.user_id <> p_user and q.updated_at > now() - interval '20 seconds'
   order by abs(q.rating - p_rating), q.created_at
   limit 1
   for update skip locked;

  if found then
    if random() < 0.5 then v_white := p_user; v_black := v_opp.user_id;
    else v_white := v_opp.user_id; v_black := p_user; end if;
    insert into public.live_games (white_id, black_id, created_by, status, mode, initial_ms, increment_ms, white_ms, black_ms)
    values (v_white, v_black, p_user, 'active', p_mode, p_initial_ms, p_increment_ms, p_initial_ms, p_initial_ms)
    returning id into v_game;
    delete from public.match_queue where user_id in (p_user, v_opp.user_id);
    return v_game;
  end if;

  insert into public.match_queue (user_id, mode, rating) values (p_user, p_mode, p_rating)
  on conflict (user_id) do update set mode = excluded.mode, rating = excluded.rating, updated_at = now();
  return null;
end;
$$;
revoke execute on function public.sankofa_find_match(uuid, text, integer, bigint, bigint) from public, anon, authenticated;

-- ---------- architecture for clubs, schools and countries (no UI yet) ----------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('club', 'school')),
  name text not null,
  slug text not null unique,
  country text not null,
  city text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'coach', 'teacher', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
drop policy if exists "Signed-in players can see organizations" on public.organizations;
create policy "Signed-in players can see organizations" on public.organizations for select to authenticated using (true);
drop policy if exists "Members see their memberships" on public.organization_members;
create policy "Members see their memberships" on public.organization_members for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.organizations, public.organization_members from anon, authenticated;

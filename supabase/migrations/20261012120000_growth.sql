-- Growth: attribution, first-party events, shareable daily cards, and metrics views.
-- Additive and idempotent (safe to run more than once).

-- ---------- attribution ----------
alter table public.profiles
  add column if not exists invited_by uuid references public.profiles (id) on delete set null,
  add column if not exists signup_ref text;
do $$ begin
  alter table public.profiles add constraint profiles_signup_ref_check check (signup_ref is null or signup_ref in ('invite', 'card', 'direct'));
exception when duplicate_object then null; end $$;

-- ---------- first-party product events (no third-party tracker, no personal data) ----------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null check (name ~ '^[a-z_]{3,40}$'),
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_name_time_idx on public.events (name, created_at desc);
alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;

-- ---------- shareable daily cards ----------
alter table public.daily_sessions add column if not exists share_code text;
create unique index if not exists daily_sessions_share_code_key on public.daily_sessions (share_code) where share_code is not null;

-- Answers from people who opened a card (often without an account).
create table if not exists public.dilemma_votes (
  id bigint generated always as identity primary key,
  story_id uuid not null references public.stories (id) on delete cascade,
  choice text not null check (char_length(choice) between 1 and 4),
  share_code text,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists dilemma_votes_story_idx on public.dilemma_votes (story_id);
alter table public.dilemma_votes enable row level security;
revoke all on public.dilemma_votes from anon, authenticated;

-- ---------- metrics (SQL editor only: the analytics schema is not exposed to the API) ----------
create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

-- A player is "active" on a day when they open Today or earn XP.
create or replace view analytics.active_days as
  select user_id, day_key::date as day from public.daily_sessions
  union
  select user_id, (created_at at time zone 'UTC')::date from public.xp_events;

-- D1 / D7 retention by signup week (only real players: demo profiles excluded).
create or replace view analytics.retention as
  with cohort as (
    select p.id, (p.created_at at time zone 'UTC')::date as d0
    from public.profiles p
    where not p.is_demo and p.onboarded_at is not null
  )
  select
    date_trunc('week', c.d0)::date as signup_week,
    count(*) as players,
    round(100.0 * count(*) filter (where exists (select 1 from analytics.active_days a where a.user_id = c.id and a.day = c.d0 + 1)) / count(*), 1) as d1_pct,
    round(100.0 * count(*) filter (where exists (select 1 from analytics.active_days a where a.user_id = c.id and a.day = c.d0 + 7)) / count(*), 1) as d7_pct,
    round(100.0 * count(*) filter (where exists (select 1 from analytics.active_days a where a.user_id = c.id and a.day between c.d0 + 7 and c.d0 + 13)) / count(*), 1) as week2_pct
  from cohort c
  group by 1
  order by 1 desc;

-- Daily growth funnel: sessions → shares → card opens → answers → sign-ups; invites → joins → sign-ups.
create or replace view analytics.daily_funnel as
  with days as (
    select generate_series(current_date - 59, current_date, interval '1 day')::date as day
  ),
  ev as (
    select (created_at at time zone 'UTC')::date as day, name, count(*) as n
    from public.events group by 1, 2
  )
  select
    d.day,
    (select count(*) from public.daily_sessions s where (s.completed_at at time zone 'UTC')::date = d.day) as sessions_completed,
    coalesce((select n from ev where ev.day = d.day and ev.name = 'share_clicked'), 0) as shares,
    coalesce((select n from ev where ev.day = d.day and ev.name = 'card_opened'), 0) as card_opens,
    coalesce((select n from ev where ev.day = d.day and ev.name = 'card_answered'), 0) as card_answers,
    (select count(*) from public.profiles p where p.signup_ref = 'card' and (p.created_at at time zone 'UTC')::date = d.day) as signups_from_cards,
    (select count(*) from public.live_games g where g.invite_code is not null and (g.created_at at time zone 'UTC')::date = d.day) as invites_created,
    coalesce((select n from ev where ev.day = d.day and ev.name = 'invite_opened'), 0) as invite_opens,
    (select count(*) from public.profiles p where p.signup_ref = 'invite' and (p.created_at at time zone 'UTC')::date = d.day) as signups_from_invites,
    (select count(*) from public.profiles p where not p.is_demo and (p.created_at at time zone 'UTC')::date = d.day) as signups_total
  from days d
  order by d.day desc;

-- One-line summary for the last 7 days.
create or replace view analytics.summary_7d as
  select
    sum(sessions_completed) as sessions_completed,
    sum(shares) as shares,
    round(100.0 * sum(shares) / nullif(sum(sessions_completed), 0), 1) as share_rate_pct,
    sum(card_opens) as card_opens,
    round(100.0 * sum(card_answers) / nullif(sum(card_opens), 0), 1) as card_answer_pct,
    sum(invite_opens) as invite_opens,
    round(100.0 * sum(signups_from_invites) / nullif(sum(invite_opens), 0), 1) as invite_to_signup_pct,
    sum(signups_total) as signups
  from analytics.daily_funnel
  where day > current_date - 7;

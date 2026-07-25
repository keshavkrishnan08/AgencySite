-- Axon Careers — complete, RLS-protected Supabase schema.
-- Run once in the Supabase SQL editor (or via the Supabase MCP / Management API).
-- The app works on localStorage without this; this makes accounts, history, and
-- Premium stick across devices, and lets the Stripe webhook record who paid.
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Tables
--
-- Three tables, matching the three things the product actually stores:
--   profiles      who you are
--   sessions      every scored practice session (the metrics page reads these)
--   subscriptions who is paying, written only by the Stripe webhook
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  situation text,
  target_role text,
  company text,
  interview_gap text,
  plan text not null default 'free',            -- 'free' | 'premium'
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id text,                                -- the browser-side session id
  target_role text,
  company text,
  mode text not null default 'practice',         -- practice | focus | predicted
  overall integer,
  dimensions jsonb,
  duration_seconds integer,
  answers jsonb,
  data jsonb,                                    -- the full Session record
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on public.sessions (user_id, created_at desc);
-- The client upserts on (user_id, client_id); without this unique index that
-- upsert errors and history silently stops syncing.
create unique index if not exists sessions_user_client_idx on public.sessions (user_id, client_id);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null,                          -- active|trialing|past_due|unpaid|canceled|paused|incomplete...
  plan text not null default 'premium',
  interval text,                                 -- monthly | quarterly | annual (legacy)
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  price_id text,
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_email_idx on public.subscriptions (email);

-- Idempotency ledger: the webhook inserts each Stripe event.id here and skips
-- any that already exist (at-least-once delivery → duplicates). Service-role
-- only (RLS on, no policy).
create table if not exists public.stripe_events (
  id text primary key,                           -- Stripe evt_... id
  type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb
);
alter table public.stripe_events enable row level security;

-- Product analytics: the durable, first-party copy of every tracked event
-- (page views, funnel steps, clicks). Written only by the server (/api/event)
-- with the service role, so ad blockers can't bias it the way a pixel-only
-- funnel is biased. The in-app Reports page reads from here. RLS on with NO
-- policy => service role only; the anon/public key sees nothing.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  name text not null,                            -- funnel event or area:thing micro-event
  anon_id text,
  email text,
  props jsonb,
  path text,                                     -- the page it fired on
  referrer text,
  utm_source text,
  utm_campaign text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists events_name_idx on public.events (name, created_at desc);
create index if not exists events_path_idx on public.events (path, created_at desc);
create index if not exists events_created_idx on public.events (created_at desc);
alter table public.events enable row level security;

-- Older deployments may predate these columns. Add them in place so re-running
-- this file upgrades an existing project instead of failing on it.
alter table public.subscriptions add column if not exists interval text;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists price_id text;
alter table public.sessions      add column if not exists client_id text;
alter table public.sessions      add column if not exists data jsonb;

-- Tables from the trimmed-down feature set. Dropped so the schema matches the
-- app exactly and no orphaned user data lingers.
drop table if exists public.schedule;
drop table if exists public.plans;
drop table if exists public.interviews;

-- ---------------------------------------------------------------------------
-- Row Level Security: every table on. Users touch only their own rows.
-- subscriptions has RLS on with NO policy, so only the service role (Stripe
-- webhook) can read or write it. The public/anon key sees nothing.
-- ---------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.sessions      enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Analytics rollup for the in-app Reports page. One call returns the whole
-- page-by-page report as JSON: totals, pageviews per path, top events, the
-- Land -> Subscribe funnel, and a daily series. security definer so it can read
-- the RLS-protected events table.
-- ---------------------------------------------------------------------------
create or replace function public.report_summary(days int default 30)
returns jsonb
language sql
security definer set search_path = public
as $$
  with win as (
    select * from public.events where created_at >= now() - (days || ' days')::interval
  ),
  totals as (
    select count(*) as events,
           count(distinct anon_id) as visitors,
           count(*) filter (where name = 'page:view') as pageviews,
           count(distinct email) filter (where email is not null) as identified
    from win
  ),
  pages as (
    select coalesce(path, '(none)') as path,
           count(*) filter (where name = 'page:view') as views,
           count(distinct anon_id) filter (where name = 'page:view') as visitors
    from win group by 1
    having count(*) filter (where name = 'page:view') > 0
    order by views desc limit 20
  ),
  ev as (
    select name, count(*) as count, count(distinct anon_id) as users
    from win group by 1 order by count desc limit 25
  ),
  funnel as (
    select count(distinct anon_id) filter (where name = 'page:view') as land,
           count(distinct anon_id) filter (where name = 'onboarding_situation') as onboard,
           count(distinct anon_id) filter (where name = 'onboarding_complete') as onboard_done,
           count(distinct anon_id) filter (where name = 'account_created') as account,
           count(distinct anon_id) filter (where name = 'session_complete') as scored,
           count(distinct anon_id) filter (where name = 'upgrade_success') as subscribed
    from win
  ),
  daily as (
    select to_char(date_trunc('day', created_at), 'MM-DD') as day,
           count(*) as events,
           count(*) filter (where name = 'page:view') as views
    from win group by date_trunc('day', created_at) order by date_trunc('day', created_at)
  )
  select jsonb_build_object(
    'days', days,
    'totals', (select to_jsonb(totals) from totals),
    'pages', coalesce((select jsonb_agg(to_jsonb(pages)) from pages), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(ev)) from ev), '[]'::jsonb),
    'funnel', (select to_jsonb(funnel) from funnel),
    'daily', coalesce((select jsonb_agg(to_jsonb(daily)) from daily), '[]'::jsonb)
  );
$$;

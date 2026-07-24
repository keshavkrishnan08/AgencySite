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
  status text not null,                          -- active|trialing|canceled|past_due|...
  plan text not null default 'premium',
  interval text,                                 -- monthly | quarterly | annual (legacy)
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_email_idx on public.subscriptions (email);

-- Older deployments may predate these columns. Add them in place so re-running
-- this file upgrades an existing project instead of failing on it.
alter table public.subscriptions add column if not exists interval text;
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

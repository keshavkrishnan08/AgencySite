-- Axon Careers — complete, RLS-protected Supabase schema.
-- Run once in the Supabase SQL editor (or via the Supabase MCP / Management API).
-- The app works on localStorage without this; this makes accounts, history, and
-- Premium stick across devices, and lets the Stripe webhook record who paid.
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  situation text,
  target_role text,
  interview_gap text,
  plan text not null default 'free',            -- 'free' | 'premium'
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_role text,
  company text,
  mode text not null default 'practice',
  overall integer,
  dimensions jsonb,
  duration_seconds integer,
  answers jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on public.sessions (user_id, created_at desc);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company text,
  role text,
  date date,
  status text not null default 'upcoming',       -- upcoming|completed|callback|offer|rejected
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists interviews_user_idx on public.interviews (user_id, date);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company text,
  role text,
  interview_date date,
  days jsonb,                                    -- the day-by-day task plan
  created_at timestamptz not null default now()
);
create index if not exists plans_user_idx on public.plans (user_id);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null,                          -- active|trialing|canceled|...
  plan text not null default 'premium',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_email_idx on public.subscriptions (email);

-- ---------------------------------------------------------------------------
-- Row Level Security: every table on. Users touch only their own rows.
-- subscriptions has RLS on with NO policy, so only the service role (Stripe
-- webhook) can read or write it. The public/anon key sees nothing.
-- ---------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.sessions      enable row level security;
alter table public.interviews    enable row level security;
alter table public.plans         enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own interviews" on public.interviews;
create policy "own interviews" on public.interviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own plans" on public.plans;
create policy "own plans" on public.plans
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

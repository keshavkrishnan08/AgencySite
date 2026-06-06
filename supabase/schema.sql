-- PrepPath — Supabase schema for real accounts + enforceable Premium.
-- Run this in the Supabase SQL editor. See the "Go live" steps in MONETIZATION.md.
-- The app works on localStorage without this; this is what makes Premium stick
-- across devices and lets the Stripe webhook record who actually paid.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  situation text,
  target_role text,
  interview_gap text,
  plan text not null default 'free',          -- 'free' | 'premium'
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  target_role text,
  company text,
  mode text not null default 'practice',
  overall integer,
  dimensions jsonb,
  duration_seconds integer,
  answers jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null,                        -- active | trialing | canceled | ...
  plan text not null default 'premium',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_email_idx on public.subscriptions (email);

-- Row Level Security: users see only their own rows.
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- subscriptions is written by the Stripe webhook (service role) only; no public policy.

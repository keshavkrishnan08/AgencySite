-- Monad schema. Run in the Supabase SQL editor. Safe to re-run.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles — one per authenticated user, created by trigger on signup.
-- subscription_status is the single source of truth for entitlement.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text,
  first_name             text,
  subscription_status    text not null default 'free'
                           check (subscription_status in ('free','trialing','weekly','annual','past_due','canceled')),
  subscription_expiry    timestamptz,
  trial_ends_at          timestamptz,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  marketing_opt_in       boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists profiles_stripe_customer_idx on public.profiles(stripe_customer_id);
create index if not exists profiles_status_idx on public.profiles(subscription_status);

-- ---------------------------------------------------------------------------
-- charts — created at step 2 of /start, BEFORE any account exists.
-- access_token gates anonymous reads; email is captured at the same moment,
-- which is what makes the nurture sequence possible.
-- ---------------------------------------------------------------------------
create table if not exists public.charts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  access_token     text not null default encode(gen_random_bytes(24), 'hex'),
  email            text,
  first_name       text not null,

  birth_date       date not null,
  birth_time       time,
  birth_time_known boolean not null default true,
  birth_place      text not null,
  birth_lat        double precision not null,
  birth_lon        double precision not null,
  birth_tz         text not null,
  birth_utc        timestamptz not null,

  archetype        text not null,
  sun_sign         text not null,
  moon_sign        text not null,
  rising_sign      text,
  midheaven_sign   text,
  life_path        integer not null,
  chinese_sign     text not null,
  chart            jsonb not null,
  utm              jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists charts_user_idx    on public.charts(user_id);
create index if not exists charts_email_idx   on public.charts(email);
create index if not exists charts_created_idx on public.charts(created_at desc);

-- ---------------------------------------------------------------------------
-- readings — the six-section document. Generated once, then served from here.
-- ---------------------------------------------------------------------------
create table if not exists public.readings (
  id         uuid primary key default gen_random_uuid(),
  chart_id   uuid not null references public.charts(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  sections   jsonb not null,
  model      text,
  created_at timestamptz not null default now(),
  unique (chart_id)
);

-- ---------------------------------------------------------------------------
-- daily_briefs — one per user per day.
-- ---------------------------------------------------------------------------
create table if not exists public.daily_briefs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  chart_id     uuid references public.charts(id) on delete cascade,
  brief_date   date not null,
  headline     text not null,
  body         text not null,
  action       text,
  transits     jsonb,
  created_at   timestamptz not null default now(),
  unique (user_id, brief_date)
);

-- ---------------------------------------------------------------------------
-- chat_messages — "chat with your chart".
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_user_idx on public.chat_messages(user_id, created_at);

-- ---------------------------------------------------------------------------
-- email_events — drives the nurture sequence and prevents doubles.
-- ---------------------------------------------------------------------------
create table if not exists public.email_events (
  id         uuid primary key default gen_random_uuid(),
  chart_id   uuid references public.charts(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  email      text not null,
  kind       text not null,
  sent_at    timestamptz not null default now(),
  unique (chart_id, kind)
);

create index if not exists email_events_email_idx on public.email_events(email);

-- ---------------------------------------------------------------------------
-- stripe_events — webhook idempotency. Stripe retries; never double-apply.
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS. The service-role key bypasses all of this and is used only in server
-- routes that have already established who the caller is.
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.charts        enable row level security;
alter table public.readings      enable row level security;
alter table public.daily_briefs  enable row level security;
alter table public.chat_messages enable row level security;
alter table public.email_events  enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists "own profile read"  on public.profiles;
drop policy if exists "own profile write" on public.profiles;
create policy "own profile read"  on public.profiles for select using (auth.uid() = id);
create policy "own profile write" on public.profiles for update using (auth.uid() = id);

drop policy if exists "own charts" on public.charts;
create policy "own charts" on public.charts for select using (auth.uid() = user_id);

drop policy if exists "own readings" on public.readings;
create policy "own readings" on public.readings for select using (auth.uid() = user_id);

drop policy if exists "own briefs" on public.daily_briefs;
create policy "own briefs" on public.daily_briefs for select using (auth.uid() = user_id);

drop policy if exists "own chat read"  on public.chat_messages;
create policy "own chat read" on public.chat_messages for select using (auth.uid() = user_id);

-- email_events and stripe_events are service-role only: no policies granted.

-- ---------------------------------------------------------------------------
-- Auto-create a profile on signup.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Funnel view for the daily monitoring check.
-- ---------------------------------------------------------------------------
create or replace view public.funnel_daily as
select
  date_trunc('day', c.created_at)::date          as day,
  count(*)                                        as charts,
  count(*) filter (where c.email is not null)     as with_email,
  count(*) filter (where c.user_id is not null)   as claimed,
  count(distinct p.id) filter (
    where p.subscription_status in ('trialing','weekly','annual')
  )                                               as paid
from public.charts c
left join public.profiles p on p.id = c.user_id
group by 1
order by 1 desc;

-- ---------------------------------------------------------------------------
-- compatibility — cofounders, partners, hires. One row per person compared.
-- ---------------------------------------------------------------------------
create table if not exists public.compatibility (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  first_name       text not null,
  relationship     text,
  birth_date       date not null,
  birth_time       time,
  birth_time_known boolean not null default true,
  birth_place      text not null,
  birth_lat        double precision not null,
  birth_lon        double precision not null,
  birth_tz         text not null,
  archetype        text not null,
  sun_sign         text not null,
  chart            jsonb not null,
  analysis         jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists compatibility_user_idx on public.compatibility(user_id);

-- ---------------------------------------------------------------------------
-- outlooks — weekly and monthly. Cached per user per period.
-- ---------------------------------------------------------------------------
create table if not exists public.outlooks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  chart_id     uuid references public.charts(id) on delete cascade,
  period       text not null check (period in ('week','month')),
  period_start date not null,
  headline     text not null,
  summary      text not null,
  windows      jsonb not null,
  created_at   timestamptz not null default now(),
  unique (user_id, period, period_start)
);

alter table public.compatibility enable row level security;
alter table public.outlooks      enable row level security;

drop policy if exists "own compat read"   on public.compatibility;
drop policy if exists "own compat write"  on public.compatibility;
drop policy if exists "own compat delete" on public.compatibility;
create policy "own compat read"   on public.compatibility for select using (auth.uid() = user_id);
create policy "own compat write"  on public.compatibility for insert with check (auth.uid() = user_id);
create policy "own compat delete" on public.compatibility for delete using (auth.uid() = user_id);

drop policy if exists "own outlooks" on public.outlooks;
create policy "own outlooks" on public.outlooks for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- decisions — the decision journal on Updates.
--
-- The retention mechanic: a user who has logged calls against their windows has
-- a record only this product holds, and that record is what they come back for.
-- ---------------------------------------------------------------------------
create table if not exists public.decisions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  decided_on    date not null default (now() at time zone 'utc')::date,
  body          text not null,
  brief_date    date,
  created_at    timestamptz not null default now()
);

create index if not exists decisions_user_idx on public.decisions(user_id, decided_on desc);

alter table public.decisions enable row level security;

drop policy if exists "own decisions read"   on public.decisions;
drop policy if exists "own decisions write"  on public.decisions;
drop policy if exists "own decisions delete" on public.decisions;
create policy "own decisions read"   on public.decisions for select using (auth.uid() = user_id);
create policy "own decisions write"  on public.decisions for insert with check (auth.uid() = user_id);
create policy "own decisions delete" on public.decisions for delete using (auth.uid() = user_id);

-- Daily briefing delivery is opt-in and separate from marketing consent:
-- unsubscribing from the nurture sequence must not silently kill the product
-- email the user is paying for, and vice versa.
alter table public.profiles
  add column if not exists daily_email_opt_in boolean not null default false;

-- Trial-ending notices are claimed by (user_id, kind) rather than
-- (chart_id, kind): the notice belongs to the subscription, not the chart, and
-- chart_id is null here. Postgres treats nulls as distinct, so without this
-- index the existing constraint would never fire and a cron retry would
-- double-send a billing notice.
create unique index if not exists email_events_user_kind_idx
  on public.email_events(user_id, kind)
  where user_id is not null;

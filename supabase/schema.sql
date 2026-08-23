-- ============================================================================
-- ימשיך כבודו — database schema
--
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It is idempotent, so re-running it is safe.
--
-- Model:
--   profiles     one row per signed-in user, keyed by the auth user id
--   sentences    a sentence opener written by one user
--   completions  another user's ending for a sentence (one per user per sentence)
--
-- No secret is referenced here. The frontend talks to this schema with the
-- publishable/anon key only; every rule below is enforced by Postgres.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Additive so an earlier version of this file upgrades cleanly.
alter table public.profiles add column if not exists email      text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name  text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Guest display name, e.g. "שועל סקרן כחול עם מטרייה". NULL for provider
-- users, whose name comes from first_name / last_name.
alter table public.profiles add column if not exists display_name text;

-- Uniqueness is enforced here rather than by the client, because profiles are
-- private: a user cannot read anyone else's row to check first. A clash simply
-- fails the update and the client retries with another combination.
-- Partial, so the many NULLs for provider users do not collide.
create unique index if not exists profiles_display_name_unique
  on public.profiles (lower(display_name))
  where display_name is not null;

-- ---------------------------------------------------------------------------
-- sentences + completions
-- ---------------------------------------------------------------------------

create table if not exists public.sentences (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  text       text not null check (char_length(btrim(text)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.completions (
  id          uuid primary key default gen_random_uuid(),
  sentence_id uuid not null references public.sentences (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  text        text not null check (char_length(btrim(text)) between 1 and 200),
  created_at  timestamptz not null default now(),
  -- One completion per person per sentence.
  unique (sentence_id, author_id)
);

create index if not exists sentences_created_at_idx    on public.sentences (created_at desc);
create index if not exists sentences_author_id_idx     on public.sentences (author_id);
create index if not exists completions_sentence_id_idx on public.completions (sentence_id);
create index if not exists completions_author_id_idx   on public.completions (author_id);

-- ---------------------------------------------------------------------------
-- completion_likes
--
-- One row per (completion, user). The like *count* is deliberately not stored
-- anywhere: it is always derived by counting rows here, so a count can never
-- drift out of step with reality.
--
-- `user_id` defaults to auth.uid() so the client never has to name itself. The
-- RLS policy below still checks it — the default is ergonomics, not the
-- security boundary.
-- ---------------------------------------------------------------------------

create table if not exists public.completion_likes (
  id            uuid primary key default gen_random_uuid(),
  completion_id uuid not null references public.completions (id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  -- The last line of defence against double-likes, however the client behaves.
  unique (completion_id, user_id)
);

-- Backfills the default on a table created by an earlier version of this file.
alter table public.completion_likes alter column user_id set default auth.uid();

create index if not exists completion_likes_completion_id_idx on public.completion_likes (completion_id);
create index if not exists completion_likes_user_id_idx       on public.completion_likes (user_id);

-- ---------------------------------------------------------------------------
-- Keep profiles.updated_at honest
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Create a profile the moment a user signs up.
--
-- The client also upserts the profile after sign-in; this trigger means the
-- row exists even before that round-trip completes, so the first sentence a
-- user writes can never fail its foreign key.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text  := coalesce(meta ->> 'full_name', meta ->> 'name', '');
begin
  insert into public.profiles (id, email, first_name, last_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(nullif(meta ->> 'given_name', ''), nullif(split_part(full_name, ' ', 1), '')),
    coalesce(
      nullif(meta ->> 'family_name', ''),
      nullif(btrim(substr(full_name, strpos(full_name, ' '))), '')
    ),
    coalesce(meta ->> 'avatar_url', meta ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- profiles     private: a user may only read and write their own row.
-- sentences    the shared feed: readable by any signed-in user, writable only
--              by its author.
-- completions  same as sentences.
--
-- Nothing is granted to the anonymous role, so the publishable key alone
-- reads nothing.
-- ---------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.sentences        enable row level security;
alter table public.completions      enable row level security;
alter table public.completion_likes enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles are readable by signed-in users" on public.profiles;

drop policy if exists "a user may read their own profile" on public.profiles;
create policy "a user may read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "a user may create their own profile" on public.profiles;
create policy "a user may create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "a user may update their own profile" on public.profiles;
create policy "a user may update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- sentences -----------------------------------------------------------------
drop policy if exists "sentences are readable by signed-in users" on public.sentences;
create policy "sentences are readable by signed-in users"
  on public.sentences for select to authenticated
  using (true);

drop policy if exists "a user may write their own sentences" on public.sentences;
create policy "a user may write their own sentences"
  on public.sentences for insert to authenticated
  with check ((select auth.uid()) = author_id);

drop policy if exists "a user may delete their own sentences" on public.sentences;
create policy "a user may delete their own sentences"
  on public.sentences for delete to authenticated
  using ((select auth.uid()) = author_id);

-- completions ---------------------------------------------------------------
drop policy if exists "completions are readable by signed-in users" on public.completions;
create policy "completions are readable by signed-in users"
  on public.completions for select to authenticated
  using (true);

drop policy if exists "a user may write their own completions" on public.completions;
create policy "a user may write their own completions"
  on public.completions for insert to authenticated
  with check ((select auth.uid()) = author_id);

drop policy if exists "a user may delete their own completions" on public.completions;
create policy "a user may delete their own completions"
  on public.completions for delete to authenticated
  using ((select auth.uid()) = author_id);

-- completion_likes ----------------------------------------------------------
-- Counts are public to signed-in users, which is what makes a shared like
-- count possible at all. Writing is restricted to the caller's own row: there
-- is no policy under which a user can insert or delete a like owned by anyone
-- else, so a forged user_id in the request body is rejected by Postgres rather
-- than trusted.
--
-- Anonymous (guest) sessions hold the same `authenticated` role and are
-- covered by these policies unchanged — there is no separate guest path.
drop policy if exists "likes are readable by signed-in users" on public.completion_likes;
create policy "likes are readable by signed-in users"
  on public.completion_likes for select to authenticated
  using (true);

drop policy if exists "a user may like as themselves" on public.completion_likes;
create policy "a user may like as themselves"
  on public.completion_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "a user may remove their own like" on public.completion_likes;
create policy "a user may remove their own like"
  on public.completion_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Deliberately no UPDATE policy: a like has no mutable state, and its absence
-- means a row can never be reassigned to another user.

-- ---------------------------------------------------------------------------
-- Public author cards
--
-- `profiles` stays private — a user still reads only their own row, and email
-- is never exposed anywhere. This view publishes ONLY what is needed to
-- attribute a sentence or completion to its author: id, name and picture.
--
-- Deliberately not `security_invoker`, so it can read past the base table's
-- RLS; the narrow column list is what keeps that safe.
-- ---------------------------------------------------------------------------
create or replace view public.public_profiles as
select id, display_name, first_name, avatar_url
from public.profiles;

grant select on public.public_profiles to authenticated;

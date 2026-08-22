-- ============================================================================
-- ימשיך כבודו — database schema
--
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste →
-- Run. It is idempotent, so re-running is safe.
--
-- Model:
--   profiles     one row per signed-in user, created automatically on signup
--   sentences    a sentence opener written by one user
--   completions  another user's ending for a sentence (one per user per sentence)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

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
-- Create a profile automatically whenever a user signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      'משתמש'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
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
-- Everything is readable by any signed-in user (it is a social feed), but a
-- row may only be written by the user who owns it. Nothing is exposed to the
-- anonymous role.
-- ---------------------------------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.sentences   enable row level security;
alter table public.completions enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles are readable by signed-in users" on public.profiles;
create policy "profiles are readable by signed-in users"
  on public.profiles for select to authenticated
  using (true);

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

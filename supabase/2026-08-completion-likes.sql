-- ---------------------------------------------------------------------------
-- Likes on completions.
--
-- Run this once in the Supabase SQL Editor. It is idempotent and purely
-- additive: it creates one new table and its policies, and touches no existing
-- table, row or policy.
--
-- Design note: there is no like_count column anywhere. The count is always
-- `count(*)` over this table, so it cannot drift.
-- ---------------------------------------------------------------------------

create table if not exists public.completion_likes (
  id            uuid primary key default gen_random_uuid(),
  completion_id uuid not null references public.completions (id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  -- The last line of defence against double-likes, however the client behaves.
  unique (completion_id, user_id)
);

-- Ergonomics, not security: the client never has to name itself, and the RLS
-- policy below still verifies whatever value ends up in the column.
alter table public.completion_likes alter column user_id set default auth.uid();

create index if not exists completion_likes_completion_id_idx on public.completion_likes (completion_id);
create index if not exists completion_likes_user_id_idx       on public.completion_likes (user_id);

alter table public.completion_likes enable row level security;

-- Readable by any signed-in user — that is what makes a shared count possible.
drop policy if exists "likes are readable by signed-in users" on public.completion_likes;
create policy "likes are readable by signed-in users"
  on public.completion_likes for select to authenticated
  using (true);

-- A user may only ever create a like that belongs to them.
drop policy if exists "a user may like as themselves" on public.completion_likes;
create policy "a user may like as themselves"
  on public.completion_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ...and may only ever remove their own.
drop policy if exists "a user may remove their own like" on public.completion_likes;
create policy "a user may remove their own like"
  on public.completion_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Deliberately no UPDATE policy: a like has no mutable state, and its absence
-- means an existing row can never be reassigned to another user.

-- ---------------------------------------------------------------------------
-- verify
-- ---------------------------------------------------------------------------

-- Expect: the table, the unique constraint, both indexes, rls_enabled = true,
-- and exactly three policies (select / insert / delete).
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'completion_likes')          as table_present,
  (select count(*) from pg_indexes
     where schemaname = 'public' and tablename = 'completion_likes')             as index_count,
  (select relrowsecurity from pg_class
     where oid = 'public.completion_likes'::regclass)                            as rls_enabled,
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'completion_likes')             as policy_count;

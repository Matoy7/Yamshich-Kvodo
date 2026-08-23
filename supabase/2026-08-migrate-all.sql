-- ---------------------------------------------------------------------------
-- Run this whole file once in the Supabase SQL Editor.
--
-- It combines the two August 2026 migrations and is safe to re-run: every
-- statement is idempotent, and none of them touch existing data or RLS.
--
--   1. profiles.display_name  — the generated guest name, plus its uniqueness
--                               guarantee.
--   2. public.public_profiles — a narrow view for author attribution.
--
-- What this does NOT do: it does not make `profiles` readable. Users still see
-- only their own row there, and `email`, `last_name` and `updated_at` remain
-- unreachable through the view.
-- ---------------------------------------------------------------------------

-- 1 ── guest display names ---------------------------------------------------

alter table public.profiles add column if not exists display_name text;

-- Case-insensitive uniqueness, so two guests can never hold the same name.
-- Partial, so the many NULLs on provider users do not collide.
create unique index if not exists profiles_display_name_unique
  on public.profiles (lower(display_name))
  where display_name is not null;

-- 2 ── public author cards ---------------------------------------------------

-- Only the three fields needed to attribute a sentence or completion to its
-- author: id, name and picture. The view is intentionally not security_invoker
-- — it reads past the base table's RLS — which is exactly why the column list
-- is this narrow.
create or replace view public.public_profiles as
select id, display_name, first_name, avatar_url
from public.profiles;

grant select on public.public_profiles to authenticated;

-- 3 ── verify ----------------------------------------------------------------

-- Both rows below should come back. If either is missing, the statement above
-- it did not apply.
select 'profiles.display_name' as object, count(*) as present
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name'
union all
select 'public_profiles view', count(*)
from information_schema.views
where table_schema = 'public' and table_name = 'public_profiles';

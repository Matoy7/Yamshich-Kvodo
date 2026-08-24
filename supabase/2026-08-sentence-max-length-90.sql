-- ---------------------------------------------------------------------------
-- Tightens the sentence-opener length limit from 120 to 90 characters.
--
-- Run this once in the Supabase SQL Editor. It is idempotent — re-running it
-- is safe and a no-op the second time — and it touches only the CHECK
-- constraint on public.sentences.text. Nothing else changes: completions
-- keep their existing 1–200 character range untouched.
--
-- Safety: the DROP + ADD below run inside one transaction. If any existing
-- sentence is already longer than 90 characters, adding the new, stricter
-- constraint fails and Postgres rolls the whole transaction back — the
-- original 1–120 constraint is left exactly as it was. No row is ever
-- silently modified, truncated or deleted by this migration. The RAISE
-- NOTICE below surfaces any such rows *before* that happens, so the
-- follow-up plan is your decision, not this script's.
-- ---------------------------------------------------------------------------

-- 1 ── check for existing content that would violate the new limit ----------

do $$
declare
  oversized_count integer;
begin
  select count(*) into oversized_count
  from public.sentences
  where char_length(btrim(text)) > 90;

  if oversized_count > 0 then
    raise notice
      '% existing sentence(s) are longer than 90 characters. '
      'The constraint change below will FAIL (and roll back cleanly, '
      'changing nothing) until those rows are shortened or otherwise '
      'handled. Run: select id, char_length(btrim(text)) as length, text '
      'from public.sentences where char_length(btrim(text)) > 90; '
      'to see them.',
      oversized_count;
  else
    raise notice 'No existing sentences exceed 90 characters — safe to proceed.';
  end if;
end $$;

-- 2 ── replace the constraint, atomically ------------------------------------

begin;

-- Finds whatever the existing length CHECK constraint on sentences.text is
-- actually named (Postgres auto-names it, and that name is not guaranteed
-- across environments) and drops it, rather than guessing a literal name.
do $$
declare
  existing_constraint text;
begin
  select con.conname into existing_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'sentences'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%char_length(btrim(text))%';

  if existing_constraint is not null then
    execute format('alter table public.sentences drop constraint %I', existing_constraint);
  end if;
end $$;

-- Explicitly named so this migration can find and replace it cleanly on a
-- future re-run, instead of relying on Postgres's auto-generated name again.
alter table public.sentences
  add constraint sentences_text_length_check
  check (char_length(btrim(text)) between 1 and 90);

commit;

-- ---------------------------------------------------------------------------
-- verify
-- ---------------------------------------------------------------------------

-- Expect exactly one row, showing the 1–90 range on public.sentences.text.
select
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'sentences'
  and con.contype = 'c';

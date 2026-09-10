-- ---------------------------------------------------------------------------
-- שם טוב — phase 3: structured name tags for filtering.
--
-- Run once in the Supabase SQL Editor, after 2026-09-shem-tov-phase2.sql.
-- Purely additive: three new nullable columns on an existing table, each
-- constrained to a fixed vocabulary so the filter UI's option lists and the
-- database's allowed values can never drift apart.
--
-- origin already existed as free text (set per name by whoever suggested
-- it) and is left as-is — it is not re-constrained here, so existing rows
-- are untouched. meaning/style/popularity are new and start NULL on every
-- existing row; a name with no tag simply doesn't match a filter for that
-- dimension until it's tagged, the same way an untagged photo doesn't
-- appear under a hashtag.
-- ---------------------------------------------------------------------------

alter table public.names
  add column if not exists meaning text
    check (meaning is null or meaning in ('love', 'nature', 'light', 'strength', 'joy', 'freedom')),
  add column if not exists style text
    check (style is null or style in ('classic', 'modern', 'unique', 'soft', 'traditional', 'vintage')),
  add column if not exists popularity text
    check (popularity is null or popularity in ('popular', 'less_common', 'rare', 'very_rare'));

create index if not exists names_meaning_idx    on public.names (meaning)    where meaning is not null;
create index if not exists names_style_idx      on public.names (style)      where style is not null;
create index if not exists names_popularity_idx on public.names (popularity) where popularity is not null;

-- No RLS change needed: these are plain columns on an already-RLS-protected
-- table, covered by the existing select/insert/delete policies on `names`.

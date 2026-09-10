-- ---------------------------------------------------------------------------
-- שם טוב — phase 4: real name-catalogue schema + 200-name seed data.
--
-- Run once in the Supabase SQL Editor, after 2026-09-shem-tov-phase3-tags.sql.
--
-- What changed and why:
--
-- Phase 3 added `meaning` and `style` as single-value enum columns on
-- `names`. The real dataset makes clear that was the wrong shape — a name
-- can be BOTH "love" and "nature", both "classic" and "traditional" — so
-- this migration drops those two columns and replaces them with one boolean
-- flag column per tag (meaning_love, style_classic, etc.), matching origin
-- and gender-like filtering: AND across categories, OR within a category,
-- by combining independent boolean predicates. `origin` (free text) and
-- `popularity` (the existing enum) are kept — the origin flags below are
-- new, additive columns alongside the existing free-text `origin`, not a
-- replacement of it.
--
-- No suggestion (family_id is not null) has ever had meaning/style set —
-- the suggestion form never exposed those fields — so dropping the two old
-- columns loses no real data.
-- ---------------------------------------------------------------------------

alter table public.names
  drop column if exists meaning,
  drop column if exists style;

alter table public.names
  add column if not exists length              integer,
  add column if not exists syllables            integer,
  add column if not exists name_quality_score   integer,

  add column if not exists biblical             boolean not null default false,
  add column if not exists hebrew               boolean not null default false,
  add column if not exists israeli              boolean not null default false,
  add column if not exists international        boolean not null default false,
  add column if not exists arabic               boolean not null default false,
  add column if not exists european             boolean not null default false,

  add column if not exists meaning_love         boolean not null default false,
  add column if not exists meaning_nature       boolean not null default false,
  add column if not exists meaning_light        boolean not null default false,
  add column if not exists meaning_strength     boolean not null default false,
  add column if not exists meaning_joy          boolean not null default false,
  add column if not exists meaning_freedom      boolean not null default false,

  add column if not exists style_classic        boolean not null default false,
  add column if not exists style_modern         boolean not null default false,
  add column if not exists style_unique         boolean not null default false,
  add column if not exists style_soft           boolean not null default false,
  add column if not exists style_traditional    boolean not null default false,
  add column if not exists style_vintage        boolean not null default false,

  add column if not exists popularity_score     integer,
  add column if not exists short                boolean not null default false,
  add column if not exists easy_in_english      boolean not null default false,
  add column if not exists works_internationally boolean not null default false,

  add column if not exists starts_with          char(1),
  add column if not exists ends_with            char(1);

-- Indexes: partial (only rows where the flag is true) for the boolean tags,
-- since a filter query only ever asks "which rows have this true" — a full
-- index over both true and false wastes half its size on rows the query
-- never wants. Plain indexes for the columns used in equality/range filters.

create index if not exists names_gender_idx        on public.names (gender);
create index if not exists names_popularity_idx2    on public.names (popularity);
create index if not exists names_starts_with_idx    on public.names (starts_with);
create index if not exists names_ends_with_idx      on public.names (ends_with);
create index if not exists names_length_idx         on public.names (length);

create index if not exists names_biblical_idx      on public.names (id) where biblical;
create index if not exists names_hebrew_idx        on public.names (id) where hebrew;
create index if not exists names_israeli_idx       on public.names (id) where israeli;
create index if not exists names_international_idx on public.names (id) where international;
create index if not exists names_arabic_idx        on public.names (id) where arabic;
create index if not exists names_european_idx      on public.names (id) where european;

create index if not exists names_meaning_love_idx      on public.names (id) where meaning_love;
create index if not exists names_meaning_nature_idx    on public.names (id) where meaning_nature;
create index if not exists names_meaning_light_idx     on public.names (id) where meaning_light;
create index if not exists names_meaning_strength_idx  on public.names (id) where meaning_strength;
create index if not exists names_meaning_joy_idx       on public.names (id) where meaning_joy;
create index if not exists names_meaning_freedom_idx   on public.names (id) where meaning_freedom;

create index if not exists names_style_classic_idx     on public.names (id) where style_classic;
create index if not exists names_style_modern_idx      on public.names (id) where style_modern;
create index if not exists names_style_unique_idx      on public.names (id) where style_unique;
create index if not exists names_style_soft_idx        on public.names (id) where style_soft;
create index if not exists names_style_traditional_idx on public.names (id) where style_traditional;
create index if not exists names_style_vintage_idx     on public.names (id) where style_vintage;

create index if not exists names_short_idx                  on public.names (id) where short;
create index if not exists names_easy_in_english_idx        on public.names (id) where easy_in_english;
create index if not exists names_works_internationally_idx  on public.names (id) where works_internationally;

-- ---------------------------------------------------------------------------
-- Seed data: 200 shared-catalogue names (family_id null, suggested_by null —
-- required by the existing check constraint that ties the two together).
--
-- ON CONFLICT is not used: `names` has no unique constraint on `text` (two
-- different families are allowed to suggest the same name independently),
-- so re-running this INSERT would duplicate all 200 rows. Guarded instead
-- with a row-count check — safe to run once; re-running is a deliberate
-- no-op rather than a silent duplicate-creator.
-- ---------------------------------------------------------------------------

do $$
begin
  if (select count(*) from public.names where family_id is null) >= 200 then
    raise notice 'Catalogue already has 200+ shared names — skipping seed insert.';
  else
    insert into public.names (
      text, gender, origin, length, syllables,
      biblical, hebrew, israeli, international, arabic, european,
      meaning_love, meaning_nature, meaning_light, meaning_strength, meaning_joy, meaning_freedom,
      style_classic, style_modern, style_unique, style_soft, style_traditional, style_vintage,
      popularity, popularity_score,
      short, easy_in_english, works_internationally,
      starts_with, ends_with, name_quality_score
    )
    values
  ('אביגיל', 'girl', 'Biblical;Hebrew', 5, 3, true, true, false, false, false, false, false, false, false, false, true, false, true, false, false, false, true, false, 'popular', 4, false, true, true, 'א', 'ל', 6),
  ('אדם', 'boy', 'Biblical;Hebrew;International', 3, 2, true, true, false, true, false, false, false, true, false, true, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'א', 'ם', 7),
  ('אדל', 'girl', 'International;European', 3, 2, false, false, false, true, false, true, true, false, false, false, false, false, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'א', 'ל', 6),
  ('אדר', 'unisex', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, true, false, true, false, false, false, true, true, false, false, false, 'less_common', 3, true, true, true, 'א', 'ר', 6),
  ('אורי', 'unisex', 'Biblical;Hebrew;Israeli', 3, 2, true, true, true, false, false, false, false, false, true, false, true, false, false, true, false, true, false, false, 'popular', 4, true, true, true, 'א', 'י', 7),
  ('אור', 'unisex', 'Hebrew;Israeli', 2, 1, false, true, true, false, false, false, false, false, true, false, false, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'א', 'ר', 7),
  ('אורן', 'boy', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, false, false, false, true, true, false, false, false, false, 'less_common', 3, true, true, true, 'א', 'ן', 6),
  ('אייל', 'boy', 'Biblical;Hebrew;Israeli', 3, 2, true, true, true, false, false, false, false, true, false, true, false, false, true, false, false, true, false, false, 'less_common', 3, true, true, true, 'א', 'ל', 6),
  ('איילה', 'girl', 'Biblical;Hebrew', 4, 3, true, true, false, false, false, false, false, true, false, false, false, false, true, false, false, true, false, false, 'less_common', 3, true, true, true, 'א', 'ה', 6),
  ('איתן', 'boy', 'Biblical;Hebrew;International', 4, 2, true, true, false, true, false, false, false, false, false, true, false, false, true, false, false, false, true, false, 'popular', 4, true, true, true, 'א', 'ן', 7),
  ('אלון', 'boy', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, true, false, true, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'א', 'ן', 7),
  ('אלה', 'girl', 'Biblical;Hebrew;Israeli', 3, 2, true, true, true, false, false, false, false, true, false, false, false, false, false, true, false, true, false, false, 'popular', 4, true, true, true, 'א', 'ה', 7),
  ('אלי', 'unisex', 'Biblical;Hebrew;International', 3, 2, true, true, false, true, false, false, false, false, false, true, true, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'א', 'י', 7),
  ('אליה', 'girl', 'Biblical;Hebrew', 4, 3, true, true, false, false, false, false, true, false, true, false, false, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'א', 'ה', 6),
  ('אליהו', 'boy', 'Biblical;Hebrew', 5, 4, true, true, false, false, false, false, false, false, false, true, false, false, true, false, false, false, true, false, 'less_common', 3, false, true, true, 'א', 'ו', 5),
  ('אלמוג', 'unisex', 'Hebrew;Israeli', 5, 3, false, true, true, false, false, false, false, true, false, false, false, false, false, true, true, false, false, false, 'less_common', 3, false, true, true, 'א', 'ג', 5),
  ('אלעד', 'boy', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, false, false, true, true, false, true, true, false, false, false, false, 'less_common', 3, true, true, true, 'א', 'ד', 6),
  ('אמיר', 'boy', 'Hebrew;Arabic;International', 4, 2, false, true, false, true, true, false, false, false, false, true, false, false, true, true, false, false, false, false, 'less_common', 3, true, true, true, 'א', 'ר', 6),
  ('אמה', 'girl', 'International;European', 3, 2, false, false, false, true, false, true, true, false, false, false, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'א', 'ה', 7),
  ('ארבל', 'unisex', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, true, false, false, false, false, false, true, true, false, false, false, 'less_common', 3, true, true, true, 'א', 'ל', 6),
  ('אריאל', 'unisex', 'Biblical;Hebrew;International', 5, 3, true, true, false, true, false, false, false, false, true, true, false, false, true, true, false, false, false, false, 'popular', 4, false, true, true, 'א', 'ל', 6),
  ('ארז', 'boy', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, true, false, true, false, false, true, true, false, false, false, false, 'less_common', 3, true, true, true, 'א', 'ז', 6),
  ('אסף', 'boy', 'Biblical;Hebrew', 3, 2, true, true, false, false, false, false, true, false, false, false, true, false, true, false, false, false, true, false, 'less_common', 3, true, true, true, 'א', 'ף', 6),
  ('אופק', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, false, false, true, false, true, true, false, false, false, 'popular', 4, true, true, true, 'א', 'ק', 7),
  ('אפרת', 'girl', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, true, false, false, false, false, true, false, false, false, true, false, 'less_common', 3, true, true, true, 'א', 'ת', 6),
  ('בר', 'unisex', 'Biblical;Hebrew;Israeli', 2, 1, true, true, true, false, false, false, false, true, false, false, false, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ב', 'ר', 7),
  ('ברק', 'boy', 'Biblical;Hebrew;Israeli', 3, 2, true, true, true, false, false, false, false, false, true, true, false, false, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'ב', 'ק', 6),
  ('בתאל', 'girl', 'Biblical;Hebrew', 4, 2, true, true, false, false, false, false, true, false, false, false, false, false, false, true, false, false, true, false, 'less_common', 3, true, true, true, 'ב', 'ל', 6),
  ('גאיה', 'girl', 'International;Greek', 4, 3, false, false, false, true, false, false, false, true, false, false, true, false, false, true, true, false, false, false, 'less_common', 3, true, true, true, 'ג', 'ה', 6),
  ('גיל', 'unisex', 'Hebrew;Israeli', 3, 1, false, true, true, false, false, false, false, false, false, false, true, false, true, true, false, false, false, false, 'less_common', 3, true, true, true, 'ג', 'ל', 6),
  ('דניאל', 'unisex', 'Biblical;Hebrew;International', 5, 3, true, true, false, true, false, false, false, false, false, true, false, false, true, true, false, false, false, false, 'popular', 4, false, true, true, 'ד', 'ל', 6),
  ('דפנה', 'girl', 'Biblical;Hebrew;Greek', 4, 2, true, true, false, false, false, false, false, true, false, false, false, false, true, false, false, false, false, true, 'less_common', 3, true, true, true, 'ד', 'ה', 6),
  ('דנה', 'girl', 'Biblical;Hebrew;International', 3, 2, true, true, false, true, false, false, false, false, false, false, true, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'ד', 'ה', 7),
  ('דוד', 'boy', 'Biblical;Hebrew;International', 3, 2, true, true, false, true, false, false, true, false, false, true, false, false, true, false, false, false, true, false, 'popular', 4, true, true, true, 'ד', 'ד', 7),
  ('דור', 'unisex', 'Hebrew;Israeli', 3, 1, false, true, true, false, false, false, false, true, false, true, false, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ד', 'ר', 7),
  ('הילה', 'girl', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, true, false, false, false, true, false, false, true, false, false, 'less_common', 3, true, true, true, 'ה', 'ה', 6),
  ('הדר', 'unisex', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, false, false, false, false, false, true, true, false, false, false, false, 'less_common', 3, true, true, true, 'ה', 'ר', 6),
  ('הלל', 'unisex', 'Biblical;Hebrew', 4, 2, true, true, false, false, false, false, false, false, true, false, true, false, false, true, false, false, true, false, 'less_common', 3, true, true, true, 'ה', 'ל', 6),
  ('הראל', 'boy', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, false, false, true, false, false, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'ה', 'ל', 6),
  ('ורד', 'girl', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, true, false, false, false, false, true, false, false, false, false, true, 'less_common', 3, true, true, true, 'ו', 'ד', 6),
  ('זוהר', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, true, false, false, false, false, true, true, false, false, false, 'popular', 4, true, true, true, 'ז', 'ר', 7),
  ('זיו', 'unisex', 'Hebrew;Israeli', 3, 1, false, true, true, false, false, false, false, false, true, false, false, false, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'ז', 'ו', 6),
  ('חגי', 'boy', 'Biblical;Hebrew', 3, 2, true, true, false, false, false, false, false, false, false, false, true, false, true, false, false, false, true, false, 'less_common', 3, true, true, true, 'ח', 'י', 6),
  ('חיים', 'boy', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, false, true, true, false, true, false, false, false, true, false, 'less_common', 3, true, true, true, 'ח', 'ם', 6),
  ('טל', 'unisex', 'Biblical;Hebrew;Israeli', 2, 1, true, true, true, false, false, false, false, true, false, false, false, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ט', 'ל', 7),
  ('טלי', 'girl', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, true, false, false, true, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'ט', 'י', 6),
  ('יאיר', 'boy', 'Biblical;Hebrew;International', 4, 2, true, true, false, true, false, false, false, false, true, false, true, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'י', 'ר', 7),
  ('יעל', 'girl', 'Biblical;Hebrew;Israeli', 3, 2, true, true, true, false, false, false, false, true, false, true, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'י', 'ל', 7),
  ('יובל', 'unisex', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, false, false, false, true, true, true, true, false, false, false, false, 'popular', 4, true, true, true, 'י', 'ל', 7),
  ('יהלי', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, true, false, true, false, false, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'י', 'י', 6),
  ('יהונתן', 'boy', 'Biblical;Hebrew', 6, 4, true, true, false, false, false, false, true, false, false, false, false, false, true, false, false, false, true, false, 'less_common', 3, false, true, false, 'י', 'ן', 4),
  ('יונתן', 'boy', 'Biblical;Hebrew;International', 6, 3, true, true, false, true, false, false, true, false, false, false, false, false, true, true, false, false, false, false, 'popular', 4, false, true, false, 'י', 'ן', 5),
  ('יואב', 'boy', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, true, false, false, true, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'י', 'ב', 7),
  ('יוסף', 'boy', 'Biblical;Hebrew;International', 4, 2, true, true, false, true, false, false, true, false, false, false, false, false, true, false, false, false, true, false, 'popular', 4, true, true, true, 'י', 'ף', 7),
  ('יסמין', 'girl', 'Hebrew;Arabic;International', 5, 3, false, true, false, true, true, false, false, true, false, false, false, false, false, false, false, true, false, false, 'less_common', 3, false, true, true, 'י', 'ן', 5),
  ('ליאור', 'unisex', 'Hebrew;Israeli', 4, 3, false, true, true, false, false, false, false, false, true, false, true, false, false, true, false, true, false, false, 'popular', 4, true, true, true, 'ל', 'ר', 7),
  ('ליאם', 'boy', 'International;European', 4, 2, false, false, false, true, false, true, true, false, false, true, false, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ל', 'ם', 7),
  ('ליבי', 'girl', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, true, false, false, false, false, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'ל', 'י', 6),
  ('ליה', 'girl', 'Biblical;Hebrew;International', 3, 2, true, true, false, true, false, false, true, false, false, false, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'ל', 'ה', 7),
  ('ליהי', 'girl', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, true, false, false, false, true, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'ל', 'י', 6),
  ('מאיה', 'girl', 'International;Greek', 4, 3, false, false, false, true, false, false, false, true, false, false, false, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'מ', 'ה', 7),
  ('מיכאל', 'boy', 'Biblical;Hebrew;International', 5, 3, true, true, false, true, false, false, false, false, false, true, false, false, true, false, false, false, true, false, 'popular', 4, false, true, true, 'מ', 'ל', 6),
  ('מיה', 'girl', 'International;European', 3, 2, false, false, false, true, false, true, true, false, false, false, false, false, false, true, false, true, false, false, 'popular', 4, true, true, true, 'מ', 'ה', 7),
  ('מיכל', 'girl', 'Biblical;Hebrew;International', 4, 2, true, true, false, true, false, false, false, false, false, true, false, false, true, false, false, false, true, false, 'popular', 4, true, true, true, 'מ', 'ל', 7),
  ('מיקה', 'unisex', 'International;European', 4, 2, false, false, false, true, false, true, true, false, false, false, true, false, false, true, false, true, false, false, 'popular', 4, true, true, true, 'מ', 'ה', 7),
  ('מור', 'unisex', 'Hebrew;Israeli', 3, 1, false, true, true, false, false, false, false, true, false, false, false, false, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'מ', 'ר', 6),
  ('נועה', 'girl', 'Biblical;Hebrew;Israeli', 3, 2, true, true, true, false, false, false, false, false, false, false, true, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'נ', 'ה', 7),
  ('נועם', 'unisex', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, true, false, false, false, true, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'נ', 'ם', 7),
  ('נבו', 'boy', 'Biblical;Hebrew', 3, 2, true, true, false, false, false, false, false, true, false, true, false, false, false, true, true, false, false, false, 'rare', 2, true, true, true, 'נ', 'ו', 5),
  ('נטע', 'unisex', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, true, false, false, false, false, false, true, true, false, false, false, 'popular', 4, true, true, true, 'נ', 'ע', 7),
  ('נרי', 'unisex', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, false, true, false, true, false, false, true, true, false, false, false, 'rare', 2, true, true, true, 'נ', 'י', 5),
  ('נויה', 'girl', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, false, false, true, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'נ', 'ה', 6),
  ('נעמי', 'girl', 'Biblical;Hebrew;International', 4, 3, true, true, false, true, false, false, false, false, false, false, true, false, true, false, false, false, true, false, 'popular', 4, true, true, true, 'נ', 'י', 7),
  ('עדי', 'unisex', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, true, false, false, false, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'ע', 'י', 7),
  ('עידן', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, false, false, true, true, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ע', 'ן', 7),
  ('עמית', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, true, false, false, true, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'ע', 'ת', 7),
  ('עמנואל', 'unisex', 'Biblical;Hebrew;International', 6, 4, true, true, false, true, false, false, true, false, false, false, false, false, false, false, false, false, true, false, 'less_common', 3, false, true, false, 'ע', 'ל', 4),
  ('ענבר', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, false, false, false, false, true, true, false, false, false, 'popular', 4, true, true, true, 'ע', 'ר', 7),
  ('עומר', 'unisex', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, true, false, true, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'ע', 'ר', 7),
  ('עופרי', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, false, true, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'ע', 'י', 6),
  ('עפרי', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, false, true, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'ע', 'י', 6),
  ('רוני', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, false, false, true, false, false, true, false, true, false, false, 'popular', 4, true, true, true, 'ר', 'י', 7),
  ('רון', 'unisex', 'Hebrew;Israeli', 3, 1, false, true, true, false, false, false, false, false, false, false, true, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ר', 'ן', 7),
  ('רפאל', 'boy', 'Biblical;Hebrew;International', 5, 3, true, true, false, true, false, false, false, false, false, true, false, false, true, false, false, false, false, false, 'less_common', 3, false, true, true, 'ר', 'ל', 5),
  ('רומי', 'girl', 'Hebrew;Israeli;International', 4, 2, false, true, true, true, false, false, false, false, false, false, false, true, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ר', 'י', 7),
  ('רות', 'girl', 'Biblical;Hebrew;International', 2, 1, true, true, false, true, false, false, true, false, false, false, false, false, true, false, false, false, true, false, 'less_common', 3, true, true, true, 'ר', 'ת', 6),
  ('שחר', 'unisex', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, false, true, false, false, true, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ש', 'ר', 7),
  ('שקד', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, false, false, false, false, true, true, false, false, false, 'popular', 4, true, true, true, 'ש', 'ד', 7),
  ('שירה', 'girl', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, false, false, true, false, true, false, false, true, false, false, 'popular', 4, true, true, true, 'ש', 'ה', 7),
  ('שירי', 'girl', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, false, false, true, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'ש', 'י', 6),
  ('שחרית', 'girl', 'Hebrew;Israeli', 5, 3, false, true, true, false, false, false, false, false, true, false, true, false, false, false, true, false, false, false, 'rare', 2, false, true, true, 'ש', 'ת', 4),
  ('תבור', 'unisex', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, true, false, true, false, false, false, true, true, false, false, false, 'rare', 2, true, true, true, 'ת', 'ר', 5),
  ('תהל', 'girl', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, false, true, false, false, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'ת', 'ל', 6),
  ('תמר', 'girl', 'Biblical;Hebrew;International', 4, 2, true, true, false, true, false, false, false, true, false, false, false, false, true, false, false, false, true, false, 'popular', 4, true, true, true, 'ת', 'ר', 7),
  ('תום', 'unisex', 'Hebrew;Israeli;International', 3, 1, false, true, true, true, false, false, true, false, false, false, true, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ת', 'ם', 7),
  ('תומר', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, true, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'ת', 'ר', 7),
  ('אבנר', 'boy', 'Biblical;Hebrew', 4, 2, true, true, false, false, false, false, false, false, true, true, false, false, true, false, false, false, true, false, 'rare', 2, true, true, true, 'א', 'ר', 5),
  ('אבישי', 'boy', 'Biblical;Hebrew', 5, 3, true, true, false, false, false, false, false, false, false, true, true, false, false, true, false, false, true, false, 'less_common', 3, false, true, true, 'א', 'י', 5),
  ('אגם', 'unisex', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, true, false, false, false, true, false, true, true, false, false, false, 'popular', 4, true, true, true, 'א', 'ם', 7),
  ('אוריאל', 'boy', 'Biblical;Hebrew;International', 5, 4, true, true, false, true, false, false, false, false, true, false, false, false, true, false, false, false, false, false, 'less_common', 3, false, true, true, 'א', 'ל', 5),
  ('אלכס', 'unisex', 'International;European', 4, 2, false, false, false, true, false, true, false, false, false, true, false, true, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'א', 'ס', 6),
  ('אמילי', 'girl', 'International;European', 5, 3, false, false, false, true, false, true, true, false, false, false, false, false, true, false, false, false, false, false, 'popular', 4, false, true, true, 'א', 'י', 6),
  ('אנבל', 'girl', 'International;European', 5, 3, false, false, false, true, false, true, true, false, false, false, false, false, false, false, false, false, false, false, 'rare', 2, false, true, true, 'א', 'ל', 4),
  ('ארי', 'unisex', 'Hebrew;International', 3, 2, false, true, false, true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'א', 'י', 7),
  ('אריה', 'boy', 'Biblical;Hebrew;International', 4, 2, true, true, false, true, false, false, false, false, false, true, false, false, true, false, false, false, true, false, 'less_common', 3, true, true, true, 'א', 'ה', 6),
  ('בארי', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, false, false, true, false, true, true, false, false, false, 'less_common', 3, true, true, true, 'ב', 'י', 6),
  ('בן', 'boy', 'Biblical;Hebrew;International', 2, 1, true, true, false, true, false, false, true, false, false, true, false, false, true, false, false, false, false, false, 'popular', 4, true, true, true, 'ב', 'ן', 7),
  ('בנימין', 'boy', 'Biblical;Hebrew;International', 6, 3, true, true, false, true, false, false, true, false, false, false, false, false, true, false, false, false, true, false, 'popular', 4, false, true, false, 'ב', 'ן', 5),
  ('גפן', 'unisex', 'Biblical;Hebrew;Israeli', 3, 2, true, true, true, false, false, false, false, true, false, false, false, false, false, true, false, true, false, false, 'popular', 4, true, true, true, 'ג', 'ן', 7),
  ('גיא', 'boy', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, true, false, false, false, true, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ג', 'א', 7),
  ('גילי', 'unisex', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, false, false, false, true, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'ג', 'י', 6),
  ('דביר', 'boy', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, false, false, true, false, false, true, true, false, false, false, false, 'less_common', 3, true, true, true, 'ד', 'ר', 6),
  ('דרור', 'unisex', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, false, false, false, true, true, true, true, false, false, false, false, 'less_common', 3, true, true, true, 'ד', 'ר', 6),
  ('הילי', 'unisex', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, true, false, false, false, true, false, false, true, false, true, false, false, 'rare', 2, true, true, true, 'ה', 'י', 5),
  ('יהב', 'unisex', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, true, false, false, false, true, false, false, true, false, false, false, false, 'rare', 2, true, true, true, 'י', 'ב', 5),
  ('לוטם', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, false, false, false, false, true, true, false, false, false, 'rare', 2, true, true, true, 'ל', 'ם', 5),
  ('לוטן', 'boy', 'Biblical;Hebrew', 4, 2, true, true, false, false, false, false, false, true, false, true, false, false, false, false, true, false, true, false, 'rare', 2, true, true, true, 'ל', 'ן', 5),
  ('מאי', 'unisex', 'International;European', 3, 1, false, false, false, true, false, true, false, true, false, false, false, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'מ', 'י', 7),
  ('מילי', 'girl', 'International;European', 4, 2, false, false, false, true, false, true, true, false, false, false, true, false, false, true, false, true, false, false, 'rare', 2, true, true, true, 'מ', 'י', 5),
  ('נינה', 'girl', 'International;European', 4, 2, false, false, false, true, false, true, true, false, false, false, false, false, true, false, false, false, false, false, 'less_common', 3, true, true, true, 'נ', 'ה', 6),
  ('סהר', 'unisex', 'Hebrew;Arabic;International', 3, 2, false, true, false, true, true, false, false, true, false, false, false, false, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'ס', 'ר', 6),
  ('סיון', 'girl', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, true, false, false, true, false, true, true, false, false, false, false, 'less_common', 3, true, true, true, 'ס', 'ן', 6),
  ('עילאי', 'boy', 'Hebrew;Israeli', 5, 3, false, true, true, false, false, false, false, false, false, true, true, false, false, true, true, false, false, false, 'less_common', 3, false, true, true, 'ע', 'י', 5),
  ('עילי', 'boy', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, false, false, true, true, false, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'ע', 'י', 6),
  ('רז', 'unisex', 'Hebrew;Israeli', 2, 1, false, true, true, false, false, false, false, false, false, true, false, false, false, true, false, false, false, false, 'rare', 2, true, true, true, 'ר', 'ז', 5),
  ('ריף', 'unisex', 'Hebrew;Israeli;International', 3, 1, false, true, true, true, false, false, false, true, false, false, false, true, false, true, true, false, false, false, 'less_common', 3, true, true, true, 'ר', 'ף', 6),
  ('רום', 'unisex', 'Hebrew;Israeli', 3, 1, false, true, true, false, false, false, false, false, false, true, false, true, false, true, false, false, false, false, 'rare', 2, true, true, true, 'ר', 'ם', 5),
  ('שקדיה', 'girl', 'Hebrew;Israeli', 5, 3, false, true, true, false, false, false, false, true, false, false, false, false, false, false, true, false, false, false, 'rare', 2, false, true, true, 'ש', 'ה', 4),
  ('תיאה', 'girl', 'International;Greek', 4, 3, false, false, false, true, false, false, false, false, false, false, true, false, false, true, false, false, false, false, 'rare', 2, true, true, true, 'ת', 'ה', 5),
  ('אדליה', 'girl', 'International;European', 5, 4, false, false, false, true, false, true, true, false, false, false, false, false, false, false, false, false, false, false, 'rare', 2, false, true, true, 'א', 'ה', 4),
  ('אלינור', 'girl', 'International;European', 6, 4, false, false, false, true, false, true, false, false, true, false, false, false, true, false, false, false, false, false, 'less_common', 3, false, true, false, 'א', 'ר', 4),
  ('אליס', 'girl', 'International;European', 4, 2, false, false, false, true, false, true, true, false, false, false, false, false, true, false, false, false, false, false, 'less_common', 3, true, true, true, 'א', 'ס', 6),
  ('אמיליה', 'girl', 'International;European', 6, 4, false, false, false, true, false, true, true, false, false, false, false, false, true, false, false, false, false, false, 'popular', 4, false, true, false, 'א', 'ה', 5),
  ('אנה', 'girl', 'Biblical;International;European', 3, 2, true, false, false, true, false, true, true, false, false, false, false, false, true, false, false, false, false, false, 'popular', 4, true, true, true, 'א', 'ה', 7),
  ('בלה', 'girl', 'International;European', 3, 2, false, false, false, true, false, true, true, false, false, false, false, false, false, false, false, false, false, false, 'less_common', 3, true, true, true, 'ב', 'ה', 6),
  ('קלרה', 'girl', 'International;European', 4, 2, false, false, false, true, false, true, false, false, true, false, false, false, true, false, false, false, false, false, 'less_common', 3, true, true, true, 'ק', 'ה', 6),
  ('לונה', 'girl', 'International;European', 4, 2, false, false, false, true, false, true, false, true, false, false, false, false, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'ל', 'ה', 6),
  ('לילי', 'girl', 'International;European', 4, 2, false, false, false, true, false, true, false, true, false, false, false, false, false, false, false, true, false, false, 'less_common', 3, true, true, true, 'ל', 'י', 6),
  ('ליאו', 'boy', 'International;European', 3, 2, false, false, false, true, false, true, false, false, false, true, false, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ל', 'ו', 7),
  ('לוקה', 'unisex', 'International;European', 4, 2, false, false, false, true, false, true, true, false, false, false, false, true, false, true, true, false, false, false, 'popular', 4, true, true, true, 'ל', 'ה', 7),
  ('מילה', 'girl', 'International;European', 4, 2, false, false, false, true, false, true, true, false, false, false, false, false, false, true, false, true, false, false, 'popular', 4, true, true, true, 'מ', 'ה', 7),
  ('ניקו', 'unisex', 'International;European', 4, 2, false, false, false, true, false, true, false, false, false, true, true, false, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'נ', 'ו', 6),
  ('נואה', 'unisex', 'International;European', 4, 2, false, false, false, true, false, true, true, false, false, false, false, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'נ', 'ה', 6),
  ('אוליבר', 'boy', 'International;European', 6, 3, false, false, false, true, false, true, false, true, false, false, false, false, true, true, false, false, false, false, 'popular', 4, false, true, false, 'א', 'ר', 5),
  ('ליאון', 'boy', 'International;European', 4, 2, false, false, false, true, false, true, false, false, false, true, false, false, true, false, false, false, false, false, 'less_common', 3, true, true, true, 'ל', 'ן', 6),
  ('מקס', 'boy', 'International;European', 3, 1, false, false, false, true, false, true, false, false, false, true, false, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'מ', 'ס', 7),
  ('לב', 'boy', 'Hebrew;Israeli', 2, 1, false, true, true, false, false, false, true, false, false, false, false, false, false, true, false, false, false, false, 'rare', 2, true, true, true, 'ל', 'ב', 5),
  ('לי', 'unisex', 'Hebrew;International', 2, 1, false, true, false, true, false, false, true, false, false, false, true, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ל', 'י', 7),
  ('עומרי', 'boy', 'Hebrew;Israeli', 5, 3, false, true, true, false, false, false, false, true, false, true, false, false, true, true, false, false, false, false, 'popular', 4, false, true, true, 'ע', 'י', 6),
  ('אופיר', 'unisex', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, true, false, false, false, false, false, true, true, false, false, false, 'less_common', 3, true, true, true, 'א', 'ר', 6),
  ('תדהר', 'unisex', 'Hebrew;Israeli', 5, 2, false, true, true, false, false, false, false, true, false, true, false, false, false, false, true, false, false, false, 'rare', 2, false, true, true, 'ת', 'ר', 4),
  ('רקפת', 'girl', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, false, false, false, true, false, true, false, false, false, 'rare', 2, true, true, true, 'ר', 'ת', 5),
  ('כליל', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, true, false, false, false, false, false, true, false, false, false, 'rare', 2, true, true, true, 'כ', 'ל', 5),
  ('טליה', 'girl', 'Hebrew;Israeli', 5, 3, false, true, true, false, false, false, false, true, false, false, true, false, false, false, false, true, false, false, 'less_common', 3, false, true, true, 'ט', 'ה', 5),
  ('אביטל', 'girl', 'Biblical;Hebrew', 5, 3, true, true, false, false, false, false, true, false, false, false, false, false, true, false, false, false, true, false, 'less_common', 3, false, true, true, 'א', 'ל', 5),
  ('אפרים', 'boy', 'Biblical;Hebrew', 5, 3, true, true, false, false, false, false, false, false, false, false, true, false, true, false, false, false, true, false, 'rare', 2, false, true, true, 'א', 'ם', 4),
  ('אסתר', 'girl', 'Biblical;Hebrew;International', 4, 2, true, true, false, true, false, false, false, false, false, true, false, false, true, false, false, false, true, false, 'popular', 4, true, true, true, 'א', 'ר', 7),
  ('רותם', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, false, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'ר', 'ם', 7),
  ('עטרה', 'girl', 'Biblical;Hebrew', 4, 3, true, true, false, false, false, false, false, false, false, true, false, false, true, false, false, false, false, false, 'rare', 2, true, true, true, 'ע', 'ה', 5),
  ('כתר', 'unisex', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, false, false, true, false, false, false, false, true, false, false, false, 'rare', 2, true, true, true, 'כ', 'ר', 5),
  ('נעם', 'unisex', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, true, false, false, false, true, false, true, true, false, false, false, false, 'less_common', 3, true, true, true, 'נ', 'ם', 6),
  ('אליוט', 'unisex', 'International;European', 5, 3, false, false, false, true, false, true, false, false, false, true, false, false, false, true, false, false, false, false, 'rare', 2, false, true, true, 'א', 'ט', 4),
  ('אווה', 'girl', 'International;European', 3, 2, false, false, false, true, false, true, true, false, false, false, false, false, true, false, false, false, false, false, 'less_common', 3, true, true, true, 'א', 'ה', 6),
  ('ליאנה', 'girl', 'International;European', 5, 3, false, false, false, true, false, true, true, false, false, false, false, false, false, true, false, false, false, false, 'rare', 2, false, true, true, 'ל', 'ה', 4),
  ('סופיה', 'girl', 'International;European;Greek', 5, 3, false, false, false, true, false, true, false, false, false, false, false, false, true, false, false, false, false, false, 'popular', 4, false, true, true, 'ס', 'ה', 6),
  ('אוליביה', 'girl', 'International;European', 6, 4, false, false, false, true, false, true, false, true, false, false, false, false, true, false, false, false, false, false, 'popular', 4, false, true, false, 'א', 'ה', 5),
  ('אלנה', 'girl', 'International;European', 4, 3, false, false, false, true, false, true, false, false, true, false, false, false, true, false, false, false, false, false, 'less_common', 3, true, true, true, 'א', 'ה', 6),
  ('לארה', 'girl', 'International;European', 4, 2, false, false, false, true, false, true, false, false, false, false, true, false, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'ל', 'ה', 6),
  ('איתי', 'boy', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, false, false, true, true, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'א', 'י', 7),
  ('עידו', 'boy', 'Biblical;Hebrew;Israeli', 3, 2, true, true, true, false, false, false, false, false, false, true, true, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'ע', 'ו', 7),
  ('מתן', 'boy', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, true, false, false, false, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'מ', 'ן', 7),
  ('נתן', 'boy', 'Biblical;Hebrew;International', 4, 2, true, true, false, true, false, false, true, false, false, false, false, false, true, false, false, false, true, false, 'popular', 4, true, true, true, 'נ', 'ן', 7),
  ('רועי', 'boy', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, true, true, false, false, false, false, false, true, false, true, false, false, 'popular', 4, true, true, true, 'ר', 'י', 7),
  ('שגיא', 'boy', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, false, true, false, false, false, true, true, false, false, false, 'less_common', 3, true, true, true, 'ש', 'א', 6),
  ('סער', 'boy', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, true, false, true, false, false, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'ס', 'ר', 6),
  ('גלעד', 'boy', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, false, false, true, false, false, true, false, false, false, true, false, 'less_common', 3, true, true, true, 'ג', 'ד', 6),
  ('נדב', 'boy', 'Biblical;Hebrew;Israeli', 3, 2, true, true, true, false, false, false, true, false, false, false, true, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'נ', 'ב', 7),
  ('עוז', 'boy', 'Biblical;Hebrew;Israeli', 2, 1, true, true, true, false, false, false, false, false, false, true, false, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ע', 'ז', 7),
  ('עוזי', 'boy', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, false, false, true, true, false, true, true, false, false, false, false, 'rare', 2, true, true, true, 'ע', 'י', 5),
  ('שי', 'unisex', 'Hebrew;Israeli', 2, 1, false, true, true, false, false, false, true, false, false, false, true, false, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ש', 'י', 7),
  ('אורלי', 'girl', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, true, false, true, false, true, false, false, true, false, false, 'less_common', 3, true, true, true, 'א', 'י', 6),
  ('אוריה', 'unisex', 'Biblical;Hebrew;Israeli', 4, 3, true, true, true, false, false, false, false, false, true, false, false, false, false, true, false, false, true, false, 'less_common', 3, true, true, true, 'א', 'ה', 6),
  ('אחינועם', 'girl', 'Biblical;Hebrew', 6, 4, true, true, false, false, false, false, true, false, false, false, true, false, false, false, true, false, true, false, 'rare', 2, false, true, false, 'א', 'ם', 3),
  ('בתיה', 'girl', 'Biblical;Hebrew', 4, 3, true, true, false, false, false, false, true, false, false, false, false, false, true, false, false, false, true, false, 'less_common', 3, true, true, true, 'ב', 'ה', 6),
  ('כרמל', 'unisex', 'Biblical;Hebrew;Israeli', 4, 2, true, true, true, false, false, false, false, true, false, false, false, false, true, true, false, false, false, false, 'popular', 4, true, true, true, 'כ', 'ל', 7),
  ('כנרת', 'girl', 'Hebrew;Israeli', 5, 3, false, true, true, false, false, false, false, true, false, false, false, false, false, false, true, false, false, false, 'rare', 2, false, true, true, 'כ', 'ת', 4),
  ('ים', 'unisex', 'Hebrew;Israeli', 2, 1, false, true, true, false, false, false, false, true, false, false, false, true, false, true, false, false, false, false, 'less_common', 3, true, true, true, 'י', 'ם', 6),
  ('גל', 'unisex', 'Hebrew;Israeli', 2, 1, false, true, true, false, false, false, false, true, false, false, false, true, false, true, false, false, false, false, 'popular', 4, true, true, true, 'ג', 'ל', 7),
  ('גלי', 'unisex', 'Hebrew;Israeli', 3, 2, false, true, true, false, false, false, false, true, false, false, true, false, false, true, false, true, false, false, 'less_common', 3, true, true, true, 'ג', 'י', 6),
  ('אורין', 'unisex', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, true, false, true, false, false, true, true, false, false, false, 'rare', 2, true, true, true, 'א', 'ן', 5),
  ('ליב', 'unisex', 'Hebrew;International', 3, 1, false, true, false, true, false, false, true, false, false, false, false, false, false, true, false, false, false, false, 'rare', 2, true, true, true, 'ל', 'ב', 5),
  ('אופל', 'unisex', 'International;European', 3, 2, false, false, false, true, false, true, false, false, true, false, false, false, false, true, true, false, false, false, 'rare', 2, true, true, true, 'א', 'ל', 5),
  ('אביה', 'unisex', 'Biblical;Hebrew', 4, 3, true, true, false, false, false, false, true, false, false, false, false, false, true, true, false, false, false, false, 'less_common', 3, true, true, true, 'א', 'ה', 6),
  ('אבישג', 'girl', 'Biblical;Hebrew', 5, 3, true, true, false, false, false, false, true, false, false, false, false, false, true, false, false, false, true, false, 'rare', 2, false, true, true, 'א', 'ג', 4),
  ('אורית', 'girl', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, false, true, false, true, false, true, false, false, true, false, false, 'less_common', 3, true, true, true, 'א', 'ת', 6),
  ('אלמירה', 'girl', 'International;European', 6, 4, false, false, false, true, false, true, true, false, false, false, false, false, false, false, false, false, false, false, 'rare', 2, false, true, false, 'א', 'ה', 3),
  ('אילן', 'boy', 'Hebrew;Israeli', 4, 2, false, true, true, false, false, false, false, true, false, true, false, false, true, false, false, false, true, false, 'less_common', 3, true, true, true, 'א', 'ן', 6),
  ('אילנה', 'girl', 'Hebrew;Israeli', 5, 3, false, true, true, false, false, false, false, true, false, false, false, false, true, false, false, false, true, false, 'less_common', 3, false, true, true, 'א', 'ה', 5),
  ('אמונה', 'girl', 'Hebrew;Israeli', 5, 3, false, true, true, false, false, false, true, false, false, false, false, false, false, false, false, false, true, false, 'rare', 2, false, true, true, 'א', 'ה', 4),
  ('ברוך', 'boy', 'Biblical;Hebrew', 4, 2, true, true, false, false, false, false, false, false, false, false, true, false, true, false, false, false, true, false, 'rare', 2, true, false, false, 'ב', 'ך', 3)    ;
  end if;
end $$;

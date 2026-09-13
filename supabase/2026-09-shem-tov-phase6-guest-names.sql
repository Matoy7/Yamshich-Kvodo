-- ---------------------------------------------------------------------------
-- שם טוב — phase 6: guests choose their own display name.
--
-- Run once in the Supabase SQL Editor, after phase 5.
--
-- schema.sql enforced a case-insensitive unique index on profiles.display_name
-- — needed when names were randomly generated from a fixed combinatorial pool
-- and a collision meant "try another combination". Now that a guest picks
-- their own name during onboarding, requiring global uniqueness would mean
-- two unrelated guests who both type "רותם" get an opaque failure for no
-- reason a real product should surface — nothing else in the app depends on
-- display_name being unique. Dropping it, not narrowing it.
-- ---------------------------------------------------------------------------

drop index if exists public.profiles_display_name_unique;

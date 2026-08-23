-- ---------------------------------------------------------------------------
-- Public author cards.
--
-- `profiles` stays private — a user still reads only their own row, and email
-- is never exposed. This view publishes ONLY the fields needed to attribute a
-- sentence or completion to its author: id, name and picture.
--
-- The view is not `security_invoker`, so it reads past the base table's RLS,
-- which is exactly why it exposes a deliberately narrow column list.
-- ---------------------------------------------------------------------------
create or replace view public.public_profiles as
select id, display_name, first_name, avatar_url
from public.profiles;

grant select on public.public_profiles to authenticated;

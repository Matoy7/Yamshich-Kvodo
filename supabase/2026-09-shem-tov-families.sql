-- ---------------------------------------------------------------------------
-- שם טוב — families, membership, invitations, names, votes.
--
-- Run once in the Supabase SQL Editor, after schema.sql. Purely additive: it
-- creates five new tables and touches nothing that exists today. sentences,
-- completions and completion_likes are untouched and keep working exactly as
-- they do now — this migration lays the foundation the new product will sit
-- on beside them, not instead of them.
--
-- Model:
--   families            one row per family ("משפחת אלירז")
--   family_members      who belongs to which family, and their role
--   family_invitations  hashed, single-use-until-revoked join links
--   names                the name pool — family_id null means "shared
--                        catalogue", non-null means "this family suggested
--                        it privately"
--   name_votes           one row per (family, name, member) — a heart
--
-- Every table below gets row level security. The rule that matters most:
-- a family member sees and touches only their own family's rows. That is
-- enforced here, in Postgres — not trusted to the client.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- families
-- ---------------------------------------------------------------------------

create table if not exists public.families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists families_created_by_idx on public.families (created_by);

-- ---------------------------------------------------------------------------
-- family_members
--
-- role is 'owner' or 'member'. The creator becomes the first owner
-- automatically (see the trigger below) — there is no path that creates a
-- family with zero members.
-- ---------------------------------------------------------------------------

create table if not exists public.family_members (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  -- One membership row per person per family — also what redeem_invitation
  -- upserts against so redeeming the same link twice is a harmless no-op.
  unique (family_id, user_id)
);

create index if not exists family_members_family_id_idx on public.family_members (family_id);
create index if not exists family_members_user_id_idx   on public.family_members (user_id);

-- ---------------------------------------------------------------------------
-- family_invitations
--
-- Only the hash of the invite token is ever stored. The plaintext token is
-- returned once, at creation, by create_invitation() below and never again —
-- a leaked database dump does not hand over a single live invitation.
--
-- No one ever reads a row here to redeem it: redeem_invitation() looks the
-- token up itself, as a security definer function, so a non-member can
-- redeem a link without ever being granted SELECT on this table.
-- ---------------------------------------------------------------------------

create table if not exists public.family_invitations (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists family_invitations_family_id_idx on public.family_invitations (family_id);

-- ---------------------------------------------------------------------------
-- names
--
-- family_id is the catalogue/suggestion discriminator: NULL is the shared
-- catalogue every family can see, a real id is one family's private
-- suggestion. The check constraint below ties suggested_by to that same
-- switch, so the two columns can never disagree about which kind of row
-- this is — whatever the client sends.
-- ---------------------------------------------------------------------------

create table if not exists public.names (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid references public.families (id) on delete cascade,
  text         text not null check (char_length(btrim(text)) between 1 and 60),
  gender       text check (gender is null or gender in ('boy', 'girl', 'unisex')),
  origin       text,
  suggested_by uuid references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  -- A catalogue entry has no suggester; a suggestion always has one. Kept as
  -- ON DELETE CASCADE (not SET NULL) on suggested_by specifically so this
  -- constraint can never be violated by a profile being deleted out from
  -- under a suggestion.
  check ((family_id is null) = (suggested_by is null))
);

create index if not exists names_family_id_idx    on public.names (family_id);
create index if not exists names_suggested_by_idx on public.names (suggested_by);

-- ---------------------------------------------------------------------------
-- name_votes
--
-- The heart. One row per (family, name, member) — family_id is carried here
-- rather than derived, because one person can belong to more than one
-- family and must be able to vote for the same catalogue name independently
-- in each.
-- ---------------------------------------------------------------------------

create table if not exists public.name_votes (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  name_id    uuid not null references public.names (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- The last line of defence against a double vote, however the client behaves.
  unique (family_id, name_id, user_id)
);

create index if not exists name_votes_family_id_idx on public.name_votes (family_id);
create index if not exists name_votes_name_id_idx   on public.name_votes (name_id);
create index if not exists name_votes_user_id_idx   on public.name_votes (user_id);

-- ---------------------------------------------------------------------------
-- Membership helpers
--
-- Both MUST be security definer with search_path pinned. Without security
-- definer, RLS on family_members would apply *inside* the function body —
-- and the moment a policy on family_members calls a function that queries
-- family_members under RLS again, that policy recurses into itself.
-- ---------------------------------------------------------------------------

create or replace function public.is_family_member(p_family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family and user_id = auth.uid()
  );
$$;

create or replace function public.is_family_owner(p_family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family and user_id = auth.uid() and role = 'owner'
  );
$$;

grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_owner(uuid)  to authenticated;

-- ---------------------------------------------------------------------------
-- Add the creator as owner the moment a family is created.
--
-- Same shape as handle_new_user() in schema.sql: a security definer trigger
-- that writes the one row a fresh row always needs, so there is never a
-- moment where a family exists with no members and no INSERT policy on
-- family_members has to trust the client to add the creator honestly.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.family_members (family_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists on_family_created on public.families;
create trigger on_family_created
  after insert on public.families
  for each row execute function public.handle_new_family();

-- ---------------------------------------------------------------------------
-- Invitations: create, redeem, revoke.
--
-- All three writes to family_invitations go through these functions rather
-- than direct table grants. That means family_invitations needs no INSERT,
-- UPDATE or DELETE policy at all — the table is select-only from the client
-- (owners, their own family's invitations), and every mutation is validated
-- server-side before it happens rather than trusted from the request body.
-- ---------------------------------------------------------------------------

create or replace function public.create_invitation(p_family uuid, p_expires interval default interval '7 days')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token   text;
  v_hash    text;
  v_expires interval;
begin
  if not public.is_family_owner(p_family) then
    raise exception 'only the family owner may create an invitation';
  end if;

  -- Clamp so a client can't ask for a link that (effectively) never expires.
  v_expires := p_expires;
  if v_expires is null or v_expires <= interval '0' or v_expires > interval '30 days' then
    v_expires := interval '7 days';
  end if;

  v_token := encode(gen_random_bytes(24), 'base64');
  v_hash  := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.family_invitations (family_id, token_hash, created_by, expires_at)
  values (p_family, v_hash, auth.uid(), now() + v_expires);

  return v_token;
end;
$$;

create or replace function public.redeem_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to redeem an invitation';
  end if;

  select * into v_invite
  from public.family_invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex');

  if not found then
    raise exception 'invalid invitation';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'this invitation has been revoked';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'this invitation has expired';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_invite.family_id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  return v_invite.family_id;
end;
$$;

create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
begin
  select family_id into v_family
  from public.family_invitations
  where id = p_invitation_id;

  if not found then
    raise exception 'invitation not found';
  end if;

  if not public.is_family_owner(v_family) then
    raise exception 'only the family owner may revoke this invitation';
  end if;

  update public.family_invitations
  set revoked_at = now()
  where id = p_invitation_id and revoked_at is null;
end;
$$;

grant execute on function public.create_invitation(uuid, interval) to authenticated;
grant execute on function public.redeem_invitation(text)           to authenticated;
grant execute on function public.revoke_invitation(uuid)           to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.families           enable row level security;
alter table public.family_members      enable row level security;
alter table public.family_invitations  enable row level security;
alter table public.names               enable row level security;
alter table public.name_votes          enable row level security;

-- families --------------------------------------------------------------

-- created_by = auth.uid() is included alongside membership, not just for
-- belt-and-braces: INSERT ... RETURNING re-checks the new row against the
-- SELECT policy, and at that instant the AFTER INSERT trigger that makes the
-- creator a member hasn't run yet (triggers fire after the statement's own
-- RLS checks). Without this clause, creating a family and asking Postgres to
-- return its id fails outright — is_family_member(id) is still false for the
-- one person who is about to become its owner.
drop policy if exists "a member may read their own family" on public.families;
create policy "a member may read their own family"
  on public.families for select to authenticated
  using (public.is_family_member(id) or created_by = (select auth.uid()));

drop policy if exists "a signed-in user may create a family" on public.families;
create policy "a signed-in user may create a family"
  on public.families for insert to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "an owner may delete their family" on public.families;
create policy "an owner may delete their family"
  on public.families for delete to authenticated
  using (public.is_family_owner(id));

-- No UPDATE policy yet — renaming a family is a small follow-up for the "My
-- Family" screen, deliberately left out of this pass.

-- family_members ----------------------------------------------------------

drop policy if exists "a member may see their family's roster" on public.family_members;
create policy "a member may see their family's roster"
  on public.family_members for select to authenticated
  using (public.is_family_member(family_id));

drop policy if exists "an owner may add a member directly" on public.family_members;
create policy "an owner may add a member directly"
  on public.family_members for insert to authenticated
  with check (public.is_family_owner(family_id));

drop policy if exists "a member may leave, or an owner may remove one" on public.family_members;
create policy "a member may leave, or an owner may remove one"
  on public.family_members for delete to authenticated
  using ((select auth.uid()) = user_id or public.is_family_owner(family_id));

-- No UPDATE policy — role changes (e.g. promoting a member to owner) are not
-- part of this pass; membership rows are otherwise immutable once created.

-- family_invitations --------------------------------------------------------

drop policy if exists "an owner may see their family's invitations" on public.family_invitations;
create policy "an owner may see their family's invitations"
  on public.family_invitations for select to authenticated
  using (public.is_family_owner(family_id));

-- Deliberately no INSERT, UPDATE or DELETE policy: every write goes through
-- create_invitation / revoke_invitation above, which validate ownership and
-- clamp inputs before touching the table. redeem_invitation does not need a
-- SELECT policy at all — it looks the token up itself, as security definer,
-- so a non-member can redeem a link without ever reading this table.

-- names -----------------------------------------------------------------

drop policy if exists "the catalogue is readable, suggestions are family-only" on public.names;
create policy "the catalogue is readable, suggestions are family-only"
  on public.names for select to authenticated
  using (family_id is null or public.is_family_member(family_id));

drop policy if exists "a member may suggest a name to their own family" on public.names;
create policy "a member may suggest a name to their own family"
  on public.names for insert to authenticated
  with check (
    suggested_by = (select auth.uid())
    and family_id is not null
    and public.is_family_member(family_id)
  );

drop policy if exists "the suggester or an owner may remove a suggestion" on public.names;
create policy "the suggester or an owner may remove a suggestion"
  on public.names for delete to authenticated
  using (suggested_by = (select auth.uid()) or public.is_family_owner(family_id));

-- name_votes ------------------------------------------------------------

drop policy if exists "a member may see their family's votes" on public.name_votes;
create policy "a member may see their family's votes"
  on public.name_votes for select to authenticated
  using (public.is_family_member(family_id));

drop policy if exists "a member may vote as themselves, in their own family" on public.name_votes;
create policy "a member may vote as themselves, in their own family"
  on public.name_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())                  -- 1. not on someone else's behalf
    and public.is_family_member(family_id)          -- 2. only your own family
    and exists (                                    -- 3. only a name that family can see
      select 1 from public.names n
      where n.id = name_id
        and (n.family_id is null or n.family_id = name_votes.family_id)
    )
  );

drop policy if exists "a member may remove their own vote" on public.name_votes;
create policy "a member may remove their own vote"
  on public.name_votes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- No UPDATE policy anywhere on votes or membership rows: a vote has no
-- mutable state, and the absence of the policy means a row can never be
-- reassigned to another person or another family.

-- Supabase's default privileges usually cover new tables automatically;
-- stated explicitly, as completion_likes already does, so the feature can't
-- silently fail on a project where those defaults don't apply.
grant select, insert, delete on public.families           to authenticated;
grant select, insert, delete on public.family_members      to authenticated;
grant select                 on public.family_invitations  to authenticated;
grant select, insert, delete on public.names                to authenticated;
grant select, insert, delete on public.name_votes           to authenticated;

-- ---------------------------------------------------------------------------
-- family-scoped ranking
--
-- Same spirit as sentence_metrics: the browser never downloads every vote in
-- a family to work out an order itself. One view, computed in Postgres,
-- ordered by distinct-voter count first and recency as the tiebreaker, per
-- the product's ranking rule. security_invoker so it inherits RLS from
-- names/name_votes rather than bypassing it — a family only ever sees rows
-- for names it can already see, ranked within its own votes.
-- ---------------------------------------------------------------------------

create or replace view public.family_name_rankings
with (security_invoker = true) as
select
  v.family_id,
  n.id                       as name_id,
  n.text,
  n.gender,
  n.origin,
  n.family_id                as suggested_for_family_id,
  count(distinct v.user_id)  as vote_count,
  max(v.created_at)          as last_voted_at
from public.name_votes v
join public.names n on n.id = v.name_id
group by v.family_id, n.id, n.text, n.gender, n.origin, n.family_id;

grant select on public.family_name_rankings to authenticated;

-- ---------------------------------------------------------------------------
-- שם טוב — phase 2: family rename, name-vote notifications.
--
-- Run once in the Supabase SQL Editor, after 2026-09-shem-tov-families.sql.
-- Purely additive: one new UPDATE policy, one new table, one new trigger.
-- Nothing existing is altered or dropped.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- families: allow the owner to rename it.
--
-- Deliberately left out of the first migration; adding it now rather than
-- editing that file, so re-running either migration stays idempotent and
-- neither file's history is rewritten after the fact.
-- ---------------------------------------------------------------------------

drop policy if exists "an owner may rename their family" on public.families;
create policy "an owner may rename their family"
  on public.families for update to authenticated
  using (public.is_family_owner(id))
  with check (public.is_family_owner(id));

-- ---------------------------------------------------------------------------
-- name_notifications
--
-- The old product's notifications (completion_liked, sentence_completed,
-- completion_leading) are about a feed that no longer exists in this
-- product — bolting family-scoping onto them would be forcing a shape that
-- doesn't fit. This is a new, small table instead.
--
-- One type for this pass: name_suggestion_voted — someone voted for a name
-- you suggested to your family. Grouped exactly like completion_liked was:
-- a burst of votes while the notification is still unread updates the same
-- row (actor becomes the latest voter, group_count grows) instead of
-- spamming one row per vote. Ranking-change and "reached majority" style
-- notifications are a reasonable follow-up, not included here.
-- ---------------------------------------------------------------------------

create table if not exists public.name_notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  type         text not null check (type in ('name_suggestion_voted')),
  name_id      uuid not null references public.names (id) on delete cascade,
  family_id    uuid not null references public.families (id) on delete cascade,
  group_count  integer not null default 1 check (group_count >= 1),
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists name_notifications_recipient_unread_idx
  on public.name_notifications (recipient_id, read, created_at desc);

create index if not exists name_notifications_group_idx
  on public.name_notifications (recipient_id, name_id, family_id, read)
  where type = 'name_suggestion_voted';

alter table public.name_notifications enable row level security;

grant select, update on public.name_notifications to authenticated;

-- Same shape as the original notifications table: read and mark-read only
-- your own; no insert or delete policy for the client at all — every row is
-- written exclusively by the trigger function below, as its definer.
drop policy if exists "a user may read their own name notifications" on public.name_notifications;
create policy "a user may read their own name notifications"
  on public.name_notifications for select to authenticated
  using ((select auth.uid()) = recipient_id);

drop policy if exists "a user may mark their own name notifications read" on public.name_notifications;
create policy "a user may mark their own name notifications read"
  on public.name_notifications for update to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- ---------------------------------------------------------------------------
-- name_suggestion_voted — fires after a vote is inserted.
--
-- Only fires for a suggestion (names.suggested_by is not null); the shared
-- catalogue has no one to notify. Never notifies someone about voting for
-- their own suggestion.
-- ---------------------------------------------------------------------------

create or replace function public.notify_name_suggestion_voted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_updated   uuid;
begin
  select n.suggested_by into v_recipient
  from public.names n
  where n.id = new.name_id;

  if v_recipient is null or v_recipient = new.user_id then
    return new;
  end if;

  update public.name_notifications
  set actor_id    = new.user_id,
      group_count = group_count + 1,
      created_at  = now(),
      read        = false
  where recipient_id = v_recipient
    and name_id = new.name_id
    and family_id = new.family_id
    and type = 'name_suggestion_voted'
    and read = false
  returning id into v_updated;

  if v_updated is null then
    insert into public.name_notifications (recipient_id, actor_id, type, name_id, family_id)
    values (v_recipient, new.user_id, 'name_suggestion_voted', new.name_id, new.family_id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_name_suggestion_voted on public.name_votes;
create trigger on_name_suggestion_voted
  after insert on public.name_votes
  for each row execute function public.notify_name_suggestion_voted();

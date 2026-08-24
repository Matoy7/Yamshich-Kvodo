-- ---------------------------------------------------------------------------
-- Notifications.
--
-- Run this once in the Supabase SQL Editor. It is idempotent and purely
-- additive: it creates one new table, its policies, and three trigger
-- functions on the existing completions / completion_likes tables. It does
-- not touch sentences, completions, completion_likes as data, or any
-- existing policy on them — likes and completions keep working exactly as
-- they do today; this only *observes* them to write a notification row.
--
-- Three notification types, generated server-side so the client never
-- fabricates one:
--
--   completion_liked    someone liked your completion. Grouped: a new like
--                        from a second person while the first like's
--                        notification is still unread updates that same row
--                        (actor becomes the latest liker, group_count grows)
--                        instead of spamming one row per like.
--   sentence_completed   someone completed your sentence. One row per
--                        completion — these are not grouped.
--   completion_leading   your completion became the leading completion for
--                        its sentence (likes desc, created_at desc — the
--                        exact ranking the feed and popovers already use).
--                        Fires only when the leader actually changes to a
--                        different completion, not on every like.
--
-- No notification is ever created for a user about their own action (liking
-- your own completion, or the no-op of your own sentence "changing" to your
-- own completion) — self-notifications are the definition of a low-value
-- notification.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- table
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  -- Null for completion_leading: that notification is about a ranking
  -- change, not a specific person's action.
  actor_id     uuid references public.profiles (id) on delete set null,
  type         text not null check (type in ('completion_liked', 'sentence_completed', 'completion_leading')),
  sentence_id  uuid not null references public.sentences (id) on delete cascade,
  completion_id uuid not null references public.completions (id) on delete cascade,
  -- How many distinct likes are folded into this row. Always 1 except for a
  -- grouped completion_liked notification, where it is the count of people
  -- whose like landed while the notification was still unread.
  group_count  integer not null default 1 check (group_count >= 1),
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, read, created_at desc);

-- Looked up by every like-notification write to find the row to fold into.
create index if not exists notifications_liked_group_idx
  on public.notifications (recipient_id, completion_id, read)
  where type = 'completion_liked';

-- Looked up by the leading-completion trigger to see who was last notified
-- as leader for a given sentence, without scanning the whole table.
create index if not exists notifications_leading_by_sentence_idx
  on public.notifications (sentence_id, created_at desc)
  where type = 'completion_leading';

alter table public.notifications enable row level security;

grant select, update on public.notifications to authenticated;

-- A user reads and marks-read only their own notifications. There is no
-- insert or delete policy for the authenticated role at all — every row is
-- written exclusively by the trigger functions below, running as their
-- definer, never directly by a client request.
drop policy if exists "a user may read their own notifications" on public.notifications;
create policy "a user may read their own notifications"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = recipient_id);

drop policy if exists "a user may mark their own notifications read" on public.notifications;
create policy "a user may mark their own notifications read"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- ---------------------------------------------------------------------------
-- completion_liked — fires after a like is inserted.
--
-- Folds into an existing unread notification for the same (recipient,
-- completion) rather than inserting a new row, so five quick likes read as
-- one notification with a growing count, not five.
-- ---------------------------------------------------------------------------

create or replace function public.notify_completion_liked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient  uuid;
  v_sentence   uuid;
  v_updated    uuid;
begin
  select c.author_id, c.sentence_id into v_recipient, v_sentence
  from public.completions c
  where c.id = new.completion_id;

  -- Never notify someone about liking their own completion.
  if v_recipient is null or v_recipient = new.user_id then
    return new;
  end if;

  update public.notifications
  set actor_id   = new.user_id,
      group_count = group_count + 1,
      created_at  = now(),
      read        = false
  where recipient_id = v_recipient
    and completion_id = new.completion_id
    and type = 'completion_liked'
    and read = false
  returning id into v_updated;

  if v_updated is null then
    insert into public.notifications (recipient_id, actor_id, type, sentence_id, completion_id)
    values (v_recipient, new.user_id, 'completion_liked', v_sentence, new.completion_id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_completion_liked on public.completion_likes;
create trigger on_completion_liked
  after insert on public.completion_likes
  for each row execute function public.notify_completion_liked();

-- ---------------------------------------------------------------------------
-- sentence_completed — fires after a completion is inserted. One row per
-- completion; these are not grouped.
-- ---------------------------------------------------------------------------

create or replace function public.notify_sentence_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
begin
  select s.author_id into v_recipient
  from public.sentences s
  where s.id = new.sentence_id;

  -- Never notify someone about completing their own sentence (the product
  -- does not allow this from the UI, but the trigger stays defensive).
  if v_recipient is null or v_recipient = new.author_id then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, sentence_id, completion_id)
  values (v_recipient, new.author_id, 'sentence_completed', new.sentence_id, new.id);

  return new;
end;
$$;

drop trigger if exists on_sentence_completed on public.completions;
create trigger on_sentence_completed
  after insert on public.completions
  for each row execute function public.notify_sentence_completed();

-- ---------------------------------------------------------------------------
-- completion_leading — fires after a like is inserted or deleted, since
-- either can change which completion currently leads a sentence.
--
-- "Leading" uses the same ranking as everywhere else in the product: likes
-- desc, created_at desc. A notification is written only when the computed
-- leader is a *different* completion from whoever this function last
-- notified as leader for this sentence — not on every like, and not for a
-- completion re-affirming a lead it already holds.
-- ---------------------------------------------------------------------------

create or replace function public.notify_completion_leading()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sentence         uuid;
  v_leader_id        uuid;
  v_leader_author    uuid;
  v_leader_likes     integer;
  v_last_notified_id uuid;
begin
  select c.sentence_id into v_sentence
  from public.completions c
  where c.id = coalesce(new.completion_id, old.completion_id);

  if v_sentence is null then
    return coalesce(new, old);
  end if;

  -- The current leader for this sentence, by the product's one ranking rule.
  select c.id, c.author_id, like_counts.n
  into v_leader_id, v_leader_author, v_leader_likes
  from public.completions c
  left join (
    select completion_id, count(*) as n
    from public.completion_likes
    group by completion_id
  ) like_counts on like_counts.completion_id = c.id
  where c.sentence_id = v_sentence
  order by coalesce(like_counts.n, 0) desc, c.created_at desc
  limit 1;

  -- No meaningful leader yet, or it leads with zero likes (every sentence
  -- trivially has a "first" completion; that is not a ranking event worth a
  -- notification).
  if v_leader_id is null or coalesce(v_leader_likes, 0) = 0 then
    return coalesce(new, old);
  end if;

  select n.completion_id into v_last_notified_id
  from public.notifications n
  where n.sentence_id = v_sentence
    and n.type = 'completion_leading'
  order by n.created_at desc
  limit 1;

  if v_last_notified_id is distinct from v_leader_id then
    insert into public.notifications (recipient_id, actor_id, type, sentence_id, completion_id)
    values (v_leader_author, null, 'completion_leading', v_sentence, v_leader_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists on_completion_leading_change on public.completion_likes;
create trigger on_completion_leading_change
  after insert or delete on public.completion_likes
  for each row execute function public.notify_completion_leading();

-- ---------------------------------------------------------------------------
-- verify
-- ---------------------------------------------------------------------------

-- Expect: the table, three indexes plus the primary key, rls_enabled = true,
-- two policies, and three triggers.
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'notifications')       as table_present,
  (select count(*) from pg_indexes
     where schemaname = 'public' and tablename = 'notifications')          as index_count,
  (select relrowsecurity from pg_class
     where oid = 'public.notifications'::regclass)                        as rls_enabled,
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'notifications')          as policy_count,
  (select count(*) from pg_trigger
     where tgname in ('on_completion_liked', 'on_sentence_completed', 'on_completion_leading_change')
       and not tgisinternal)                                              as trigger_count;

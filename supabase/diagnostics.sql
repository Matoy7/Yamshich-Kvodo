-- 1) Where am I actually connected?
select current_database() as database,
       current_user       as role,
       current_schema()   as default_schema;

-- 2) Do the three tables exist, and in which schema?
select table_schema, table_name
from information_schema.tables
where table_name in ('profiles','sentences','completions')
order by table_schema, table_name;

-- 3) Columns on profiles (proves the newer columns applied)
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;

-- 4) Is Row Level Security switched on?
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles','sentences','completions')
order by c.relname;

-- 5) Which policies exist?
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 6) Are the triggers installed?
select event_object_schema as on_schema,
       event_object_table  as on_table,
       trigger_name
from information_schema.triggers
where trigger_name in ('on_auth_user_created','profiles_touch_updated_at');

-- 7) Every user who has ever connected — guest or signed in with Google.
-- Reads auth.users, so this only works here in the SQL Editor, never from
-- the app itself (no RLS/public API exposes that table). Read-only.
select
  u.id,
  u.email,                                                  -- null for guests
  coalesce(p.display_name, p.first_name, 'ללא שם')  as name,
  case when u.is_anonymous then 'guest' else 'google' end   as account_type,
  u.created_at        as first_connected_at,
  u.last_sign_in_at,
  (select count(*) from public.sentences   s where s.author_id = u.id) as sentences_started,
  (select count(*) from public.completions c where c.author_id = u.id) as completions_written
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;

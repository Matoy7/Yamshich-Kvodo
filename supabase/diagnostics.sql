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

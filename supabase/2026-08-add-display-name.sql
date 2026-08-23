-- Adds the guest display name and its uniqueness guarantee.
alter table public.profiles add column if not exists display_name text;

create unique index if not exists profiles_display_name_unique
  on public.profiles (lower(display_name))
  where display_name is not null;

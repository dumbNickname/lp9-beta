-- profiles table: 1:1 extension of auth.users
-- See DESIGN.md §13a

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'en'
    check (locale in ('en', 'pl', 'de')),
  theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "select own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

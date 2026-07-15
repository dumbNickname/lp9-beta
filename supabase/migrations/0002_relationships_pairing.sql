-- relationships + pairing_invites tables, RLS, is_relationship_member
-- See DESIGN.md §13a, §13c

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references public.profiles(id) on delete cascade,
  member_b uuid not null references public.profiles(id) on delete cascade,
  archetype text not null
    check (archetype in ('getting_to_know', 'established_couple', 'close_friends')),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  paired_at timestamptz,
  wrapped_key_blob bytea,
  wrap_salt bytea,
  wrap_iterations int,
  wrap_algo text,
  constraint members_distinct check (member_a <> member_b)
);

create unique index relationships_member_pair_uniq
  on public.relationships (least(member_a, member_b), greatest(member_a, member_b));

create table public.pairing_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  archetype text not null
    check (archetype in ('getting_to_know', 'established_couple', 'close_friends')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  consumed_at timestamptz
);

-- Helper: is the current user a member of the given relationship?
create or replace function public.is_relationship_member(rel_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.relationships
    where id = rel_id
      and (member_a = auth.uid() or member_b = auth.uid())
  );
$$;

-- RLS
alter table public.relationships enable row level security;
alter table public.pairing_invites enable row level security;

-- relationships: members can read/update; no direct insert (RPC only, PRD-16)
create policy "members select relationship"
  on public.relationships for select
  using (public.is_relationship_member(id));

create policy "members update relationship"
  on public.relationships for update
  using (public.is_relationship_member(id))
  with check (public.is_relationship_member(id));

-- pairing_invites: creator reads own; creator inserts own; redemption via RPC
create policy "creator select invite"
  on public.pairing_invites for select
  using (created_by = auth.uid());

create policy "creator insert invite"
  on public.pairing_invites for insert
  with check (created_by = auth.uid());

-- profiles: allow reading a relationship co-member's profile (§13c)
create policy "select co-member profile"
  on public.profiles for select
  using (
    exists (
      select 1 from public.relationships r
      where (r.member_a = auth.uid() and r.member_b = public.profiles.id)
         or (r.member_b = auth.uid() and r.member_a = public.profiles.id)
    )
  );

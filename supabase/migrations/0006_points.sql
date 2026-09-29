-- points (hearts) table, RLS, and write RPCs
-- See DESIGN.md §5c, §5d, §12a, §13a, §13c, §13d, §13e; PRD-27

create table public.points (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  giver_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null check (amount between 1 and 5),
  comment_ciphertext bytea,
  comment_iv bytea,
  edited_at timestamptz,
  event_date date not null default current_date,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint points_giver_receiver_distinct check (giver_id <> receiver_id),
  constraint points_comment_pair check (
    (comment_ciphertext is null and comment_iv is null)
    or (comment_ciphertext is not null and comment_iv is not null)
  ),
  constraint points_comment_iv_len check (
    comment_iv is null or octet_length(comment_iv) = 12
  ),
  constraint points_comment_len check (
    comment_ciphertext is null or octet_length(comment_ciphertext) <= 1024
  )
);

create index points_relationship_created_idx
  on public.points (relationship_id, created_at desc);
create index points_receiver_created_idx
  on public.points (receiver_id, created_at desc);

alter table public.points enable row level security;

-- Read-only for members; soft-deleted rows are invisible to both partners
-- (silent delete, §5d). All writes go through the RPCs below.
create policy "members select live points"
  on public.points for select
  using (public.is_relationship_member(relationship_id) and deleted_at is null);

-- Shared comment validation for give/edit.
create or replace function public.check_point_comment(p_ciphertext bytea, p_iv bytea)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if (p_ciphertext is null) <> (p_iv is null) then
    raise exception 'invalid comment';
  end if;
  if p_iv is not null and octet_length(p_iv) <> 12 then
    raise exception 'invalid comment';
  end if;
  if p_ciphertext is not null
     and (octet_length(p_ciphertext) = 0 or octet_length(p_ciphertext) > 1024) then
    raise exception 'invalid comment';
  end if;
end;
$$;

create or replace function public.give_points(
  p_rel_id uuid,
  p_amount int,
  p_ciphertext bytea,
  p_iv bytea,
  p_event_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rel public.relationships%rowtype;
  v_receiver uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_rel from public.relationships where id = p_rel_id;
  if not found or (v_rel.member_a <> auth.uid() and v_rel.member_b <> auth.uid()) then
    raise exception 'not a relationship member';
  end if;
  if v_rel.status <> 'active' then
    raise exception 'relationship not active';
  end if;

  if p_amount is null or p_amount < 1 or p_amount > 5 then
    raise exception 'invalid amount';
  end if;

  -- +1 day tolerates clients ahead of UTC (D-27.2); UI caps at local today.
  if p_event_date is null
     or p_event_date < current_date - 30
     or p_event_date > current_date + 1 then
    raise exception 'invalid event date';
  end if;

  perform public.check_point_comment(p_ciphertext, p_iv);

  v_receiver := case when v_rel.member_a = auth.uid() then v_rel.member_b else v_rel.member_a end;

  insert into public.points
    (relationship_id, giver_id, receiver_id, amount, comment_ciphertext, comment_iv, event_date)
  values
    (p_rel_id, auth.uid(), v_receiver, p_amount, p_ciphertext, p_iv, p_event_date)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.edit_point_comment(
  p_point_id uuid,
  p_ciphertext bytea,
  p_iv bytea
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_point public.points%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_point from public.points where id = p_point_id for update;
  if not found or v_point.deleted_at is not null
     or not public.is_relationship_member(v_point.relationship_id) then
    raise exception 'not found';
  end if;
  if v_point.giver_id <> auth.uid() then
    raise exception 'not the giver';
  end if;
  if v_point.created_at <= now() - interval '24 hours' then
    raise exception 'edit window closed';
  end if;

  perform public.check_point_comment(p_ciphertext, p_iv);

  update public.points
  set comment_ciphertext = p_ciphertext,
      comment_iv = p_iv,
      edited_at = now()
  where id = p_point_id;
end;
$$;

create or replace function public.delete_point(p_point_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_point public.points%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_point from public.points where id = p_point_id for update;
  if not found or v_point.deleted_at is not null
     or not public.is_relationship_member(v_point.relationship_id) then
    raise exception 'not found';
  end if;
  if v_point.giver_id <> auth.uid() then
    raise exception 'not the giver';
  end if;
  if v_point.created_at <= now() - interval '5 minutes' then
    raise exception 'delete window closed';
  end if;

  update public.points set deleted_at = now() where id = p_point_id;
end;
$$;

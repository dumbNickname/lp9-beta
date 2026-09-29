-- coupons (wishlists) table, RLS, and RPCs
-- See DESIGN.md §6 (amended 2026-09-29), §13a, §13c, §13d; PRD-35

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  giver_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  boundaries_note text check (boundaries_note is null or char_length(boundaries_note) <= 300),
  emoji text check (emoji is null or octet_length(emoji) <= 16),
  price int not null check (price between 1 and 50),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'declined', 'retired')),
  decline_note text check (decline_note is null or char_length(decline_note) <= 200),
  template_key text check (template_key is null or char_length(template_key) <= 64),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  declined_at timestamptz,
  retired_at timestamptz,
  constraint coupons_receiver_giver_distinct check (receiver_id <> giver_id)
);

create index coupons_relationship_status_idx
  on public.coupons (relationship_id, status);

alter table public.coupons enable row level security;

create policy "members select coupons"
  on public.coupons for select
  using (public.is_relationship_member(relationship_id));

-- Normalise optional text: trim, empty -> null.
create or replace function public.coupon_opt(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(btrim(p), '');
$$;

create or replace function public.check_coupon_fields(
  p_title text,
  p_description text,
  p_boundaries text,
  p_emoji text,
  p_price int
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_title is null or char_length(btrim(p_title)) not between 1 and 80 then
    raise exception 'invalid title';
  end if;
  if p_price is null or p_price < 1 or p_price > 50 then
    raise exception 'invalid price';
  end if;
  if (p_description is not null and char_length(btrim(p_description)) > 300)
     or (p_boundaries is not null and char_length(btrim(p_boundaries)) > 300)
     or (p_emoji is not null and octet_length(btrim(p_emoji)) > 16) then
    raise exception 'invalid field';
  end if;
end;
$$;

create or replace function public.submit_coupon(
  p_rel_id uuid,
  p_title text,
  p_description text,
  p_boundaries text,
  p_emoji text,
  p_price int,
  p_template_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rel public.relationships%rowtype;
  v_giver uuid;
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

  perform public.check_coupon_fields(p_title, p_description, p_boundaries, p_emoji, p_price);
  if p_template_key is not null and char_length(p_template_key) > 64 then
    raise exception 'invalid field';
  end if;

  v_giver := case when v_rel.member_a = auth.uid() then v_rel.member_b else v_rel.member_a end;

  insert into public.coupons
    (relationship_id, receiver_id, giver_id, title, description, boundaries_note,
     emoji, price, template_key)
  values
    (p_rel_id, auth.uid(), v_giver, btrim(p_title), public.coupon_opt(p_description),
     public.coupon_opt(p_boundaries), public.coupon_opt(p_emoji), p_price,
     public.coupon_opt(p_template_key))
  returning id into v_id;

  return v_id;
end;
$$;

-- Lock + load a coupon the caller can see; raises 'not found' otherwise.
create or replace function public.load_coupon_for_update(p_coupon_id uuid)
returns public.coupons
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupons%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into v from public.coupons where id = p_coupon_id for update;
  if not found or not public.is_relationship_member(v.relationship_id) then
    raise exception 'not found';
  end if;
  return v;
end;
$$;

create or replace function public.update_coupon_draft(
  p_coupon_id uuid,
  p_title text,
  p_description text,
  p_boundaries text,
  p_emoji text,
  p_price int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupons%rowtype;
begin
  v := public.load_coupon_for_update(p_coupon_id);
  if v.receiver_id <> auth.uid() then
    raise exception 'not the receiver';
  end if;
  if v.status <> 'draft' then
    raise exception 'invalid status';
  end if;
  perform public.check_coupon_fields(p_title, p_description, p_boundaries, p_emoji, p_price);

  update public.coupons
  set title = btrim(p_title),
      description = public.coupon_opt(p_description),
      boundaries_note = public.coupon_opt(p_boundaries),
      emoji = public.coupon_opt(p_emoji),
      price = p_price
  where id = p_coupon_id;
end;
$$;

create or replace function public.delete_coupon(p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupons%rowtype;
begin
  v := public.load_coupon_for_update(p_coupon_id);
  if v.receiver_id <> auth.uid() then
    raise exception 'not the receiver';
  end if;
  if v.status not in ('draft', 'declined') then
    raise exception 'invalid status';
  end if;
  delete from public.coupons where id = p_coupon_id;
end;
$$;

create or replace function public.approve_coupon(p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupons%rowtype;
begin
  v := public.load_coupon_for_update(p_coupon_id);
  if v.giver_id <> auth.uid() then
    raise exception 'not the giver';
  end if;
  if v.status <> 'draft' then
    raise exception 'invalid status';
  end if;
  update public.coupons
  set status = 'approved', approved_at = now()
  where id = p_coupon_id;
end;
$$;

create or replace function public.decline_coupon(p_coupon_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupons%rowtype;
begin
  v := public.load_coupon_for_update(p_coupon_id);
  if v.giver_id <> auth.uid() then
    raise exception 'not the giver';
  end if;
  if v.status <> 'draft' then
    raise exception 'invalid status';
  end if;
  if p_note is not null and char_length(btrim(p_note)) > 200 then
    raise exception 'invalid field';
  end if;
  update public.coupons
  set status = 'declined', declined_at = now(), decline_note = public.coupon_opt(p_note)
  where id = p_coupon_id;
end;
$$;

-- Either member may retire an approved coupon (D-35.1). Pending-claim
-- refunds are added with coupon_claims (Phase 5).
create or replace function public.retire_coupon(p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupons%rowtype;
begin
  v := public.load_coupon_for_update(p_coupon_id);
  if v.status <> 'approved' then
    raise exception 'invalid status';
  end if;
  update public.coupons
  set status = 'retired', retired_at = now()
  where id = p_coupon_id;
end;
$$;

-- Internal helper; not callable by API clients.
revoke execute on function public.load_coupon_for_update(uuid) from public, anon, authenticated;

-- coupon_claims: two-step escrow flow (claim -> accept -> deliver)
-- See DESIGN.md §5e, §5f (resolved 2026-09-29), §13a, §13b, §13d; PRD-41

create table public.coupon_claims (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  claimer_id uuid not null references public.profiles(id) on delete cascade,
  deliverer_id uuid not null references public.profiles(id) on delete cascade,
  price_at_claim int not null check (price_at_claim > 0),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'delivered',
                      'auto_refunded', 'withdrawn', 'cancelled')),
  scheduled_date date,
  accept_note text check (accept_note is null or char_length(accept_note) <= 200),
  decline_reason text check (decline_reason is null or char_length(decline_reason) <= 200),
  cancel_note text check (cancel_note is null or char_length(cancel_note) <= 200),
  cancelled_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  delivered_at timestamptz,
  withdrawn_at timestamptz,
  cancelled_at timestamptz,
  auto_refunded_at timestamptz,
  nudged_at timestamptz,
  constraint claims_parties_distinct check (claimer_id <> deliverer_id)
);

-- One open claim per coupon (§5f).
create unique index coupon_claims_one_open_per_coupon
  on public.coupon_claims (coupon_id)
  where status in ('pending', 'accepted');

create index coupon_claims_relationship_status_idx
  on public.coupon_claims (relationship_id, status);
create index coupon_claims_deliverer_status_idx
  on public.coupon_claims (deliverer_id, status);

alter table public.coupon_claims enable row level security;

create policy "members select claims"
  on public.coupon_claims for select
  using (public.is_relationship_member(relationship_id));

-- Spendable balance (§13b): received live hearts minus escrowed + spent.
create or replace function public.spendable_hearts(p_rel_id uuid, p_user uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select sum(amount) from public.points
              where relationship_id = p_rel_id and receiver_id = p_user
                and deleted_at is null), 0)::int
    - coalesce((select sum(price_at_claim) from public.coupon_claims
                where relationship_id = p_rel_id and claimer_id = p_user
                  and status in ('pending', 'accepted', 'delivered')), 0)::int;
$$;

revoke execute on function public.spendable_hearts(uuid, uuid) from public, anon, authenticated;

create or replace function public.claim_coupon(p_coupon_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons%rowtype;
  v_rel public.relationships%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_coupon from public.coupons where id = p_coupon_id for update;
  if not found or not public.is_relationship_member(v_coupon.relationship_id) then
    raise exception 'not found';
  end if;
  if v_coupon.receiver_id <> auth.uid() then
    raise exception 'not the receiver';
  end if;
  if v_coupon.status <> 'approved' then
    raise exception 'coupon not available';
  end if;

  select * into v_rel from public.relationships where id = v_coupon.relationship_id;
  if v_rel.status <> 'active' then
    raise exception 'relationship not active';
  end if;

  -- Serialize this claimer's claims in this relationship so parallel
  -- requests cannot both pass the balance check.
  perform pg_advisory_xact_lock(hashtextextended(v_coupon.relationship_id::text || auth.uid()::text, 0));

  if exists (select 1 from public.coupon_claims
             where coupon_id = p_coupon_id and status in ('pending', 'accepted')) then
    raise exception 'already claimed';
  end if;

  if public.spendable_hearts(v_coupon.relationship_id, auth.uid()) < v_coupon.price then
    raise exception 'not enough hearts';
  end if;

  insert into public.coupon_claims
    (coupon_id, relationship_id, claimer_id, deliverer_id, price_at_claim)
  values
    (p_coupon_id, v_coupon.relationship_id, auth.uid(), v_coupon.giver_id, v_coupon.price)
  returning id into v_id;

  return v_id;
end;
$$;

-- Lock + load a visible claim; raises 'not found' otherwise. Internal.
create or replace function public.load_claim_for_update(p_claim_id uuid)
returns public.coupon_claims
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupon_claims%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into v from public.coupon_claims where id = p_claim_id for update;
  if not found or not public.is_relationship_member(v.relationship_id) then
    raise exception 'not found';
  end if;
  return v;
end;
$$;

revoke execute on function public.load_claim_for_update(uuid) from public, anon, authenticated;

create or replace function public.check_claim_note(p text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p is not null and char_length(btrim(p)) > 200 then
    raise exception 'invalid field';
  end if;
end;
$$;

create or replace function public.accept_claim(p_claim_id uuid, p_date date, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupon_claims%rowtype;
begin
  v := public.load_claim_for_update(p_claim_id);
  if v.deliverer_id <> auth.uid() then
    raise exception 'not the deliverer';
  end if;
  if v.status <> 'pending' then
    raise exception 'invalid status';
  end if;
  if p_date is not null and (p_date < current_date - 1 or p_date > current_date + 365) then
    raise exception 'invalid date';
  end if;
  perform public.check_claim_note(p_note);
  update public.coupon_claims
  set status = 'accepted', accepted_at = now(), scheduled_date = p_date,
      accept_note = nullif(btrim(p_note), '')
  where id = p_claim_id;
end;
$$;

create or replace function public.decline_claim(p_claim_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupon_claims%rowtype;
begin
  v := public.load_claim_for_update(p_claim_id);
  if v.deliverer_id <> auth.uid() then
    raise exception 'not the deliverer';
  end if;
  if v.status <> 'pending' then
    raise exception 'invalid status';
  end if;
  perform public.check_claim_note(p_reason);
  update public.coupon_claims
  set status = 'declined', declined_at = now(), decline_reason = nullif(btrim(p_reason), '')
  where id = p_claim_id;
end;
$$;

create or replace function public.deliver_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupon_claims%rowtype;
begin
  v := public.load_claim_for_update(p_claim_id);
  if v.deliverer_id <> auth.uid() then
    raise exception 'not the deliverer';
  end if;
  if v.status <> 'accepted' then
    raise exception 'invalid status';
  end if;
  update public.coupon_claims
  set status = 'delivered', delivered_at = now()
  where id = p_claim_id;
end;
$$;

create or replace function public.withdraw_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupon_claims%rowtype;
begin
  v := public.load_claim_for_update(p_claim_id);
  if v.claimer_id <> auth.uid() then
    raise exception 'not the claimer';
  end if;
  if v.status <> 'pending' then
    raise exception 'invalid status';
  end if;
  update public.coupon_claims
  set status = 'withdrawn', withdrawn_at = now()
  where id = p_claim_id;
end;
$$;

-- Either member may cancel an accepted, undelivered claim (§5f). Refund is
-- implicit: cancelled claims no longer count against the balance.
create or replace function public.cancel_claim(p_claim_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupon_claims%rowtype;
begin
  v := public.load_claim_for_update(p_claim_id);
  if v.status <> 'accepted' then
    raise exception 'invalid status';
  end if;
  perform public.check_claim_note(p_note);
  update public.coupon_claims
  set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
      cancel_note = nullif(btrim(p_note), '')
  where id = p_claim_id;
end;
$$;

create or replace function public.nudge_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.coupon_claims%rowtype;
begin
  v := public.load_claim_for_update(p_claim_id);
  if v.claimer_id <> auth.uid() then
    raise exception 'not the claimer';
  end if;
  if v.status <> 'pending' then
    raise exception 'invalid status';
  end if;
  if v.claimed_at > now() - interval '7 days' then
    raise exception 'too early to nudge';
  end if;
  if v.nudged_at is not null and v.nudged_at > now() - interval '24 hours' then
    raise exception 'already nudged';
  end if;
  update public.coupon_claims set nudged_at = now() where id = p_claim_id;
end;
$$;

-- Lazy 14-day auto-refund (§5f): called whenever a member loads claims.
create or replace function public.sweep_expired_claims(p_rel_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_relationship_member(p_rel_id) then
    raise exception 'not a relationship member';
  end if;
  update public.coupon_claims
  set status = 'auto_refunded', auto_refunded_at = now()
  where relationship_id = p_rel_id
    and status = 'pending'
    and claimed_at < now() - interval '14 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Retiring a coupon now also cancels (refunds) its open claims (§6b, §5f).
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
  update public.coupon_claims
  set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
      cancel_note = 'coupon retired'
  where coupon_id = p_coupon_id and status in ('pending', 'accepted');
end;
$$;

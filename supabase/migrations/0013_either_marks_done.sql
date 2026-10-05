-- Either partner may mark an accepted claim done (DESIGN.md §5f amended
-- 2026-10-05, PRD-56). Status stays 'delivered'; delivered_by records who
-- tapped it and the push goes to the other partner.

alter table public.coupon_claims
  add column delivered_by uuid references public.profiles(id) on delete set null;

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
  if v.status <> 'accepted' then
    raise exception 'invalid status';
  end if;
  update public.coupon_claims
  set status = 'delivered', delivered_at = now(), delivered_by = auth.uid()
  where id = p_claim_id;
end;
$$;

revoke execute on function public.deliver_claim(uuid) from public, anon;
grant execute on function public.deliver_claim(uuid) to authenticated;

create or replace function public.on_claim_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.push_event(new.deliverer_id, 'claimed', new.relationship_id);
  elsif new.status is distinct from old.status then
    if new.status in ('accepted', 'declined', 'auto_refunded') then
      perform public.push_event(new.claimer_id, new.status, new.relationship_id);
    elsif new.status = 'delivered' then
      perform public.push_event(
        case when new.delivered_by = new.claimer_id then new.deliverer_id else new.claimer_id end,
        'delivered', new.relationship_id);
    elsif new.status = 'cancelled' then
      perform public.push_event(
        case when new.cancelled_by = new.claimer_id then new.deliverer_id else new.claimer_id end,
        'cancelled', new.relationship_id);
    end if;
  elsif new.nudged_at is distinct from old.nudged_at and new.nudged_at is not null then
    perform public.push_event(new.deliverer_id, 'nudge', new.relationship_id);
  end if;
  return new;
exception when others then
  return new;
end;
$$;

revoke execute on function public.on_claim_push() from public, anon, authenticated;

-- Hearts push on every heart (2026-10-16, owner): the 20h per-receiver
-- throttle is dropped; users expect a nudge right away and it makes
-- delivery easy to verify. push_state.last_hearts_push_at stays unused.

create or replace function public.on_point_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.push_event(new.receiver_id, 'hearts', new.relationship_id);
  return new;
exception when others then
  return new;
end;
$$;

revoke execute on function public.on_point_push() from public, anon, authenticated;

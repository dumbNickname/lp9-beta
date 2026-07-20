-- Read-only peek for the join confirm preview: peek_pair_code
-- See DESIGN.md §13d, PRD-25 (D-25.2)
--
-- Returns the inviter's display_name + archetype for a valid, unconsumed,
-- unexpired code so the redeemer can render "Join <name>?" BEFORE deciding
-- to redeem. It MUST NOT consume or modify the invite and MUST NOT return
-- any key material (there is none server-side; the AES key rides only in the
-- invite link fragment). RLS lets only the invite creator SELECT the invite
-- and the co-member profile policy needs an existing relationship, so the
-- redeemer cannot read the inviter name pre-pairing without this RPC.
create or replace function public.peek_pair_code(p_code text)
returns table(display_name text, archetype text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.pairing_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite
  from public.pairing_invites
  where code = p_code;

  if not found then
    raise exception 'invalid code';
  end if;

  if v_invite.consumed_at is not null then
    raise exception 'code already used';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'code expired';
  end if;

  return query
    select p.display_name, v_invite.archetype
    from public.profiles p
    where p.id = v_invite.created_by;
end;
$$;

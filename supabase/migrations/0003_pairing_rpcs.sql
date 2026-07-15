-- Pairing RPCs: create_pair_invite, redeem_pair_code, revoke_pair_invite
-- See DESIGN.md §13d, PRD-16

-- Generate an 8-char opaque code from an unambiguous charset.
create or replace function public.gen_pair_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  charset text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(charset, floor(random() * length(charset) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Inviter creates a pairing invite; returns the code.
create or replace function public.create_pair_invite(p_archetype text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_attempts int := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_archetype not in ('getting_to_know', 'established_couple', 'close_friends') then
    raise exception 'invalid archetype';
  end if;

  loop
    v_code := public.gen_pair_code();
    begin
      insert into public.pairing_invites (code, created_by, archetype)
      values (v_code, auth.uid(), p_archetype);
      return v_code;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts >= 5 then
        raise exception 'could not generate unique code';
      end if;
    end;
  end loop;
end;
$$;

-- Redeemer consumes a code; creates the relationship; returns its id.
create or replace function public.redeem_pair_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.pairing_invites%rowtype;
  v_rel_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Lock the invite row to make single-use race-safe.
  select * into v_invite
  from public.pairing_invites
  where code = p_code
  for update;

  if not found then
    raise exception 'invalid code';
  end if;

  if v_invite.consumed_at is not null then
    raise exception 'code already used';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'code expired';
  end if;

  if v_invite.created_by = auth.uid() then
    raise exception 'cannot pair with yourself';
  end if;

  -- Guard against an existing relationship for this pair.
  if exists (
    select 1 from public.relationships
    where least(member_a, member_b) = least(v_invite.created_by, auth.uid())
      and greatest(member_a, member_b) = greatest(v_invite.created_by, auth.uid())
  ) then
    raise exception 'relationship already exists';
  end if;

  insert into public.relationships (member_a, member_b, archetype, paired_at)
  values (v_invite.created_by, auth.uid(), v_invite.archetype, now())
  returning id into v_rel_id;

  update public.pairing_invites
  set consumed_at = now()
  where id = v_invite.id;

  return v_rel_id;
end;
$$;

-- Inviter revokes an unconsumed invite (HANDOFF Q-A).
create or replace function public.revoke_pair_invite(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from public.pairing_invites
  where code = p_code
    and created_by = auth.uid()
    and consumed_at is null;

  if not found then
    raise exception 'no revocable invite for this code';
  end if;
end;
$$;

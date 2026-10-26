-- Security audit follow-ups (2026-10-26).
--
-- 1. set_recovery_password stored any blob, salt, iteration count and
--    algo name (a 1 MB blob and iterations = -1 were accepted live). A
--    member could break the partner's restore or make their device spin
--    on a huge PBKDF2 count. Only the shape the client writes is allowed:
--    blob = 12-byte IV + AES-GCM of a 32-byte key (60 bytes), 16-byte
--    salt, PBKDF2-SHA256.
-- 2. 0011's per-schema "revoke execute on functions from public" cannot
--    remove the built-in PUBLIC grant (Postgres only does that for the
--    global form), so new functions were still callable by anon. The
--    global form below makes every future function created by postgres
--    start closed; RPCs must grant authenticated explicitly (they do).

create or replace function public.set_recovery_password(
  p_rel_id uuid,
  p_wrapped_blob bytea,
  p_salt bytea,
  p_iterations int,
  p_algo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_relationship_member(p_rel_id) then
    raise exception 'not a relationship member';
  end if;

  if p_wrapped_blob is null or octet_length(p_wrapped_blob) not between 28 and 256
     or p_salt is null or octet_length(p_salt) not between 16 and 64
     or p_iterations is null or p_iterations not between 100000 and 5000000
     or p_algo is distinct from 'PBKDF2-SHA256' then
    raise exception 'invalid recovery parameters';
  end if;

  update public.relationships
  set wrapped_key_blob = p_wrapped_blob,
      wrap_salt = p_salt,
      wrap_iterations = p_iterations,
      wrap_algo = p_algo
  where id = p_rel_id;
end;
$$;

revoke execute on function public.set_recovery_password(uuid, bytea, bytea, int, text) from public, anon;
grant execute on function public.set_recovery_password(uuid, bytea, bytea, int, text) to authenticated;

alter default privileges for role postgres revoke execute on functions from public;

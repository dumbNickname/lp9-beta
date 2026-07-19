-- set_recovery_password RPC: first-set and change of the password-wrapped key
-- See DESIGN.md §12b, §13d, PRD-22

-- Member writes the password-wrapped key blob + PBKDF2 params onto their
-- relationship row. Covers both first-set and change (plain re-wrap UPDATE).
-- The server never sees the password or the plaintext key, only the blob.
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

  update public.relationships
  set wrapped_key_blob = p_wrapped_blob,
      wrap_salt = p_salt,
      wrap_iterations = p_iterations,
      wrap_algo = p_algo
  where id = p_rel_id;
end;
$$;

-- Lock relationship writes + revoke helper grants (PRD-54, REVIEW #1/#2)
--
-- 1. Members could UPDATE any column of their relationship row directly
--    (archive it, swap a member to hand it to an outsider, wipe the
--    recovery blob). Every legitimate write already goes through a
--    SECURITY DEFINER RPC (redeem_pair_code, set_recovery_password), so
--    the table gets no write policy at all.
-- 2. Postgres grants EXECUTE on new functions to PUBLIC. Internal helpers
--    are callable only from other functions (definer RPCs run as owner).
--    is_relationship_member stays callable by signed-in users because RLS
--    policies evaluate it as the caller.

drop policy if exists "members update relationship" on public.relationships;

revoke execute on function public.gen_pair_code() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.check_point_comment(bytea, bytea) from public, anon, authenticated;
revoke execute on function public.coupon_opt(text) from public, anon, authenticated;
revoke execute on function public.check_coupon_fields(text, text, text, text, int) from public, anon, authenticated;
revoke execute on function public.check_claim_note(text) from public, anon, authenticated;

revoke execute on function public.is_relationship_member(uuid) from public, anon;
grant execute on function public.is_relationship_member(uuid) to authenticated;

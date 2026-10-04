-- API RPCs: signed-in callers only (Supabase advisor "Public Can Execute
-- SECURITY DEFINER Function"). Every RPC already raises when auth.uid()
-- is null; this removes the no-login role from the surface entirely.
-- App users sign in anonymously, which is the `authenticated` role, so
-- they keep access. Helpers were locked down in 0010.

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.accept_claim(uuid, date, text)',
    'public.approve_coupon(uuid)',
    'public.cancel_claim(uuid, text)',
    'public.claim_coupon(uuid)',
    'public.create_pair_invite(text)',
    'public.decline_claim(uuid, text)',
    'public.decline_coupon(uuid, text)',
    'public.delete_coupon(uuid)',
    'public.delete_point(uuid)',
    'public.delete_push_subscription(text)',
    'public.deliver_claim(uuid)',
    'public.edit_point_comment(uuid, bytea, bytea)',
    'public.give_points(uuid, int, bytea, bytea, date)',
    'public.nudge_claim(uuid)',
    'public.peek_pair_code(text)',
    'public.redeem_pair_code(text)',
    'public.retire_coupon(uuid)',
    'public.revoke_pair_invite(text)',
    'public.save_push_subscription(text, text, text, text)',
    'public.set_recovery_password(uuid, bytea, bytea, int, text)',
    'public.submit_coupon(uuid, text, text, text, text, int, text)',
    'public.sweep_expired_claims(uuid)',
    'public.update_coupon_draft(uuid, text, text, text, text, int)',
    'public.withdraw_claim(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end
$$;

-- Future functions in public: no implicit EXECUTE for PUBLIC/anon.
alter default privileges in schema public revoke execute on functions from public, anon;

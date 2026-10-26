-- Explicit Data API table grants (Supabase change 2026-10-30: new tables
-- in public no longer get automatic grants for anon, authenticated and
-- service_role). Fresh databases (new prod project, previews, db reset)
-- must reach the same access as the live beta, and nothing more.
--
-- Least privilege, matching how the app talks to the database:
-- - anon: nothing. Every app user signs in (anonymously) first.
-- - authenticated: SELECT where an RLS select policy exists; UPDATE on
--   the three profile columns the app edits. All other writes go through
--   security definer RPCs, which run as the owner and need no grant.
-- - service_role: full DML (notify Edge Function, dashboard ops).
-- push_state is internal (no policies): service_role only.

-- Future tables and sequences in public: no implicit grants (same
-- statements Supabase runs on new projects; opts in ahead of the date).
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;

revoke all on table
  public.profiles,
  public.relationships,
  public.pairing_invites,
  public.points,
  public.coupons,
  public.coupon_claims,
  public.push_subscriptions,
  public.push_state
from anon, authenticated, service_role;

grant select on table
  public.profiles,
  public.relationships,
  public.pairing_invites,
  public.points,
  public.coupons,
  public.coupon_claims,
  public.push_subscriptions
to authenticated;

grant update (display_name, locale, theme) on public.profiles to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.relationships,
  public.pairing_invites,
  public.points,
  public.coupons,
  public.coupon_claims,
  public.push_subscriptions,
  public.push_state
to service_role;

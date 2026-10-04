-- Security review follow-ups (REVIEW.md "Security loop 2026-10-04").

-- 1. pairing_invites: invites are only created via create_pair_invite.
--    The direct INSERT policy let a client pick its own code and expiry.
drop policy if exists "creator insert invite" on public.pairing_invites;

-- 2. profiles: the app updates display_name / locale / theme directly;
--    limit the writable columns and cap the name length (UI caps at 50).
alter table public.profiles
  add constraint profiles_display_name_len
  check (display_name is null or char_length(display_name) <= 50) not valid;
revoke update on public.profiles from anon, authenticated;
grant update (display_name, locale, theme) on public.profiles to authenticated;

-- 3. push_subscriptions: only real browser push services and at most 10
--    devices per user (stops using notify as a request amplifier). An
--    endpoint is an unguessable URL known only to its browser, so a
--    re-save by another account means the same device signed in anew.
create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
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
  if p_endpoint is null or p_endpoint !~ '^https://([a-z0-9-]+\.)*(googleapis\.com|mozilla\.com|push\.apple\.com|notify\.windows\.com)/' then
    raise exception 'invalid subscription';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        created_at = now();

  delete from public.push_subscriptions
  where user_id = auth.uid()
    and id not in (
      select id from public.push_subscriptions
      where user_id = auth.uid()
      order by created_at desc
      limit 10
    );
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

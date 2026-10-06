-- Push fixes (2026-10-06).
-- 1. Hearts throttle only starts when a push can actually go out. Before,
--    a heart sent while the receiver had no device (or Vault was not set
--    up) still stamped the 20h window, silencing the next real one.
-- 2. send_test_push(): debug RPC that pushes the `test` message to the
--    caller's own devices, at most once per 30 seconds.

alter table public.push_state add column last_test_push_at timestamptz;

-- True when push_event would really call the notify function.
create or replace function public.push_ready(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return p_user is not null
    and exists (select 1 from public.push_subscriptions where user_id = p_user)
    and exists (select 1 from vault.decrypted_secrets where name = 'push_webhook_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'push_webhook_secret');
exception when others then
  return false;
end;
$$;

revoke execute on function public.push_ready(uuid) from public, anon, authenticated;

create or replace function public.on_point_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last timestamptz;
begin
  if not public.push_ready(new.receiver_id) then
    return new;
  end if;
  select last_hearts_push_at into v_last from public.push_state where user_id = new.receiver_id;
  if v_last is not null and v_last > now() - interval '20 hours' then
    return new;
  end if;
  insert into public.push_state (user_id, last_hearts_push_at)
  values (new.receiver_id, now())
  on conflict (user_id) do update set last_hearts_push_at = excluded.last_hearts_push_at;
  perform public.push_event(new.receiver_id, 'hearts', new.relationship_id);
  return new;
exception when others then
  return new;
end;
$$;

revoke execute on function public.on_point_push() from public, anon, authenticated;

alter table public.push_state add column last_test_request_id bigint;

-- Debug: push the `test` message to the caller's own devices. Returns
-- { status: no_device | not_configured | too_soon | queued, request_id }.
create or replace function public.send_test_push()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_last timestamptz;
  v_url text;
  v_secret text;
  v_id bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.push_subscriptions where user_id = v_uid) then
    return jsonb_build_object('status', 'no_device');
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then
    return jsonb_build_object('status', 'not_configured');
  end if;
  select last_test_push_at into v_last from public.push_state where user_id = v_uid;
  if v_last is not null and v_last > now() - interval '30 seconds' then
    return jsonb_build_object('status', 'too_soon');
  end if;
  select net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('user_id', v_uid, 'kind', 'test')
  ) into v_id;
  insert into public.push_state (user_id, last_test_push_at, last_test_request_id)
  values (v_uid, now(), v_id)
  on conflict (user_id) do update
    set last_test_push_at = excluded.last_test_push_at,
        last_test_request_id = excluded.last_test_request_id;
  return jsonb_build_object('status', 'queued', 'request_id', v_id);
end;
$$;

revoke execute on function public.send_test_push() from public, anon;
grant execute on function public.send_test_push() to authenticated;

-- Debug: what the notify function answered to the caller's last test.
-- Null until pg_net has the response.
create or replace function public.test_push_result()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_res jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select last_test_request_id into v_id from public.push_state where user_id = auth.uid();
  if v_id is null then
    return null;
  end if;
  select jsonb_build_object('status_code', r.status_code, 'body', left(r.content, 2000), 'error', r.error_msg)
    into v_res
    from net._http_response r where r.id = v_id;
  return v_res;
end;
$$;

revoke execute on function public.test_push_result() from public, anon;
grant execute on function public.test_push_result() to authenticated;

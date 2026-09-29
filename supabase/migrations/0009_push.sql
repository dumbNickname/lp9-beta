-- Web push (PRD-53): subscriptions, per-user throttle, and DB triggers
-- that call the `notify` Edge Function via pg_net.
-- DESIGN.md §8 (amended 2026-09-29): content-free, opt-in, hearts max
-- 1/day per receiver, coupon-flow events immediate.
--
-- One-time owner setup (see docs/push-setup.md):
--   select vault.create_secret('<random>', 'push_webhook_secret');
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/notify', 'push_webhook_url');
-- Until both exist, triggers do nothing (no errors).

create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 10 and 1000),
  p256dh text not null check (char_length(p256dh) between 10 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Users may see their own subscriptions (to show "on this device").
create policy "own push subscriptions"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

-- Throttle bookkeeping (service role only; no policies).
create table public.push_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_hearts_push_at timestamptz
);

alter table public.push_state enable row level security;

-- Save (or move to this user) a browser push subscription.
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
  if p_endpoint is null or p_endpoint !~ '^https://' then
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
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id = auth.uid();
end;
$$;

-- Fire-and-forget POST to the notify function. Silently no-ops until the
-- owner has stored the URL + secret in Vault.
create or replace function public.push_event(p_user uuid, p_kind text, p_rel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if p_user is null then
    return;
  end if;
  if not exists (select 1 from public.push_subscriptions where user_id = p_user) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('user_id', p_user, 'kind', p_kind, 'relationship_id', p_rel)
  );
exception when others then
  -- Never let notifications break the user's action.
  return;
end;
$$;

revoke execute on function public.push_event(uuid, text, uuid) from public, anon, authenticated;

-- Hearts: at most one push per receiver per 20h (content-free).
create or replace function public.on_point_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last timestamptz;
begin
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

create trigger points_push
  after insert on public.points
  for each row execute function public.on_point_push();

-- New wish waiting for the giver's yes.
create or replace function public.on_coupon_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status = 'draft' then
    perform public.push_event(new.giver_id, 'wish', new.relationship_id);
  end if;
  return new;
exception when others then
  return new;
end;
$$;

create trigger coupons_push
  after insert on public.coupons
  for each row execute function public.on_coupon_push();

-- Coupon flow (immediate): claimed -> deliverer; accepted/declined/
-- delivered/cancelled/auto_refunded -> claimer; nudge -> deliverer.
create or replace function public.on_claim_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.push_event(new.deliverer_id, 'claimed', new.relationship_id);
  elsif new.status is distinct from old.status then
    if new.status in ('accepted', 'declined', 'delivered', 'auto_refunded') then
      perform public.push_event(new.claimer_id, new.status, new.relationship_id);
    elsif new.status = 'cancelled' then
      perform public.push_event(
        case when new.cancelled_by = new.claimer_id then new.deliverer_id else new.claimer_id end,
        'cancelled', new.relationship_id);
    end if;
  elsif new.nudged_at is distinct from old.nudged_at and new.nudged_at is not null then
    perform public.push_event(new.deliverer_id, 'nudge', new.relationship_id);
  end if;
  return new;
exception when others then
  return new;
end;
$$;

create trigger coupon_claims_push
  after insert or update on public.coupon_claims
  for each row execute function public.on_claim_push();

revoke execute on function public.on_point_push() from public, anon, authenticated;
revoke execute on function public.on_coupon_push() from public, anon, authenticated;
revoke execute on function public.on_claim_push() from public, anon, authenticated;

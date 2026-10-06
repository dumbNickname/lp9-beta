import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Static guard for PRD-54: relationships have no write policy (writes only
// via definer RPCs), and internal helpers are not callable via the API.
// Migrations apply in name order, so the final state is what the last
// statement touching an object says.

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../../supabase/migrations");
const all = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(resolve(dir, f), "utf8").toLowerCase().replace(/\s+/g, " "))
  .join("\n");

describe("PRD-54: relationship writes locked", () => {
  it("no surviving update/insert/delete policy on relationships", () => {
    const created = [...all.matchAll(/create policy "([^"]+)" on public\.relationships for (update|insert|delete|all)/g)];
    for (const [, name] of created) {
      const dropAt = all.lastIndexOf(`drop policy if exists "${name}" on public.relationships`);
      const createAt = all.lastIndexOf(`create policy "${name}" on public.relationships`);
      expect(dropAt, `policy "${name}" must be dropped`).toBeGreaterThan(createAt);
    }
  });

  it.each([
    "gen_pair_code()",
    "handle_new_user()",
    "check_point_comment(bytea, bytea)",
    "coupon_opt(text)",
    "check_coupon_fields(text, text, text, text, int)",
    "check_claim_note(text)",
  ])("helper %s is revoked from public, anon, authenticated", (fn) => {
    expect(all).toContain(`revoke execute on function public.${fn} from public, anon, authenticated`);
  });

  it("is_relationship_member: anon revoked, authenticated kept (RLS needs it)", () => {
    expect(all).toContain("revoke execute on function public.is_relationship_member(uuid) from public, anon");
    expect(all).toContain("grant execute on function public.is_relationship_member(uuid) to authenticated");
  });
});

describe("every security definer function is locked from anon", () => {
  const defined = [...new Set([...all.matchAll(/create or replace function public\.(\w+)\s*\(/g)].map((m) => m[1] ?? ""))];
  const triggers = new Set(["handle_new_user", "on_point_push", "on_coupon_push", "on_claim_push"]);
  it.each(defined.filter((n) => !triggers.has(n)))("%s is not executable by anon", (name) => {
    const helperRevoke = new RegExp(`revoke execute on function public\\.${name}\\([^)]*\\) from public, anon`);
    const rpcList = new RegExp(`'public\\.${name}\\([^)]*\\)'`);
    expect(helperRevoke.test(all) || rpcList.test(all), `${name} needs a revoke from public, anon`).toBe(true);
  });
  it("default privileges drop EXECUTE for public and anon", () => {
    expect(all).toContain("alter default privileges in schema public revoke execute on functions from public, anon");
  });
});

describe("security follow-ups (0012)", () => {
  it("pairing invites are not directly insertable", () => {
    expect(all).toContain('drop policy if exists "creator insert invite" on public.pairing_invites');
  });
  it("profiles: only display_name, locale, theme are updatable", () => {
    expect(all).toContain("revoke update on public.profiles from anon, authenticated");
    expect(all).toContain("grant update (display_name, locale, theme) on public.profiles to authenticated");
  });
  it("push endpoints limited to browser push services", () => {
    const re = /(googleapis\\\.com|mozilla\\\.com|push\\\.apple\\\.com|notify\\\.windows\\\.com)/;
    const sql = all.slice(all.lastIndexOf("create or replace function public.save_push_subscription"));
    expect(re.test(sql)).toBe(true);
    for (const ok of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://web.push.apple.com/abc",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) expect(/^https:\/\/([a-z0-9-]+\.)*(googleapis\.com|mozilla\.com|push\.apple\.com|notify\.windows\.com)\//.test(ok)).toBe(true);
    expect(/^https:\/\/([a-z0-9-]+\.)*(googleapis\.com|mozilla\.com|push\.apple\.com|notify\.windows\.com)\//.test("https://evil.example/googleapis.com/")).toBe(false);
  });
});

describe("push fixes (0014)", () => {
  const lastDef = (name: string) => {
    const at = all.lastIndexOf(`create or replace function public.${name}(`);
    return all.slice(at, all.indexOf("$$;", at));
  };
  it("hearts throttle is stamped only after push_ready passes (regression)", () => {
    const fn = lastDef("on_point_push");
    const ready = fn.indexOf("if not public.push_ready(new.receiver_id) then return new;");
    expect(ready).toBeGreaterThan(-1);
    expect(fn.indexOf("insert into public.push_state")).toBeGreaterThan(ready);
  });
  it("push_ready checks device and both vault secrets, and is a locked helper", () => {
    const fn = lastDef("push_ready");
    expect(fn).toContain("public.push_subscriptions where user_id = p_user");
    expect(fn).toContain("'push_webhook_url'");
    expect(fn).toContain("'push_webhook_secret'");
    expect(all).toContain("revoke execute on function public.push_ready(uuid) from public, anon, authenticated");
  });
  it("send_test_push targets only the caller, throttled to 30s, authenticated only", () => {
    const fn = lastDef("send_test_push");
    expect(fn).toContain("v_uid uuid := auth.uid()");
    expect(fn).toContain("'user_id', v_uid, 'kind', 'test'");
    expect(fn).toContain("interval '30 seconds'");
    expect(all).toContain("grant execute on function public.send_test_push() to authenticated");
    expect(all).toContain("grant execute on function public.test_push_result() to authenticated");
  });
});

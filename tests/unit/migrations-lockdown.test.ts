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

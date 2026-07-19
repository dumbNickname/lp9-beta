import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// QA static review of the set_recovery_password RPC migration (no live DB
// here -- member-guard enforcement on the preview branch is an owner
// check). We assert the SQL has the security-critical shape:
//   - SECURITY DEFINER with an empty search_path (no schema hijack).
//   - auth.uid() null-check + is_relationship_member(p_rel_id) guard.
//   - UPDATE touches ONLY the four wrap columns on the target row, keyed
//     by id = p_rel_id (no unfiltered / cross-row write).

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(here, "../../supabase/migrations/0004_set_recovery_password.sql");
const sql = readFileSync(sqlPath, "utf8");
const norm = sql.toLowerCase().replace(/\s+/g, " ");

describe("PRD-22 QA: set_recovery_password RPC hardening (static SQL review)", () => {
  it("is SECURITY DEFINER with an empty search_path", () => {
    expect(norm).toContain("security definer");
    expect(norm).toMatch(/set search_path = ''/);
  });

  it("rejects unauthenticated callers (auth.uid() null-check)", () => {
    expect(norm).toContain("auth.uid() is null");
    expect(norm).toMatch(/raise exception 'not authenticated'/);
  });

  it("guards with is_relationship_member(p_rel_id) before writing", () => {
    expect(norm).toContain("not public.is_relationship_member(p_rel_id)");
    expect(norm).toMatch(/raise exception 'not a relationship member'/);
    // Guard must appear BEFORE the UPDATE (fail-closed ordering).
    expect(norm.indexOf("is_relationship_member")).toBeLessThan(
      norm.indexOf("update public.relationships"),
    );
  });

  it("UPDATE targets only the four wrap columns on the row keyed by p_rel_id", () => {
    expect(norm).toContain("update public.relationships");
    expect(norm).toContain("wrapped_key_blob = p_wrapped_blob");
    expect(norm).toContain("wrap_salt = p_salt");
    expect(norm).toContain("wrap_iterations = p_iterations");
    expect(norm).toContain("wrap_algo = p_algo");
    expect(norm).toMatch(/where id = p_rel_id/);
    // No accidental write to membership/status columns.
    expect(norm).not.toMatch(/set[^;]*member_a\s*=/);
    expect(norm).not.toMatch(/set[^;]*member_b\s*=/);
    expect(norm).not.toMatch(/set[^;]*status\s*=/);
  });

  it("has exactly one UPDATE statement (covers first-set and change via re-wrap)", () => {
    const updates = norm.match(/update public\.relationships/g) ?? [];
    expect(updates.length).toBe(1);
  });
});

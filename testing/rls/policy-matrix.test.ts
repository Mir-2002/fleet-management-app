// Spec 05 -- RLS policy matrix. Cross-checks the live DB's actual policies
// against testing/rls/policy-snapshot.json (hand-derived from the migrations
// on 2026-08-28). Catches ACCIDENTAL drift between a migration and what the
// team believes is enforced; a deliberate policy change should update the
// snapshot in the same PR (see spec 05's resolved open question).
//
// Depends on the list_rls_policies() RPC added in
// supabase/migrations/20260828000000_test_policy_introspection.sql.
// NOT executed by the agent that wrote this file; run against a local
// Supabase stack.

import { describe, expect, it } from "vitest";
import { adminClient } from "./_helpers";
import snapshot from "./policy-snapshot.json";

type LivePolicy = {
  schemaname: string;
  tablename: string;
  policyname: string;
  cmd: string;
  roles: string[];
  permissive: string;
};

describe("RLS policy matrix", () => {
  it("matches the checked-in snapshot exactly (no missing, no unexpected policies)", async () => {
    const { data, error } = await adminClient().rpc("list_rls_policies");
    expect(error).toBeNull();
    const live = (data ?? []) as LivePolicy[];

    const liveKeys = new Set(live.map((p) => `${p.tablename}.${p.policyname}`));
    const expectedKeys = new Set(snapshot.policies.map((p) => `${p.table}.${p.policy}`));

    const missing = [...expectedKeys].filter((k) => !liveKeys.has(k));
    const unexpected = [...liveKeys].filter((k) => !expectedKeys.has(k));

    expect(missing, `Expected policies missing from the live DB: ${missing.join(", ")}`).toEqual([]);
    expect(
      unexpected,
      `Policies exist in the live DB but not in testing/rls/policy-snapshot.json -- ` +
        `update the snapshot if this was intentional: ${unexpected.join(", ")}`
    ).toEqual([]);
  });

  it("every expected policy has the right command and applies to `authenticated`", async () => {
    const { data } = await adminClient().rpc("list_rls_policies");
    const live = (data ?? []) as LivePolicy[];
    const byKey = new Map(live.map((p) => [`${p.tablename}.${p.policyname}`, p]));

    for (const expected of snapshot.policies) {
      const key = `${expected.table}.${expected.policy}`;
      const actual = byKey.get(key);
      expect(actual, `${key} not found in live DB`).toBeDefined();
      expect(actual?.cmd, `${key} cmd mismatch`).toBe(expected.cmd);
      expect(actual?.roles, `${key} should apply to 'authenticated'`).toContain("authenticated");
    }
  });
});

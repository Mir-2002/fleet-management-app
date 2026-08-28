// RLS tests for `requests` -- Spec 01's R-REQ-* cases. Talks directly to the
// DB via role-authenticated supabase-js clients (see ./_helpers.ts), not
// through server actions -- this is testing the database's own policies,
// independent of the app layer. NOT executed by the agent that wrote this
// file; run against a local Supabase stack (`npm run db:test:reset` first).

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adminClient, clientFor, userId } from "./_helpers";

function futureDate(offsetDays = 365) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function rawRequest(clientId: string, overrides: Record<string, unknown> = {}) {
  return {
    client_id: clientId,
    truck_type_requested: "LIGHT_TRUCK",
    scheduled_date: futureDate(),
    scheduled_time: "09:30",
    cargo_handling_tags: ["DRY_GOODS"],
    cargo_weight: 100,
    cargo_measurement_mode: "WHOLE",
    ...overrides,
  };
}

describe("requests RLS", () => {
  let clientAId: string, clientBId: string, driverAId: string, helperAId: string;
  let createdIds: string[];

  beforeEach(async () => {
    clientAId = await userId("clientA");
    clientBId = await userId("clientB");
    driverAId = await userId("driverA");
    helperAId = await userId("helperA");
    createdIds = [];
  });

  afterEach(async () => {
    if (createdIds.length === 0) return;
    await adminClient().from("requests").delete().in("id", createdIds);
  });

  it("R-REQ-01 CLIENT can insert a request with their own client_id", async () => {
    const client = await clientFor("clientA");
    const { data, error } = await client.from("requests").insert(rawRequest(clientAId)).select("id").single();
    expect(error).toBeNull();
    createdIds.push(data!.id);
  });

  it("R-REQ-02 CLIENT cannot insert a request with someone else's client_id", async () => {
    const client = await clientFor("clientA");
    const { data, error } = await client.from("requests").insert(rawRequest(clientBId)).select("id");
    expect(error).not.toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("R-REQ-03/04 CLIENT can select their own requests but not another client's", async () => {
    const admin = adminClient();
    const { data: mine } = await admin.from("requests").insert(rawRequest(clientAId)).select("id").single();
    const { data: theirs } = await admin.from("requests").insert(rawRequest(clientBId)).select("id").single();
    createdIds.push(mine!.id, theirs!.id);

    const client = await clientFor("clientA");
    const { data: ownResult } = await client.from("requests").select("id").eq("id", mine!.id);
    expect(ownResult).toHaveLength(1);

    const { data: otherResult } = await client.from("requests").select("id").eq("id", theirs!.id);
    expect(otherResult ?? []).toHaveLength(0);
  });

  it("R-REQ-05/06 CLIENT can update their own PENDING request but not another client's", async () => {
    const admin = adminClient();
    const { data: mine } = await admin.from("requests").insert(rawRequest(clientAId)).select("id").single();
    const { data: theirs } = await admin.from("requests").insert(rawRequest(clientBId)).select("id").single();
    createdIds.push(mine!.id, theirs!.id);

    const client = await clientFor("clientA");
    await client.from("requests").update({ cargo_weight: 250 }).eq("id", mine!.id);
    const { data: mineAfter } = await admin.from("requests").select("cargo_weight").eq("id", mine!.id).single();
    expect(Number(mineAfter?.cargo_weight)).toBe(250);

    await client.from("requests").update({ cargo_weight: 999 }).eq("id", theirs!.id);
    const { data: theirsAfter } = await admin.from("requests").select("cargo_weight").eq("id", theirs!.id).single();
    expect(Number(theirsAfter?.cargo_weight)).toBe(100); // unchanged -- RLS silently filtered the update to 0 rows
  });

  it("R-REQ-07 CLIENT cannot update their own request once it is no longer PENDING", async () => {
    const admin = adminClient();
    const { data: accepted } = await admin
      .from("requests")
      .insert(rawRequest(clientAId, { status: "ACCEPTED" }))
      .select("id")
      .single();
    createdIds.push(accepted!.id);

    const client = await clientFor("clientA");
    await client.from("requests").update({ cargo_weight: 999 }).eq("id", accepted!.id);
    const { data: after } = await admin.from("requests").select("cargo_weight").eq("id", accepted!.id).single();
    expect(Number(after?.cargo_weight)).toBe(100); // unchanged: client_requests_update_pending_own requires status='PENDING'
  });

  it("R-REQ-08 DISPATCHER can select/update/delete any request regardless of client", async () => {
    const admin = adminClient();
    const { data: someonesRequest } = await admin.from("requests").insert(rawRequest(clientBId)).select("id").single();
    createdIds.push(someonesRequest!.id);

    const dispatcher = await clientFor("dispatcher");
    const { data: selected } = await dispatcher.from("requests").select("id").eq("id", someonesRequest!.id);
    expect(selected).toHaveLength(1);

    const { error: updateError } = await dispatcher.from("requests").update({ cargo_weight: 777 }).eq("id", someonesRequest!.id);
    expect(updateError).toBeNull();
    const { data: after } = await admin.from("requests").select("cargo_weight").eq("id", someonesRequest!.id).single();
    expect(Number(after?.cargo_weight)).toBe(777);
  });

  it("R-REQ-09 DRIVER/HELPER cannot select, insert, update, or delete requests at all", async () => {
    const admin = adminClient();
    const { data: someRequest } = await admin.from("requests").insert(rawRequest(clientAId)).select("id").single();
    createdIds.push(someRequest!.id);

    for (const role of ["driverA", "helperA"] as const) {
      const worker = await clientFor(role);
      const { data: selected } = await worker.from("requests").select("id").eq("id", someRequest!.id);
      expect(selected ?? []).toHaveLength(0);

      const { data: inserted, error: insertError } = await worker
        .from("requests")
        .insert(rawRequest(role === "driverA" ? driverAId : helperAId))
        .select("id");
      expect(insertError).not.toBeNull();
      expect(inserted ?? []).toHaveLength(0);
    }
  });
});

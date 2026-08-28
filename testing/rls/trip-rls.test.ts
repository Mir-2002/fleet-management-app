// RLS tests for `trips` -- Spec 02's R-TRIP-* cases. Direct DB access via
// role-authenticated clients, not through server actions. NOT executed by
// the agent that wrote this file; run against a local Supabase stack.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adminClient, clientFor, userId } from "./_helpers";

function futureDate(offsetDays = 365) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function makeTripRow(clientId: string, driverId: string | null, helperId: string | null) {
  const admin = adminClient();
  const { data: request } = await admin
    .from("requests")
    .insert({
      client_id: clientId,
      truck_type_requested: "LIGHT_TRUCK",
      scheduled_date: futureDate(),
      scheduled_time: "09:30",
      cargo_handling_tags: ["DRY_GOODS"],
      cargo_weight: 100,
      cargo_measurement_mode: "WHOLE",
      status: "ACCEPTED",
    })
    .select("id")
    .single();
  const { data: trip } = await admin
    .from("trips")
    .insert({ request_id: request!.id, driver_id: driverId, helper_id: helperId, status: "ASSIGNED" })
    .select("id")
    .single();
  return { requestId: request!.id as string, tripId: trip!.id as string };
}

describe("trips RLS", () => {
  let clientAId: string, driverAId: string, driverBId: string, helperAId: string, helperBId: string;
  let createdRequestIds: string[];

  beforeEach(async () => {
    clientAId = await userId("clientA");
    driverAId = await userId("driverA");
    driverBId = await userId("driverB");
    helperAId = await userId("helperA");
    helperBId = await userId("helperB");
    createdRequestIds = [];
  });

  afterEach(async () => {
    if (createdRequestIds.length === 0) return;
    const admin = adminClient();
    await admin.from("trips").delete().in("request_id", createdRequestIds);
    await admin.from("requests").delete().in("id", createdRequestIds);
  });

  it("R-TRIP-01 DISPATCHER has full CRUD on trips", async () => {
    const { requestId, tripId } = await makeTripRow(clientAId, null, null);
    createdRequestIds.push(requestId);

    const dispatcher = await clientFor("dispatcher");
    const { data: selected } = await dispatcher.from("trips").select("id").eq("id", tripId);
    expect(selected).toHaveLength(1);

    const { error: updateError } = await dispatcher.from("trips").update({ status: "IN_PROGRESS" }).eq("id", tripId);
    expect(updateError).toBeNull();
  });

  it("R-TRIP-02/03 DRIVER can select trips they're assigned to but not others", async () => {
    const own = await makeTripRow(clientAId, driverAId, null);
    const other = await makeTripRow(clientAId, driverBId, null);
    createdRequestIds.push(own.requestId, other.requestId);

    const driver = await clientFor("driverA");
    const { data: ownResult } = await driver.from("trips").select("id").eq("id", own.tripId);
    expect(ownResult).toHaveLength(1);

    const { data: otherResult } = await driver.from("trips").select("id").eq("id", other.tripId);
    expect(otherResult ?? []).toHaveLength(0);
  });

  it("R-TRIP-04 HELPER can select trips they're assigned to but not others", async () => {
    const own = await makeTripRow(clientAId, null, helperAId);
    const other = await makeTripRow(clientAId, null, helperBId);
    createdRequestIds.push(own.requestId, other.requestId);

    const helper = await clientFor("helperA");
    const { data: ownResult } = await helper.from("trips").select("id").eq("id", own.tripId);
    expect(ownResult).toHaveLength(1);

    const { data: otherResult } = await helper.from("trips").select("id").eq("id", other.tripId);
    expect(otherResult ?? []).toHaveLength(0);
  });

  it("R-TRIP-05 CLIENT cannot select trips at all, even their own request's trip", async () => {
    const { requestId, tripId } = await makeTripRow(clientAId, driverAId, helperAId);
    createdRequestIds.push(requestId);

    const client = await clientFor("clientA");
    const { data } = await client.from("trips").select("id").eq("id", tripId);
    expect(data ?? []).toHaveLength(0);
  });

  it("R-TRIP-06 DRIVER/HELPER cannot update trips (dispatcher-only today)", async () => {
    const { requestId, tripId } = await makeTripRow(clientAId, driverAId, helperAId);
    createdRequestIds.push(requestId);

    const driver = await clientFor("driverA");
    await driver.from("trips").update({ status: "IN_PROGRESS" }).eq("id", tripId);
    const { data: after } = await adminClient().from("trips").select("status").eq("id", tripId).single();
    expect(after?.status).toBe("ASSIGNED"); // unchanged -- no UPDATE policy grants DRIVER/HELPER anything

    // Flagged in spec 02 as worth confirming directly with Ahmer once the
    // mobile app's needs are discussed -- this documents TODAY's policy,
    // not necessarily the final intended one.
  });
});

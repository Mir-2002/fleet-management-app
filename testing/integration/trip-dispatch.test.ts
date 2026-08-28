// Integration tests for Spec 02 (trip dispatch & resource assignment).
// Same harness/mocking approach as request-lifecycle.test.ts -- see that
// file's header comment for how `@/lib/supabase/server` is wired to a real
// local-DB client. NOT executed by the agent that wrote this file; run it
// yourself against a running local Supabase stack.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({ role: "dispatcher" as string }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const helpers = await import("../rls/_helpers");
    return helpers.clientFor(mockState.role as any);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { adminClient, userId } from "../rls/_helpers";
import { createRequestAction } from "../../apps/web/src/app/dashboard/requests/actions";
import {
  updateTripStatusAction,
  updateTripAssignmentAction,
  getResourcesForAssignmentAction,
} from "../../apps/web/src/app/dashboard/trips/actions";

const stops = [
  { sequence: 1, stopType: "PICKUP" as const, address: "Manila" },
  { sequence: 2, stopType: "DROPOFF" as const, address: "Quezon City" },
];

function futureDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

async function makeAssignedTrip(clientId: string) {
  const admin = adminClient();
  const result = await createRequestAction(
    {
      clientId,
      cargoHandlingTags: ["DRY_GOODS"],
      cargoWeight: 100,
      cargoMeasurementMode: "WHOLE",
      truckTypeRequested: "LIGHT_TRUCK",
      scheduledDate: futureDate(),
      scheduledTime: "09:30",
      stops,
    },
    true // autoAccept -> creates an ASSIGNED trip in the same call
  );
  expect(result.success).toBe(true);
  const { data: request } = await admin
    .from("requests")
    .select("id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const { data: trip } = await admin.from("trips").select("id").eq("request_id", request!.id).single();
  return { requestId: request!.id as string, tripId: trip!.id as string };
}

describe("trip dispatch & assignment (integration)", () => {
  let clientAId: string, driverAId: string, driverBId: string, helperAId: string, helperBId: string;
  let truckAvail1: string, truckAvail2: string, truckBusy: string;
  let createdRequestIds: string[];

  beforeEach(async () => {
    mockState.role = "dispatcher";
    createdRequestIds = [];
    clientAId = await userId("clientA");
    driverAId = await userId("driverA");
    driverBId = await userId("driverB");
    helperAId = await userId("helperA");
    helperBId = await userId("helperB");

    const admin = adminClient();
    const { data: trucks } = await admin
      .from("trucks")
      .select("id, plate_number")
      .in("plate_number", ["TEST-AVAIL-01", "TEST-AVAIL-02", "TEST-BUSY-01"]);
    truckAvail1 = trucks!.find((t) => t.plate_number === "TEST-AVAIL-01")!.id;
    truckAvail2 = trucks!.find((t) => t.plate_number === "TEST-AVAIL-02")!.id;
    truckBusy = trucks!.find((t) => t.plate_number === "TEST-BUSY-01")!.id;
  });

  afterEach(async () => {
    const admin = adminClient();
    if (createdRequestIds.length > 0) {
      await admin.from("trips").delete().in("request_id", createdRequestIds);
      await admin.from("requests").delete().in("id", createdRequestIds);
    }
    // fixture trucks are shared across tests -- restore seeded availability
    await admin.from("trucks").update({ is_available: true }).in("id", [truckAvail1, truckAvail2]);
    await admin.from("trucks").update({ is_available: false }).eq("id", truckBusy);
  });

  it("I-TRIP-01 rejects IN_PROGRESS without truck/driver/helper assigned", async () => {
    const { requestId, tripId } = await makeAssignedTrip(clientAId);
    createdRequestIds.push(requestId);

    const result = await updateTripStatusAction(tripId, "IN_PROGRESS");
    expect(result).toEqual({
      success: false,
      error: "Assign a truck, driver, and helper before starting this trip.",
    });
  });

  it("I-TRIP-02 IN_PROGRESS with all three assigned dispatches the request", async () => {
    const { requestId, tripId } = await makeAssignedTrip(clientAId);
    createdRequestIds.push(requestId);
    const admin = adminClient();

    const assign = await updateTripAssignmentAction(tripId, {
      truckId: truckAvail1,
      driverId: driverAId,
      helperId: helperAId,
    });
    expect(assign.success).toBe(true);

    const result = await updateTripStatusAction(tripId, "IN_PROGRESS");
    expect(result.success).toBe(true);

    const { data: request } = await admin.from("requests").select("status").eq("id", requestId).single();
    expect(request?.status).toBe("DISPATCHED");
  });

  it("I-TRIP-03 DELIVERED frees the truck but leaves the request status unchanged", async () => {
    const { requestId, tripId } = await makeAssignedTrip(clientAId);
    createdRequestIds.push(requestId);
    const admin = adminClient();

    await updateTripAssignmentAction(tripId, { truckId: truckAvail1, driverId: driverAId, helperId: helperAId });
    await updateTripStatusAction(tripId, "IN_PROGRESS");
    const { data: dispatchedRequest } = await admin.from("requests").select("status").eq("id", requestId).single();

    const result = await updateTripStatusAction(tripId, "DELIVERED");
    expect(result.success).toBe(true);

    const { data: truck } = await admin.from("trucks").select("is_available").eq("id", truckAvail1).single();
    expect(truck?.is_available).toBe(true);

    const { data: requestAfter } = await admin.from("requests").select("status").eq("id", requestId).single();
    expect(requestAfter?.status).toBe(dispatchedRequest?.status); // unchanged, confirmed intentional 2026-08-28
  });

  it("I-TRIP-04 COMPLETED closes out the request", async () => {
    const { requestId, tripId } = await makeAssignedTrip(clientAId);
    createdRequestIds.push(requestId);
    const admin = adminClient();

    await updateTripAssignmentAction(tripId, { truckId: truckAvail1, driverId: driverAId, helperId: helperAId });
    await updateTripStatusAction(tripId, "IN_PROGRESS");
    await updateTripStatusAction(tripId, "DELIVERED");
    const result = await updateTripStatusAction(tripId, "COMPLETED");
    expect(result.success).toBe(true);

    const { data: request } = await admin.from("requests").select("status").eq("id", requestId).single();
    expect(request?.status).toBe("COMPLETED");
  });

  it("I-TRIP-05 rejects moving backwards from COMPLETED", async () => {
    const { requestId, tripId } = await makeAssignedTrip(clientAId);
    createdRequestIds.push(requestId);

    await updateTripAssignmentAction(tripId, { truckId: truckAvail1, driverId: driverAId, helperId: helperAId });
    await updateTripStatusAction(tripId, "IN_PROGRESS");
    await updateTripStatusAction(tripId, "DELIVERED");
    await updateTripStatusAction(tripId, "COMPLETED");

    const result = await updateTripStatusAction(tripId, "IN_PROGRESS");
    expect(result).toEqual({ success: false, error: "Cannot move a trip backwards." });
  });

  it("I-TRIP-06/07 rejects assigning a driver or helper already active on another trip", async () => {
    const tripOne = await makeAssignedTrip(clientAId);
    const tripTwo = await makeAssignedTrip(clientAId);
    createdRequestIds.push(tripOne.requestId, tripTwo.requestId);

    await updateTripAssignmentAction(tripOne.tripId, { truckId: truckAvail1, driverId: driverAId, helperId: helperAId });

    const driverClash = await updateTripAssignmentAction(tripTwo.tripId, {
      truckId: truckAvail2,
      driverId: driverAId,
      helperId: null,
    });
    expect(driverClash).toEqual({ success: false, error: "This driver is already assigned to another active trip." });

    const helperClash = await updateTripAssignmentAction(tripTwo.tripId, {
      truckId: truckAvail2,
      driverId: null,
      helperId: helperAId,
    });
    expect(helperClash).toEqual({ success: false, error: "This helper is already assigned to another active trip." });
  });

  it("I-TRIP-08 documents today's actual behavior: no truck double-booking guard exists", async () => {
    const tripOne = await makeAssignedTrip(clientAId);
    const tripTwo = await makeAssignedTrip(clientAId);
    createdRequestIds.push(tripOne.requestId, tripTwo.requestId);

    await updateTripAssignmentAction(tripOne.tripId, { truckId: truckAvail1, driverId: driverAId, helperId: helperAId });
    // Unlike I-TRIP-06/07, this succeeds today -- flag as a possible second
    // gap alongside the reassignment-lock one (see spec 02 open questions).
    const sameTruck = await updateTripAssignmentAction(tripTwo.tripId, {
      truckId: truckAvail1,
      driverId: driverBId,
      helperId: helperBId,
    });
    expect(sameTruck.success).toBe(true);
  });

  it("I-TRIP-09 reassigning a truck flips old->available, new->unavailable", async () => {
    const { requestId, tripId } = await makeAssignedTrip(clientAId);
    createdRequestIds.push(requestId);
    const admin = adminClient();

    await updateTripAssignmentAction(tripId, { truckId: truckAvail1, driverId: driverAId, helperId: helperAId });
    let { data: t1 } = await admin.from("trucks").select("is_available").eq("id", truckAvail1).single();
    expect(t1?.is_available).toBe(false);

    await updateTripAssignmentAction(tripId, { truckId: truckAvail2, driverId: driverAId, helperId: helperAId });
    const { data: oldTruck } = await admin.from("trucks").select("is_available").eq("id", truckAvail1).single();
    const { data: newTruck } = await admin.from("trucks").select("is_available").eq("id", truckAvail2).single();
    expect(oldTruck?.is_available).toBe(true);
    expect(newTruck?.is_available).toBe(false);
  });

  it.fails(
    "I-TRIP-10 expected gap: reassignment should be locked once IN_PROGRESS+ (bugfix/lock-trip-reassignment)",
    async () => {
      const { requestId, tripId } = await makeAssignedTrip(clientAId);
      createdRequestIds.push(requestId);

      await updateTripAssignmentAction(tripId, { truckId: truckAvail1, driverId: driverAId, helperId: helperAId });
      await updateTripStatusAction(tripId, "IN_PROGRESS");

      const reassignWhileInProgress = await updateTripAssignmentAction(tripId, {
        truckId: truckAvail2,
        driverId: driverBId,
        helperId: helperBId,
      });
      // Confirmed 2026-08-28: this SHOULD be rejected once IN_PROGRESS+.
      // Today's code has no trip-status guard in updateTripAssignmentAction,
      // so this currently succeeds -- making this assertion fail, which is
      // the point of `it.fails`. Flip to a plain `it` once the guard lands.
      expect(reassignWhileInProgress.success).toBe(false);
    }
  );

  it("I-TRIP-11 getResourcesForAssignmentAction flags busy vs free resources relative to OTHER trips", async () => {
    const tripOne = await makeAssignedTrip(clientAId);
    const tripTwo = await makeAssignedTrip(clientAId);
    createdRequestIds.push(tripOne.requestId, tripTwo.requestId);

    await updateTripAssignmentAction(tripOne.tripId, { truckId: truckAvail1, driverId: driverAId, helperId: helperAId });

    // Viewed from tripTwo: driverA/helperA/truckAvail1 are busy (active on
    // tripOne, a DIFFERENT trip); driverB/helperB/truckAvail2 are free.
    const resources = await getResourcesForAssignmentAction(tripTwo.tripId);
    expect(resources.trucks.find((t) => t.id === truckAvail1)?.is_on_trip).toBe(true);
    expect(resources.trucks.find((t) => t.id === truckAvail2)?.is_on_trip).toBe(false);
    expect(resources.drivers.find((d) => d.id === driverAId)?.is_on_trip).toBe(true);
    expect(resources.drivers.find((d) => d.id === driverBId)?.is_on_trip).toBe(false);
    expect(resources.helpers.find((h) => h.id === helperAId)?.is_on_trip).toBe(true);
    expect(resources.helpers.find((h) => h.id === helperBId)?.is_on_trip).toBe(false);

    // Viewed from tripOne itself, its own assignment is excluded (that's the
    // whole point of currentTripId) so driverA does NOT show as busy there.
    const ownResources = await getResourcesForAssignmentAction(tripOne.tripId);
    expect(ownResources.drivers.find((d) => d.id === driverAId)?.is_on_trip).toBe(false);
  });
});

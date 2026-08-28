// Integration tests for Spec 01 (request lifecycle), run against a LOCAL
// Supabase stack (see testing/00-INFRASTRUCTURE.md / testing/rls/_helpers.ts).
// `@/lib/supabase/server`'s createClient is swapped for a real, role-signed-in
// supabase-js client so the server actions' business logic AND the DB's RLS
// policies both run for real -- only the Next.js-only plumbing (cookies(),
// revalidatePath) is stubbed out, since those require a live request context
// this test runner doesn't have.
//
// Requires: `npm run db:test:reset` first, and SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY exported (see testing/rls/_helpers.ts).
// NOT executed by the agent that wrote this file -- no Docker/network access
// in that environment. Run it yourself once the local stack is up.

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
import * as requestActions from "../../apps/web/src/app/dashboard/requests/actions";

const {
  createRequestAction,
  acceptRequestAction,
  updateRequestAction,
  deleteRequestAction,
  getStopsForRequestAction,
} = requestActions;

const stops = [
  { sequence: 1, stopType: "PICKUP" as const, address: "Manila" },
  { sequence: 2, stopType: "DROPOFF" as const, address: "Quezon City" },
];

function futureDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function baseInput(clientId: string) {
  return {
    clientId,
    cargoHandlingTags: ["DRY_GOODS" as const],
    cargoWeight: 100,
    cargoMeasurementMode: "WHOLE" as const,
    truckTypeRequested: "LIGHT_TRUCK",
    scheduledDate: futureDate(),
    scheduledTime: "09:30",
    stops,
  };
}

describe("request lifecycle (integration)", () => {
  let createdRequestIds: string[];
  let clientAId: string;

  beforeEach(async () => {
    mockState.role = "dispatcher";
    createdRequestIds = [];
    clientAId = await userId("clientA");
  });

  afterEach(async () => {
    if (createdRequestIds.length === 0) return;
    const admin = adminClient();
    // trips.request_id has no ON DELETE cascade -- clear trips first.
    await admin.from("trips").delete().in("request_id", createdRequestIds);
    await admin.from("requests").delete().in("id", createdRequestIds);
  });

  it("I-REQ-01 creates a PENDING request with stops in sequence order", async () => {
    const result = await createRequestAction(baseInput(clientAId), false);
    expect(result.success).toBe(true);

    const admin = adminClient();
    const { data: request } = await admin
      .from("requests")
      .select("id, status, client_id")
      .eq("client_id", clientAId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(request?.status).toBe("PENDING");
    createdRequestIds.push(request!.id);

    const { data: stopRows } = await admin
      .from("stops")
      .select("sequence, address")
      .eq("request_id", request!.id)
      .order("sequence");
    expect(stopRows?.map((s) => s.address)).toEqual(["Manila", "Quezon City"]);
  });

  it("I-REQ-02 autoAccept creates an ACCEPTED request with exactly one ASSIGNED trip", async () => {
    const result = await createRequestAction(baseInput(clientAId), true);
    expect(result.success).toBe(true);

    const admin = adminClient();
    const { data: request } = await admin
      .from("requests")
      .select("id, status")
      .eq("client_id", clientAId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(request?.status).toBe("ACCEPTED");
    createdRequestIds.push(request!.id);

    const { data: trips } = await admin.from("trips").select("id, status").eq("request_id", request!.id);
    expect(trips).toHaveLength(1);
    expect(trips?.[0]?.status).toBe("ASSIGNED");
  });

  it("I-REQ-03 rejects a scheduledDate in the past and inserts nothing", async () => {
    const admin = adminClient();
    const before = await admin.from("requests").select("id", { count: "exact", head: true }).eq("client_id", clientAId);

    const result = await createRequestAction(
      { ...baseInput(clientAId), scheduledDate: "2020-01-01" },
      false
    );
    expect(result.success).toBe(false);

    const after = await admin.from("requests").select("id", { count: "exact", head: true }).eq("client_id", clientAId);
    expect(after.count).toBe(before.count ?? 0);
  });

  it("I-REQ-04 acceptRequestAction moves PENDING to ACCEPTED and creates one ASSIGNED trip", async () => {
    const created = await createRequestAction(baseInput(clientAId), false);
    expect(created.success).toBe(true);
    const admin = adminClient();
    const { data: pending } = await admin
      .from("requests")
      .select("id")
      .eq("client_id", clientAId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    createdRequestIds.push(pending!.id);

    const result = await acceptRequestAction(pending!.id);
    expect(result.success).toBe(true);

    const { data: request } = await admin.from("requests").select("status").eq("id", pending!.id).single();
    expect(request?.status).toBe("ACCEPTED");

    const { data: trips } = await admin.from("trips").select("status").eq("request_id", pending!.id);
    expect(trips).toHaveLength(1);
    expect(trips?.[0]?.status).toBe("ASSIGNED");
  });

  it("I-REQ-05 documents today's actual behavior: acceptRequestAction has no PENDING guard", async () => {
    // The action code itself has no `if (status !== 'PENDING') return error`
    // check (unlike updateRequestAction/deleteRequestAction) -- it will
    // happily re-run the requests.status UPDATE on an already-ACCEPTED
    // request. What actually stops a double-accept is a DB constraint one
    // layer down: trips.request_id is UNIQUE, so the second INSERT into
    // trips fails and acceptRequestAction surfaces that as `success:false`.
    // Net effect today is "safe by accident, not by design" -- flag to
    // Ahmer whether an explicit PENDING guard should be added anyway, since
    // relying on a unique-constraint error message as the real guard is
    // fragile (e.g. it would silently break if trips.request_id ever stopped
    // being unique for a legitimate reason, like allowing re-dispatch).
    const created = await createRequestAction(baseInput(clientAId), false);
    expect(created.success).toBe(true);
    const admin = adminClient();
    const { data: pending } = await admin
      .from("requests")
      .select("id")
      .eq("client_id", clientAId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    createdRequestIds.push(pending!.id);

    const firstAccept = await acceptRequestAction(pending!.id);
    expect(firstAccept.success).toBe(true);

    const secondAccept = await acceptRequestAction(pending!.id);
    expect(secondAccept.success).toBe(false);

    const { data: trips } = await admin.from("trips").select("id").eq("request_id", pending!.id);
    expect(trips).toHaveLength(1);
  });

  it("I-REQ-06/07 updateRequestAction only succeeds while PENDING", async () => {
    const created = await createRequestAction(baseInput(clientAId), false);
    expect(created.success).toBe(true);
    const admin = adminClient();
    const { data: pending } = await admin
      .from("requests")
      .select("id")
      .eq("client_id", clientAId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    createdRequestIds.push(pending!.id);

    const editWhilePending = await updateRequestAction(pending!.id, {
      cargoHandlingTags: ["FRAGILE"],
      cargoWeight: 200,
      cargoMeasurementMode: "WHOLE",
      truckTypeRequested: "HEAVY_TRUCK",
      scheduledDate: futureDate(),
      scheduledTime: "10:00",
    });
    expect(editWhilePending.success).toBe(true);
    const { data: updated } = await admin.from("requests").select("cargo_weight").eq("id", pending!.id).single();
    expect(Number(updated?.cargo_weight)).toBe(200);

    await acceptRequestAction(pending!.id);
    const editAfterAccept = await updateRequestAction(pending!.id, {
      cargoHandlingTags: ["FRAGILE"],
      cargoWeight: 300,
      cargoMeasurementMode: "WHOLE",
      truckTypeRequested: "HEAVY_TRUCK",
      scheduledDate: futureDate(),
      scheduledTime: "10:00",
    });
    expect(editAfterAccept).toEqual({ success: false, error: "Only pending requests can be edited." });
  });

  it("I-REQ-08 deleteRequestAction only succeeds while PENDING", async () => {
    const created = await createRequestAction(baseInput(clientAId), false);
    expect(created.success).toBe(true);
    const admin = adminClient();
    const { data: pending } = await admin
      .from("requests")
      .select("id")
      .eq("client_id", clientAId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    await acceptRequestAction(pending!.id);
    const deleteAfterAccept = await deleteRequestAction(pending!.id);
    expect(deleteAfterAccept).toEqual({ success: false, error: "Only pending requests can be deleted." });

    // clean up manually since this row survives the failed delete
    await admin.from("trips").delete().eq("request_id", pending!.id);
    const deleteResult = await deleteRequestAction(pending!.id);
    expect(deleteResult.success).toBe(true);
  });

  it("I-REQ-09 getStopsForRequestAction returns stops ordered by sequence", async () => {
    const created = await createRequestAction(
      {
        ...baseInput(clientAId),
        stops: [
          { sequence: 1, stopType: "PICKUP", address: "Origin" },
          { sequence: 2, stopType: "DROPOFF", address: "Middle" },
          { sequence: 3, stopType: "DROPOFF", address: "Final" },
        ],
      },
      false
    );
    expect(created.success).toBe(true);
    const admin = adminClient();
    const { data: pending } = await admin
      .from("requests")
      .select("id")
      .eq("client_id", clientAId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    createdRequestIds.push(pending!.id);

    const result = await getStopsForRequestAction(pending!.id);
    expect(result.map((s) => s.address)).toEqual(["Origin", "Middle", "Final"]);
  });

  it("I-REQ-10 documents the gap: no action can transition a request to CANCELLED", () => {
    // See testing/specs/01-request-lifecycle.spec.md "Known gap". If this
    // starts failing because someone added cancelRequestAction, update the
    // spec (and write real tests for it) rather than deleting this check.
    expect((requestActions as Record<string, unknown>).cancelRequestAction).toBeUndefined();
  });
});

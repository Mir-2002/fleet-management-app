import { describe, expect, it } from "vitest";
import { CreateRequestSchema, UpdateRequestSchema } from "@fleetman/shared";

const clientId = "11111111-1111-4111-8111-111111111111";
const stops = [
  { sequence: 1, stopType: "PICKUP" as const, address: "Manila" },
  { sequence: 2, stopType: "DROPOFF" as const, address: "Quezon City" },
];

const validCreate = {
  clientId,
  cargoHandlingTags: ["DRY_GOODS" as const],
  cargoWeight: 100,
  cargoMeasurementMode: "WHOLE" as const,
  truckTypeRequested: "LIGHT_TRUCK",
  scheduledDate: "2099-08-28",
  scheduledTime: "09:30",
  stops,
};

const validUpdate = {
  cargoHandlingTags: ["DRY_GOODS" as const],
  cargoWeight: 100,
  cargoMeasurementMode: "WHOLE" as const,
  truckTypeRequested: "LIGHT_TRUCK",
  scheduledDate: "2099-08-28",
  scheduledTime: "09:30",
};

describe("request schemas", () => {
  it("U-REQ-01 rejects zero handling tags", () => {
    expect(CreateRequestSchema.safeParse({ ...validCreate, cargoHandlingTags: [] }).success).toBe(false);
  });

  it.each([0, -1])("U-REQ-02 rejects cargoWeight %s", (cargoWeight) => {
    expect(CreateRequestSchema.safeParse({ ...validCreate, cargoWeight }).success).toBe(false);
  });

  it.each([
    { cargoLength: 1 },
    { cargoLength: 1, cargoWidth: 2 },
  ])("U-REQ-03 rejects partial dimensions", (dimensions) => {
    const result = CreateRequestSchema.safeParse({ ...validCreate, ...dimensions });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["cargoLength"]);
  });

  it("U-REQ-04 accepts all dimensions", () => {
    expect(CreateRequestSchema.safeParse({
      ...validCreate,
      cargoLength: 1,
      cargoWidth: 2,
      cargoHeight: 3,
    }).success).toBe(true);
  });

  it("U-REQ-05 accepts no dimensions", () => {
    expect(CreateRequestSchema.safeParse(validCreate).success).toBe(true);
  });

  it("U-REQ-06 rejects fewer than two stops", () => {
    expect(CreateRequestSchema.safeParse({ ...validCreate, stops: stops.slice(0, 1) }).success).toBe(false);
  });

  it.each(["9:30", "09:30:00", "noon"])("U-REQ-07 rejects malformed time %s", (scheduledTime) => {
    expect(CreateRequestSchema.safeParse({ ...validCreate, scheduledTime }).success).toBe(false);
  });

  it("U-REQ-08 mirrors dimension and time rules for updates", () => {
    expect(UpdateRequestSchema.safeParse({ ...validUpdate, cargoLength: 1 }).success).toBe(false);
    expect(UpdateRequestSchema.safeParse({ ...validUpdate, scheduledTime: "9:30" }).success).toBe(false);
  });

  it.fails("U-REQ-08 expected gap: update validation does not currently validate stops", () => {
    expect(UpdateRequestSchema.safeParse({ ...validUpdate, stops: stops.slice(0, 1) }).success).toBe(false);
  });
});

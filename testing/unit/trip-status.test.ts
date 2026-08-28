import { describe, expect, it } from "vitest";
import { canTransitionTripStatus, type TripStatus } from "@fleetman/shared";

const forwardStatuses: TripStatus[] = ["ASSIGNED", "IN_PROGRESS", "DELIVERED", "COMPLETED"];

describe("trip status ordering", () => {
  it("U-TRIP-01 rejects every backward transition", () => {
    for (let currentIndex = 1; currentIndex < forwardStatuses.length; currentIndex += 1) {
      for (let targetIndex = 0; targetIndex < currentIndex; targetIndex += 1) {
        expect(canTransitionTripStatus(forwardStatuses[currentIndex], forwardStatuses[targetIndex])).toBe(false);
      }
    }
  });

  it("U-TRIP-02 allows same-status and forward transitions", () => {
    for (let currentIndex = 0; currentIndex < forwardStatuses.length; currentIndex += 1) {
      for (let targetIndex = currentIndex; targetIndex < forwardStatuses.length; targetIndex += 1) {
        expect(canTransitionTripStatus(forwardStatuses[currentIndex], forwardStatuses[targetIndex])).toBe(true);
      }
    }
  });

  it.each(forwardStatuses)("U-TRIP-03 documents cancellation is rejected from %s", (current) => {
    expect(canTransitionTripStatus(current, "CANCELLED")).toBe(false);
  });
});

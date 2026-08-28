import { z } from "zod";

export const TripStatusSchema = z.enum([
  "ASSIGNED",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]);

const TRIP_STATUS_ORDER: Partial<Record<TripStatus, number>> = {
  ASSIGNED: 0,
  IN_PROGRESS: 1,
  DELIVERED: 2,
  COMPLETED: 3,
};

export function canTransitionTripStatus(current: TripStatus, target: TripStatus) {
  return (TRIP_STATUS_ORDER[target] ?? -1) >= (TRIP_STATUS_ORDER[current] ?? -1);
}

export const CreateTripSchema = z.object({
  requestId: z.string().uuid(),
  truckId: z.string().uuid().nullable().optional(),
  driverId: z.string().uuid().nullable().optional(),
  helperId: z.string().uuid().nullable().optional(),
  dispatcherId: z.string().uuid().nullable().optional(),
});

export const TripSchema = CreateTripSchema.extend({
  id: z.string().uuid(),
  status: TripStatusSchema,
  dispatchedAt: z.string().datetime({ offset: true }).optional(),
  startedAt: z.string().datetime({ offset: true }).optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
});

export type TripStatus = z.infer<typeof TripStatusSchema>;
export type CreateTripInput = z.infer<typeof CreateTripSchema>;
export type TripOutput = z.infer<typeof TripSchema>;

import { z } from "zod";

export const TripStatusSchema = z.enum([
  "ASSIGNED",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]);

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

import { z } from "zod";

export const StopTypeSchema = z.enum(['PICKUP', 'DROPOFF'])

export const CreateStopSchema = z.object({
  sequence: z.number().int().min(1),
  stopType: StopTypeSchema,
  address: z.string().min(1, "Address is required"),
  contactName: z.string().optional(),
  contactPhone: z.string().refine(
    (v) => !v || v.length >= 7,
    'Phone must be at least 7 digits'
  ).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  arrivalTime: z.string().datetime({ offset: true }).optional(),
  departureTime: z.string().datetime({ offset: true }).optional(),
});

export const StopSchema = CreateStopSchema.extend({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }).optional(),
});

export type StopType = z.infer<typeof StopTypeSchema>;
export type CreateStopInput = z.infer<typeof CreateStopSchema>;
export type StopOutput = z.infer<typeof StopSchema>;

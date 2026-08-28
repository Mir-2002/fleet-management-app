import { z } from "zod";
import { CreateStopSchema } from "./stop.schema";

export const RequestStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "DISPATCHED",
  "COMPLETED",
  "CANCELLED",
]);

export const CargoHandlingTagSchema = z.enum([
  'DRY_GOODS',
  'FROZEN',
  'FRAGILE',
  'PERISHABLE',
  'HAZMAT',
])

export const CargoMeasurementModeSchema = z.enum(['PER_ITEM', 'WHOLE'])

function allOrNoDimensions(data: {
  cargoLength?: number | null
  cargoWidth?: number | null
  cargoHeight?: number | null
}) {
  const dims = [data.cargoLength, data.cargoWidth, data.cargoHeight]
  const provided = dims.filter((d) => d !== undefined && d !== null)
  return provided.length === 0 || provided.length === 3
}

export const CreateRequestSchema = z.object({
  clientId: z.string().uuid(),
  cargoHandlingTags: z.array(CargoHandlingTagSchema).min(1, 'Select at least one handling type'),
  cargoWeight: z.number({ invalid_type_error: 'Weight is required' }).positive('Weight must be greater than 0'),
  cargoLength: z.number().positive().optional().nullable(),
  cargoWidth: z.number().positive().optional().nullable(),
  cargoHeight: z.number().positive().optional().nullable(),
  cargoMeasurementMode: CargoMeasurementModeSchema,
  truckTypeRequested: z.string().min(1, "Truck type is required"),
  scheduledDate: z.string().date(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  stops: z.array(CreateStopSchema).min(2, "At least an origin and destination are required"),
  notes: z.string().optional(),
}).refine(allOrNoDimensions, {
  message: "Provide all three dimensions (L, W, H) or leave all empty.",
  path: ['cargoLength'],
})

export const RequestSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  cargoHandlingTags: z.array(CargoHandlingTagSchema),
  cargoWeight: z.number(),
  cargoLength: z.number().nullable().optional(),
  cargoWidth: z.number().nullable().optional(),
  cargoHeight: z.number().nullable().optional(),
  cargoMeasurementMode: CargoMeasurementModeSchema,
  truckTypeRequested: z.string(),
  scheduledDate: z.string(),
  scheduledTime: z.string(),
  status: RequestStatusSchema,
  createdAt: z.string().datetime({ offset: true }).optional(),
});

export const UpdateRequestSchema = z.object({
  cargoHandlingTags: z.array(CargoHandlingTagSchema).min(1, 'Select at least one handling type'),
  cargoWeight: z.number({ invalid_type_error: 'Weight is required' }).positive('Weight must be greater than 0'),
  cargoLength: z.number().positive().optional().nullable(),
  cargoWidth: z.number().positive().optional().nullable(),
  cargoHeight: z.number().positive().optional().nullable(),
  cargoMeasurementMode: CargoMeasurementModeSchema,
  truckTypeRequested: z.string().min(1, "Truck type is required"),
  scheduledDate: z.string().date(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  notes: z.string().optional(),
}).refine(allOrNoDimensions, {
  message: "Provide all three dimensions (L, W, H) or leave all empty.",
  path: ['cargoLength'],
})

export type RequestStatus = z.infer<typeof RequestStatusSchema>;
export type CargoHandlingTag = z.infer<typeof CargoHandlingTagSchema>;
export type CargoMeasurementMode = z.infer<typeof CargoMeasurementModeSchema>;
export type CreateRequestInput = z.infer<typeof CreateRequestSchema>;
export type UpdateRequestInput = z.infer<typeof UpdateRequestSchema>;
export type RequestOutput = z.infer<typeof RequestSchema>;

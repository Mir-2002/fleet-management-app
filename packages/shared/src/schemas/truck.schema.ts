import { z } from "zod";

export const CreateTruckSchema = z.object({
  plateNumber: z.string().min(1, "Plate number is required"),
  truckType: z.string().min(1, "Truck type is required"),
  trucking: z.string().optional(),
});

export const TruckSchema = CreateTruckSchema.extend({
  id: z.string().uuid(),
  isAvailable: z.boolean().default(true),
  createdAt: z.string().datetime({ offset: true }).optional(),
});

export type CreateTruckInput = z.infer<typeof CreateTruckSchema>;
export type TruckOutput = z.infer<typeof TruckSchema>;

export const UpdateTruckSchema = z.object({
  truckType: z.string().min(1, "Truck type is required"),
  isAvailable: z.boolean(),
  trucking: z.string().optional(),
});

export type UpdateTruckInput = z.infer<typeof UpdateTruckSchema>;

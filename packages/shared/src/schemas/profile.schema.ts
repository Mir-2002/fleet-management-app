import { z } from "zod";

export const UserRoleSchema = z.enum(["CLIENT", "DRIVER", "HELPER", "DISPATCHER"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

const BaseProfileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1),
  role: UserRoleSchema,
  createdAt: z.string().datetime({ offset: true }).optional(),
});

export const ClientProfileSchema = BaseProfileSchema.extend({
  role: z.literal("CLIENT"),
  contactInfo: z.string().min(1),
  licenseNumber: z.string().optional(),
});

export const DriverProfileSchema = BaseProfileSchema.extend({
  role: z.literal("DRIVER"),
  licenseNumber: z.string().min(1),
  contactInfo: z.string().optional(),
});

export const HelperProfileSchema = BaseProfileSchema.extend({
  role: z.literal("HELPER"),
  contactInfo: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export const DispatcherProfileSchema = BaseProfileSchema.extend({
  role: z.literal("DISPATCHER"),
  contactInfo: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export const ProfileSchema = z.discriminatedUnion("role", [
  ClientProfileSchema,
  DriverProfileSchema,
  HelperProfileSchema,
  DispatcherProfileSchema,
]);

const AuthFields = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const phoneSchema = z
  .string()
  .min(1, "Contact number is required")
  .refine(
    (v) => v.replace(/\D/g, "").length === 11,
    "Must be a valid 11-digit number"
  );

const licenseSchema = z
  .string()
  .min(1, "License number is required")
  .regex(
    /^[A-Z]\d{2}-\d{2}-\d{6}$/,
    "License must be in format A00-00-000000 (e.g. D04-18-123456)"
  );

// Create schemas — for form validation, enforce role-specific required fields
export const CreateClientSchema = AuthFields.extend({
  fullName: z.string().min(1, "Name is required"),
  contactInfo: phoneSchema,
});

export const CreateDriverSchema = AuthFields.extend({
  fullName: z.string().min(1, "Name is required"),
  contactInfo: phoneSchema,
  licenseNumber: licenseSchema,
});

export const CreateHelperSchema = AuthFields.extend({
  fullName: z.string().min(1, "Name is required"),
  contactInfo: phoneSchema,
});

export const CreateDispatcherSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
});

export type ClientProfile = z.infer<typeof ClientProfileSchema>;
export type DriverProfile = z.infer<typeof DriverProfileSchema>;
export type HelperProfile = z.infer<typeof HelperProfileSchema>;
export type DispatcherProfile = z.infer<typeof DispatcherProfileSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type CreateDriverInput = z.infer<typeof CreateDriverSchema>;
export type CreateHelperInput = z.infer<typeof CreateHelperSchema>;
export type CreateDispatcherInput = z.infer<typeof CreateDispatcherSchema>;

export const UpdateClientSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  contactInfo: phoneSchema,
});

export const UpdateDriverSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  contactInfo: phoneSchema,
});

export const UpdateHelperSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  contactInfo: phoneSchema,
});

export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type UpdateDriverInput = z.infer<typeof UpdateDriverSchema>;
export type UpdateHelperInput = z.infer<typeof UpdateHelperSchema>;

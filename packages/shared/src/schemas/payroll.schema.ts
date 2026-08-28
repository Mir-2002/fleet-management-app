import { z } from "zod";
import { PaymentMethodSchema } from "./invoice.schema";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const PayrollStatusSchema = z.enum([
  "DRAFT",
  "FINALIZED",
  "PAID",
]);

export const PayrollRoleSchema = z.enum([
  "DRIVER",
  "HELPER",
]);

export function calculateNetPay(input: {
  basePay: number;
  tripBonus: number;
  overtimePay: number;
  deductions: number;
}) {
  return input.basePay + input.tripBonus + input.overtimePay - input.deductions;
}

// PaymentMethodSchema is defined in invoice.schema and re-exported from the
// shared index. Import it from there; it is not re-exported here to avoid
// duplicate-export errors in the barrel.

// ---------------------------------------------------------------------------
// Payroll Line Item
// (one row per trip included in the payroll record)
// ---------------------------------------------------------------------------

export const CreatePayrollLineItemSchema = z.object({
  tripId: z.string().uuid(),
  rolePlayed: PayrollRoleSchema,
  baseAmount: z.number().min(0, "Base amount cannot be negative"),
  bonusAmount: z.number().min(0, "Bonus amount cannot be negative").default(0),
});

export const PayrollLineItemSchema = CreatePayrollLineItemSchema.extend({
  id: z.string().uuid(),
  payrollRecordId: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }).optional(),
});

export const UpdatePayrollLineItemSchema = z.object({
  baseAmount: z.number().min(0).optional(),
  bonusAmount: z.number().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Payroll Record
// (one record per employee per pay period)
// ---------------------------------------------------------------------------

export const CreatePayrollRecordSchema = z.object({
  payrollPeriodId: z.string().uuid(),
  profileId: z.string().uuid(),
  basePay: z.number().min(0, "Base pay cannot be negative"),
  overtimePay: z.number().min(0, "Overtime pay cannot be negative").default(0),
  deductions: z.number().min(0, "Deductions cannot be negative").default(0),
  // tripBonus and netPay are computed by DB triggers; not supplied on create.
});

export const PayrollRecordSchema = z.object({
  id: z.string().uuid(),
  payrollPeriodId: z.string().uuid(),
  profileId: z.string().uuid(),
  basePay: z.number(),
  tripBonus: z.number(),   // maintained by rollup_trip_bonus trigger
  overtimePay: z.number(),
  deductions: z.number(),
  netPay: z.number(),      // maintained by calculate_net_pay trigger
  paymentMethod: PaymentMethodSchema.nullable().optional(),
  paymentDate: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

export const UpdatePayrollRecordSchema = z.object({
  basePay: z.number().min(0).optional(),
  overtimePay: z.number().min(0).optional(),
  deductions: z.number().min(0).optional(),
  paymentMethod: PaymentMethodSchema.nullable().optional(),
  paymentDate: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Payroll Period
// ---------------------------------------------------------------------------

export const CreatePayrollPeriodSchema = z.object({
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  // preparedBy is set server-side from auth.uid() (must be DISPATCHER).
}).refine(
  (data) => data.periodEnd > data.periodStart,
  { message: "Period end must be after period start", path: ["periodEnd"] }
);

export const PayrollPeriodSchema = z.object({
  id: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  status: PayrollStatusSchema,
  preparedBy: z.string().uuid(),
  approvedBy: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

export const UpdatePayrollPeriodSchema = z.object({
  status: PayrollStatusSchema.optional(),
  approvedBy: z.string().uuid().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PayrollStatus = z.infer<typeof PayrollStatusSchema>;
export type PayrollRole = z.infer<typeof PayrollRoleSchema>;

export type CreatePayrollPeriodInput = z.infer<typeof CreatePayrollPeriodSchema>;
export type UpdatePayrollPeriodInput = z.infer<typeof UpdatePayrollPeriodSchema>;
export type PayrollPeriodOutput = z.infer<typeof PayrollPeriodSchema>;

export type CreatePayrollRecordInput = z.infer<typeof CreatePayrollRecordSchema>;
export type UpdatePayrollRecordInput = z.infer<typeof UpdatePayrollRecordSchema>;
export type PayrollRecordOutput = z.infer<typeof PayrollRecordSchema>;

export type CreatePayrollLineItemInput = z.infer<typeof CreatePayrollLineItemSchema>;
export type UpdatePayrollLineItemInput = z.infer<typeof UpdatePayrollLineItemSchema>;
export type PayrollLineItemOutput = z.infer<typeof PayrollLineItemSchema>;

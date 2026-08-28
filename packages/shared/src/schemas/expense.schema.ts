import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const ExpenseCategorySchema = z.enum([
  "FUEL",
  "TOLL",
  "MAINTENANCE",
  "LOADING_UNLOADING",
  "ACCOMMODATION",
  "MISCELLANEOUS",
]);

export const ExpenseStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

// ---------------------------------------------------------------------------
// Expense
// ---------------------------------------------------------------------------

// Used when a dispatcher files a general overhead expense (tripId may be null).
export const CreateExpenseSchema = z.object({
  category: ExpenseCategorySchema,
  tripId: z.string().uuid().nullable().optional(),
  truckId: z.string().uuid().nullable().optional(),
  amount: z.number().positive("Amount must be greater than 0"),
  expenseDate: z.string().date(),
  description: z.string().optional(),
  receiptUrl: z.string().url("Must be a valid URL").optional().nullable(),
  // submittedBy is set server-side from auth.uid() for drivers/helpers.
  // For dispatcher-created expenses it may differ; enforced at API layer.
});

// Used when a driver or helper submits an expense — trip_id is required
// (matches the RLS INSERT policy: trip_id IS NOT NULL for field workers).
export const CreateFieldExpenseSchema = CreateExpenseSchema.extend({
  tripId: z.string().uuid("Trip ID is required for field expenses"),
});

export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  category: ExpenseCategorySchema,
  tripId: z.string().uuid().nullable().optional(),
  truckId: z.string().uuid().nullable().optional(),
  amount: z.number(),
  expenseDate: z.string(),
  description: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
  submittedBy: z.string().uuid(),
  approvedBy: z.string().uuid().nullable().optional(),
  status: ExpenseStatusSchema,
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

// Dispatchers update status (approve/reject) and may add approvedBy.
export const UpdateExpenseSchema = z.object({
  status: ExpenseStatusSchema.optional(),
  approvedBy: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  receiptUrl: z.string().url().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;
export type ExpenseStatus = z.infer<typeof ExpenseStatusSchema>;

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type CreateFieldExpenseInput = z.infer<typeof CreateFieldExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
export type ExpenseOutput = z.infer<typeof ExpenseSchema>;

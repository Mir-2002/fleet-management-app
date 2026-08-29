import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const InvoiceStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "VOID",
]);

export const PaymentMethodSchema = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "GCASH",
  "MAYA",
]);

// ---------------------------------------------------------------------------
// Invoice Line Item
// ---------------------------------------------------------------------------

export const CreateInvoiceLineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  sortOrder: z.number().int().default(0),
  tripId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const InvoiceLineItemSchema = CreateInvoiceLineItemSchema.extend({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  // subtotal is a GENERATED column (quantity * unitPrice); read-only from DB.
  subtotal: z.number(),
  tripId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
});

export const UpdateInvoiceLineItemSchema = z.object({
  description: z.string().min(1, "Description is required").optional(),
  quantity: z.number().positive("Quantity must be greater than 0").optional(),
  unitPrice: z.number().min(0, "Unit price cannot be negative").optional(),
  sortOrder: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export const CreateInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  requestId: z.string().uuid().nullable().optional(),
  tripId: z.string().uuid().nullable().optional(),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  // createdBy is set server-side from the authenticated dispatcher's profile id.
  // Line items are created separately via invoice_line_items endpoints.
}).refine(
  (data) => data.dueDate >= data.issueDate,
  { message: "Due date must be on or after issue date", path: ["dueDate"] }
);

export const CreateInvoiceFormSchema = z.object({
  clientId: z.string().uuid(),
  requestId: z.string().uuid().optional().or(z.literal("")),
  tripId: z.string().uuid().optional().or(z.literal("")),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  lineItems: z.array(CreateInvoiceLineItemSchema).min(1, "At least one line item is required"),
}).refine(
  (data) => data.dueDate >= data.issueDate,
  { message: "Due date must be on or after issue date", path: ["dueDate"] }
);

export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  clientId: z.string().uuid(),
  requestId: z.string().uuid().nullable().optional(),
  tripId: z.string().uuid().nullable().optional(),
  issueDate: z.string(),
  dueDate: z.string(),
  status: InvoiceStatusSchema,
  subtotal: z.number(),
  discountAmount: z.number(),
  taxAmount: z.number(),
  grandTotal: z.number(),
  amountPaid: z.number(),
  // balanceDue is a GENERATED column; always equals grandTotal - amountPaid.
  balanceDue: z.number(),
  paymentMethod: PaymentMethodSchema.nullable().optional(),
  paymentDate: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

export const UpdateInvoiceSchema = z.object({
  dueDate: z.string().date().optional(),
  status: InvoiceStatusSchema.optional(),
  discountAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  amountPaid: z.number().min(0).optional(),
  paymentMethod: PaymentMethodSchema.nullable().optional(),
  paymentDate: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type CreateInvoiceFormInput = z.infer<typeof CreateInvoiceFormSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type InvoiceOutput = z.infer<typeof InvoiceSchema>;

export type CreateInvoiceLineItemInput = z.infer<typeof CreateInvoiceLineItemSchema>;
export type UpdateInvoiceLineItemInput = z.infer<typeof UpdateInvoiceLineItemSchema>;
export type InvoiceLineItemOutput = z.infer<typeof InvoiceLineItemSchema>;

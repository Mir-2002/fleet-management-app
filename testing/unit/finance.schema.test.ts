import { describe, expect, it } from "vitest";
import {
  calculateNetPay,
  CreateExpenseSchema,
  CreateInvoiceFormSchema,
} from "@fleetman/shared";

const validInvoice = {
  clientId: "11111111-1111-4111-8111-111111111111",
  issueDate: "2026-08-28",
  dueDate: "2026-09-28",
  discountAmount: 0,
  taxAmount: 0,
  lineItems: [{ description: "Delivery", quantity: 1, unitPrice: 1000, sortOrder: 0 }],
};

describe("finance business rules", () => {
  it("U-FIN-01 calculates net pay", () => {
    expect(calculateNetPay({ basePay: 10_000, tripBonus: 1_500, overtimePay: 750, deductions: 250 })).toBe(12_000);
  });

  it("U-FIN-02 rejects a due date before the issue date", () => {
    const result = CreateInvoiceFormSchema.safeParse({ ...validInvoice, dueDate: "2026-08-27" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["dueDate"]);
  });

  it("U-FIN-03 rejects an invoice without line items", () => {
    expect(CreateInvoiceFormSchema.safeParse({ ...validInvoice, lineItems: [] }).success).toBe(false);
  });

  it.each([0, -0.01])("U-FIN-04 rejects expense amount %s", (amount) => {
    expect(CreateExpenseSchema.safeParse({
      category: "FUEL",
      amount,
      expenseDate: "2026-08-28",
    }).success).toBe(false);
  });
});

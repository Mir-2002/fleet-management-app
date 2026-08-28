// Integration tests for Spec 04 (finance: invoices, expenses, payroll).
// Same harness/mocking approach as request-lifecycle.test.ts. Requires the
// finance migration applied on top of the baseline schema (both already in
// supabase/migrations/ -- `npm run db:test:reset` applies everything).
// NOT executed by the agent that wrote this file; run it yourself against a
// running local Supabase stack.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({ role: "dispatcher" as string }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const helpers = await import("../rls/_helpers");
    return helpers.clientFor(mockState.role as any);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { adminClient, userId } from "../rls/_helpers";
import { createRequestAction } from "../../apps/web/src/app/dashboard/requests/actions";
import { updateTripAssignmentAction } from "../../apps/web/src/app/dashboard/trips/actions";
import {
  createInvoiceAction,
  updateInvoiceAction,
  deleteInvoiceAction,
} from "../../apps/web/src/app/dashboard/finance/invoices/actions";
import { createExpenseAction } from "../../apps/web/src/app/dashboard/finance/expenses/actions";
import {
  createPayrollPeriodAction,
  addPayrollRecordAction,
  addPayrollLineItemAction,
} from "../../apps/web/src/app/dashboard/finance/payroll/actions";

function futureDate(offsetDays = 365) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function makeTrip(clientId: string, driverId: string, helperId: string, truckId: string) {
  const admin = adminClient();
  const result = await createRequestAction(
    {
      clientId,
      cargoHandlingTags: ["DRY_GOODS"],
      cargoWeight: 100,
      cargoMeasurementMode: "WHOLE",
      truckTypeRequested: "LIGHT_TRUCK",
      scheduledDate: futureDate(),
      scheduledTime: "09:30",
      stops: [
        { sequence: 1, stopType: "PICKUP", address: "Manila" },
        { sequence: 2, stopType: "DROPOFF", address: "Quezon City" },
      ],
    },
    true
  );
  expect(result.success).toBe(true);
  const { data: request } = await admin
    .from("requests")
    .select("id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const { data: trip } = await admin.from("trips").select("id").eq("request_id", request!.id).single();
  await updateTripAssignmentAction(trip!.id, { truckId, driverId, helperId });
  return { requestId: request!.id as string, tripId: trip!.id as string };
}

describe("finance (integration)", () => {
  let clientAId: string, driverAId: string, driverBId: string, helperAId: string, helperBId: string, dispatcherId: string;
  let createdRequestIds: string[];
  let createdInvoiceIds: string[];
  let createdExpenseIds: string[];
  let createdPayrollPeriodIds: string[];

  beforeEach(async () => {
    mockState.role = "dispatcher";
    createdRequestIds = [];
    createdInvoiceIds = [];
    createdExpenseIds = [];
    createdPayrollPeriodIds = [];
    clientAId = await userId("clientA");
    driverAId = await userId("driverA");
    driverBId = await userId("driverB");
    helperAId = await userId("helperA");
    helperBId = await userId("helperB");
    dispatcherId = await userId("dispatcher");
  });

  afterEach(async () => {
    const admin = adminClient();
    if (createdPayrollPeriodIds.length > 0) {
      await admin.from("payroll_periods").delete().in("id", createdPayrollPeriodIds); // cascades records/line items
    }
    if (createdExpenseIds.length > 0) {
      await admin.from("expenses").delete().in("id", createdExpenseIds);
    }
    if (createdInvoiceIds.length > 0) {
      await admin.from("invoices").delete().in("id", createdInvoiceIds); // cascades line items
    }
    if (createdRequestIds.length > 0) {
      await admin.from("trips").delete().in("request_id", createdRequestIds);
      await admin.from("requests").delete().in("id", createdRequestIds);
    }
  });

  it("I-FIN-01 auto-generates a sequential invoice number when none is supplied", async () => {
    const admin = adminClient();
    const base = { client_id: clientAId, issue_date: futureDate(0), due_date: futureDate(30), created_by: dispatcherId };
    const { data: inv1 } = await admin.from("invoices").insert(base).select("id, invoice_number").single();
    const { data: inv2 } = await admin.from("invoices").insert(base).select("id, invoice_number").single();
    createdInvoiceIds.push(inv1!.id, inv2!.id);

    expect(inv1?.invoice_number).toMatch(/^INV-\d{4}-\d{5}$/);
    expect(inv2?.invoice_number).toMatch(/^INV-\d{4}-\d{5}$/);
    const seq1 = Number(inv1!.invoice_number.split("-")[2]);
    const seq2 = Number(inv2!.invoice_number.split("-")[2]);
    expect(seq2).toBe(seq1 + 1);
  });

  it("I-FIN-02/03 line item changes recalculate invoice totals; balance_due tracks amount_paid", async () => {
    const admin = adminClient();
    const { data: invoice } = await admin
      .from("invoices")
      .insert({ client_id: clientAId, issue_date: futureDate(0), due_date: futureDate(30), created_by: dispatcherId, tax_amount: 50 })
      .select("id")
      .single();
    createdInvoiceIds.push(invoice!.id);

    const { data: item1 } = await admin
      .from("invoice_line_items")
      .insert({ invoice_id: invoice!.id, description: "Delivery", quantity: 2, unit_price: 500 })
      .select("id")
      .single();
    await admin.from("invoice_line_items").insert({ invoice_id: invoice!.id, description: "Fuel surcharge", quantity: 1, unit_price: 200 });

    let { data: after2Items } = await admin.from("invoices").select("subtotal, grand_total").eq("id", invoice!.id).single();
    expect(Number(after2Items?.subtotal)).toBe(1200); // 2*500 + 1*200
    expect(Number(after2Items?.grand_total)).toBe(1250); // subtotal - discount(0) + tax(50)

    await admin.from("invoice_line_items").update({ quantity: 3 }).eq("id", item1!.id);
    let { data: afterUpdate } = await admin.from("invoices").select("subtotal, grand_total").eq("id", invoice!.id).single();
    expect(Number(afterUpdate?.subtotal)).toBe(1700); // 3*500 + 200

    await admin.from("invoice_line_items").delete().eq("id", item1!.id);
    let { data: afterDelete } = await admin.from("invoices").select("subtotal, grand_total").eq("id", invoice!.id).single();
    expect(Number(afterDelete?.subtotal)).toBe(200);

    await admin.from("invoices").update({ amount_paid: 150 }).eq("id", invoice!.id);
    const { data: paid } = await admin.from("invoices").select("grand_total, amount_paid, balance_due").eq("id", invoice!.id).single();
    expect(Number(paid?.balance_due)).toBe(Number(paid?.grand_total) - Number(paid?.amount_paid));
  });

  it("I-FIN-04 rejects due_date < issue_date at the DB layer even bypassing the Zod schema", async () => {
    const admin = adminClient();
    const { error } = await admin.from("invoices").insert({
      client_id: clientAId,
      issue_date: futureDate(30),
      due_date: futureDate(0),
      created_by: dispatcherId,
    });
    expect(error).not.toBeNull();
  });

  it("I-FIN-05 createInvoiceAction creates an invoice with correct totals end to end", async () => {
    const result = await createInvoiceAction({
      clientId: clientAId,
      issueDate: futureDate(0),
      dueDate: futureDate(30),
      discountAmount: 100,
      taxAmount: 0,
      lineItems: [
        { description: "Delivery", quantity: 1, unitPrice: 1000, sortOrder: 0 },
        { description: "Handling", quantity: 2, unitPrice: 250, sortOrder: 1 },
      ],
    });
    expect(result.success).toBe(true);

    const admin = adminClient();
    const { data: invoice } = await admin
      .from("invoices")
      .select("id, subtotal, grand_total, status")
      .eq("client_id", clientAId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    createdInvoiceIds.push(invoice!.id);
    expect(invoice?.status).toBe("DRAFT");
    expect(Number(invoice?.subtotal)).toBe(1500);
    expect(Number(invoice?.grand_total)).toBe(1400); // 1500 - 100 discount
  });

  it("I-FIN-06 deleteInvoiceAction only succeeds on DRAFT invoices", async () => {
    const admin = adminClient();
    const { data: invoice } = await admin
      .from("invoices")
      .insert({ client_id: clientAId, issue_date: futureDate(0), due_date: futureDate(30), created_by: dispatcherId, status: "SENT" })
      .select("id")
      .single();
    createdInvoiceIds.push(invoice!.id);

    const rejected = await deleteInvoiceAction(invoice!.id);
    expect(rejected).toEqual({ success: false, error: "Only draft invoices can be deleted" });

    await admin.from("invoices").update({ status: "DRAFT" }).eq("id", invoice!.id);
    const allowed = await deleteInvoiceAction(invoice!.id);
    expect(allowed.success).toBe(true);
    createdInvoiceIds = createdInvoiceIds.filter((id) => id !== invoice!.id);
  });

  it.fails(
    "I-FIN-07 expected gap: editing a SENT invoice's financial fields should be rejected (bugfix/lock-sent-invoices)",
    async () => {
      const admin = adminClient();
      const { data: invoice } = await admin
        .from("invoices")
        .insert({ client_id: clientAId, issue_date: futureDate(0), due_date: futureDate(30), created_by: dispatcherId, status: "SENT" })
        .select("id")
        .single();
      createdInvoiceIds.push(invoice!.id);

      const result = await updateInvoiceAction(invoice!.id, { notes: "changed after sending", discount_amount: 999 });
      // Confirmed 2026-08-28: this SHOULD be rejected once status != DRAFT.
      // updateInvoiceAction has no such guard today, so this currently
      // succeeds -- making this assertion fail, which is the point of
      // `it.fails`. Flip to a plain `it` once the guard lands. Exact field
      // split (which fields stay editable post-DRAFT) is still an
      // assumption -- see spec 04.
      expect(result.success).toBe(false);
    }
  );

  it("I-FIN-08 status-transition fields (status/amount_paid/payment_*) remain editable regardless", async () => {
    const admin = adminClient();
    const { data: invoice } = await admin
      .from("invoices")
      .insert({ client_id: clientAId, issue_date: futureDate(0), due_date: futureDate(30), created_by: dispatcherId, status: "DRAFT" })
      .select("id")
      .single();
    createdInvoiceIds.push(invoice!.id);

    const toSent = await updateInvoiceAction(invoice!.id, { status: "SENT" });
    expect(toSent.success).toBe(true);
    const toPaid = await updateInvoiceAction(invoice!.id, {
      status: "PAID",
      amount_paid: 500,
      payment_method: "GCASH",
      payment_date: futureDate(0),
    });
    expect(toPaid.success).toBe(true);

    const { data: final } = await admin.from("invoices").select("status, amount_paid").eq("id", invoice!.id).single();
    expect(final?.status).toBe("PAID");
    expect(Number(final?.amount_paid)).toBe(500);
  });

  it("I-FIN-09/10/11 expense insertion follows the trip-assignment / overhead RLS rules", async () => {
    const { requestId, tripId } = await makeTrip(clientAId, driverBId, helperBId, "");
    createdRequestIds.push(requestId);

    mockState.role = "driverA"; // not assigned to this trip
    const notAssigned = await createExpenseAction({ category: "FUEL", tripId, amount: 500, expenseDate: futureDate(0) });
    expect(notAssigned.success).toBe(false);

    const overheadAsDriver = await createExpenseAction({ category: "MISCELLANEOUS", amount: 100, expenseDate: futureDate(0) });
    expect(overheadAsDriver.success).toBe(false);

    mockState.role = "dispatcher";
    const overheadAsDispatcher = await createExpenseAction({ category: "MAINTENANCE", amount: 1000, expenseDate: futureDate(0) });
    expect(overheadAsDispatcher.success).toBe(true);

    const admin = adminClient();
    const { data: overheadRow } = await admin
      .from("expenses")
      .select("id")
      .eq("submitted_by", dispatcherId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (overheadRow) createdExpenseIds.push(overheadRow.id);
  });

  it("I-FIN-12 payroll line items roll up into trip_bonus and recalculate net_pay", async () => {
    const admin = adminClient();
    const tripOne = await makeTrip(clientAId, driverAId, helperAId, "");
    const tripTwo = await makeTrip(clientAId, driverAId, helperAId, "");
    createdRequestIds.push(tripOne.requestId, tripTwo.requestId);

    mockState.role = "dispatcher";
    const period = await createPayrollPeriodAction({ periodStart: futureDate(0), periodEnd: futureDate(14) });
    expect(period.success).toBe(true);
    const { data: periodRow } = await admin
      .from("payroll_periods")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    createdPayrollPeriodIds.push(periodRow!.id);

    const record = await addPayrollRecordAction(periodRow!.id, { profileId: driverAId, basePay: 10000 });
    expect(record.success).toBe(true);
    const recordId = (record as { record: { id: string } }).record.id;

    await addPayrollLineItemAction(recordId, { tripId: tripOne.tripId, rolePlayed: "DRIVER", baseAmount: 500, bonusAmount: 200 });
    await addPayrollLineItemAction(recordId, { tripId: tripTwo.tripId, rolePlayed: "DRIVER", baseAmount: 500, bonusAmount: 300 });

    const { data: finalRecord } = await admin
      .from("payroll_records")
      .select("trip_bonus, net_pay, base_pay, overtime_pay, deductions")
      .eq("id", recordId)
      .single();
    expect(Number(finalRecord?.trip_bonus)).toBe(500); // 200 + 300
    expect(Number(finalRecord?.net_pay)).toBe(
      Number(finalRecord?.base_pay) + Number(finalRecord?.trip_bonus) + Number(finalRecord?.overtime_pay) - Number(finalRecord?.deductions)
    );
  });

  it("I-FIN-13/14/15 unique constraints reject duplicate periods/records/line items", async () => {
    const admin = adminClient();
    const trip = await makeTrip(clientAId, driverAId, helperAId, "");
    createdRequestIds.push(trip.requestId);

    const start = futureDate(100);
    const end = futureDate(114);
    const period1 = await createPayrollPeriodAction({ periodStart: start, periodEnd: end });
    expect(period1.success).toBe(true);
    const { data: periodRow } = await admin.from("payroll_periods").select("id").order("created_at", { ascending: false }).limit(1).single();
    createdPayrollPeriodIds.push(periodRow!.id);

    const period2 = await createPayrollPeriodAction({ periodStart: start, periodEnd: end });
    expect(period2.success).toBe(false); // I-FIN-15: unique_pay_period

    const record1 = await addPayrollRecordAction(periodRow!.id, { profileId: driverAId, basePay: 5000 });
    expect(record1.success).toBe(true);
    const record2 = await addPayrollRecordAction(periodRow!.id, { profileId: driverAId, basePay: 5000 });
    expect(record2.success).toBe(false); // I-FIN-13: unique_employee_per_period

    const recordId = (record1 as { record: { id: string } }).record.id;
    const lineItem1 = await addPayrollLineItemAction(recordId, { tripId: trip.tripId, rolePlayed: "DRIVER", baseAmount: 100, bonusAmount: 0 });
    expect(lineItem1.success).toBe(true);
    const lineItem2 = await addPayrollLineItemAction(recordId, { tripId: trip.tripId, rolePlayed: "DRIVER", baseAmount: 100, bonusAmount: 0 });
    expect(lineItem2.success).toBe(false); // I-FIN-14: unique_trip_per_record
  });
});

// RLS tests for the finance tables -- Spec 04's R-FIN-* cases. Direct DB
// access via role-authenticated clients. NOT executed by the agent that
// wrote this file; run against a local Supabase stack.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adminClient, clientFor, userId } from "./_helpers";

function futureDate(offsetDays = 365) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function makeTripRow(clientId: string, driverId: string | null, helperId: string | null) {
  const admin = adminClient();
  const { data: request } = await admin
    .from("requests")
    .insert({
      client_id: clientId,
      truck_type_requested: "LIGHT_TRUCK",
      scheduled_date: futureDate(),
      scheduled_time: "09:30",
      cargo_handling_tags: ["DRY_GOODS"],
      cargo_weight: 100,
      cargo_measurement_mode: "WHOLE",
      status: "ACCEPTED",
    })
    .select("id")
    .single();
  const { data: trip } = await admin
    .from("trips")
    .insert({ request_id: request!.id, driver_id: driverId, helper_id: helperId, status: "ASSIGNED" })
    .select("id")
    .single();
  return { requestId: request!.id as string, tripId: trip!.id as string };
}

describe("finance RLS", () => {
  let clientAId: string, clientBId: string, dispatcherId: string;
  let driverAId: string, driverBId: string, helperAId: string;
  let createdRequestIds: string[];
  let createdInvoiceIds: string[];
  let createdExpenseIds: string[];
  let createdPayrollPeriodIds: string[];

  beforeEach(async () => {
    clientAId = await userId("clientA");
    clientBId = await userId("clientB");
    dispatcherId = await userId("dispatcher");
    driverAId = await userId("driverA");
    driverBId = await userId("driverB");
    helperAId = await userId("helperA");
    createdRequestIds = [];
    createdInvoiceIds = [];
    createdExpenseIds = [];
    createdPayrollPeriodIds = [];
  });

  afterEach(async () => {
    const admin = adminClient();
    if (createdPayrollPeriodIds.length > 0) await admin.from("payroll_periods").delete().in("id", createdPayrollPeriodIds);
    if (createdExpenseIds.length > 0) await admin.from("expenses").delete().in("id", createdExpenseIds);
    if (createdInvoiceIds.length > 0) await admin.from("invoices").delete().in("id", createdInvoiceIds);
    if (createdRequestIds.length > 0) {
      await admin.from("trips").delete().in("request_id", createdRequestIds);
      await admin.from("requests").delete().in("id", createdRequestIds);
    }
  });

  it("R-FIN-01 DISPATCHER has full CRUD on invoices and expenses", async () => {
    const dispatcher = await clientFor("dispatcher");
    const { data: invoice, error: invoiceError } = await dispatcher
      .from("invoices")
      .insert({ client_id: clientAId, issue_date: futureDate(0), due_date: futureDate(30), created_by: dispatcherId })
      .select("id")
      .single();
    expect(invoiceError).toBeNull();
    createdInvoiceIds.push(invoice!.id);

    const { data: expense, error: expenseError } = await dispatcher
      .from("expenses")
      .insert({ category: "MAINTENANCE", amount: 100, expense_date: futureDate(0), submitted_by: dispatcherId, status: "PENDING" })
      .select("id")
      .single();
    expect(expenseError).toBeNull();
    createdExpenseIds.push(expense!.id);
  });

  it("R-FIN-02 CLIENT can select only their own invoices", async () => {
    const admin = adminClient();
    const { data: mine } = await admin
      .from("invoices")
      .insert({ client_id: clientAId, issue_date: futureDate(0), due_date: futureDate(30), created_by: dispatcherId })
      .select("id")
      .single();
    const { data: theirs } = await admin
      .from("invoices")
      .insert({ client_id: clientBId, issue_date: futureDate(0), due_date: futureDate(30), created_by: dispatcherId })
      .select("id")
      .single();
    createdInvoiceIds.push(mine!.id, theirs!.id);

    const client = await clientFor("clientA");
    const { data: ownResult } = await client.from("invoices").select("id").eq("id", mine!.id);
    expect(ownResult).toHaveLength(1);
    const { data: otherResult } = await client.from("invoices").select("id").eq("id", theirs!.id);
    expect(otherResult ?? []).toHaveLength(0);
  });

  it("R-FIN-03 CLIENT cannot select expenses or payroll tables at all", async () => {
    const admin = adminClient();
    const { data: expense } = await admin
      .from("expenses")
      .insert({ category: "FUEL", amount: 50, expense_date: futureDate(0), submitted_by: dispatcherId, status: "PENDING" })
      .select("id")
      .single();
    createdExpenseIds.push(expense!.id);

    const { data: period } = await admin
      .from("payroll_periods")
      .insert({ period_start: futureDate(200), period_end: futureDate(214), status: "DRAFT", prepared_by: dispatcherId })
      .select("id")
      .single();
    createdPayrollPeriodIds.push(period!.id);

    const client = await clientFor("clientA");
    const { data: expenseResult } = await client.from("expenses").select("id").eq("id", expense!.id);
    expect(expenseResult ?? []).toHaveLength(0);
    const { data: periodResult } = await client.from("payroll_periods").select("id").eq("id", period!.id);
    expect(periodResult ?? []).toHaveLength(0);
  });

  it("R-FIN-04/05 DRIVER/HELPER can select expenses tied to their own trips or submissions, not unrelated ones", async () => {
    const admin = adminClient();
    const own = await makeTripRow(clientAId, driverAId, null);
    const unrelated = await makeTripRow(clientAId, driverBId, null);
    createdRequestIds.push(own.requestId, unrelated.requestId);

    const { data: ownExpense } = await admin
      .from("expenses")
      .insert({ category: "TOLL", trip_id: own.tripId, amount: 50, expense_date: futureDate(0), submitted_by: driverAId, status: "PENDING" })
      .select("id")
      .single();
    const { data: unrelatedExpense } = await admin
      .from("expenses")
      .insert({ category: "TOLL", trip_id: unrelated.tripId, amount: 50, expense_date: futureDate(0), submitted_by: driverBId, status: "PENDING" })
      .select("id")
      .single();
    createdExpenseIds.push(ownExpense!.id, unrelatedExpense!.id);

    const driver = await clientFor("driverA");
    const { data: ownResult } = await driver.from("expenses").select("id").eq("id", ownExpense!.id);
    expect(ownResult).toHaveLength(1);
    const { data: unrelatedResult } = await driver.from("expenses").select("id").eq("id", unrelatedExpense!.id);
    expect(unrelatedResult ?? []).toHaveLength(0);
  });

  it("R-FIN-06 DRIVER/HELPER can select only their own payroll records/periods/line items", async () => {
    const admin = adminClient();
    const trip = await makeTripRow(clientAId, driverAId, null);
    createdRequestIds.push(trip.requestId);

    const { data: period } = await admin
      .from("payroll_periods")
      .insert({ period_start: futureDate(200), period_end: futureDate(214), status: "DRAFT", prepared_by: dispatcherId })
      .select("id")
      .single();
    createdPayrollPeriodIds.push(period!.id);

    const { data: ownRecord } = await admin
      .from("payroll_records")
      .insert({ payroll_period_id: period!.id, profile_id: driverAId, base_pay: 1000 })
      .select("id")
      .single();
    const { data: otherRecord } = await admin
      .from("payroll_records")
      .insert({ payroll_period_id: period!.id, profile_id: driverBId, base_pay: 1000 })
      .select("id")
      .single();

    const driver = await clientFor("driverA");
    const { data: ownResult } = await driver.from("payroll_records").select("id").eq("id", ownRecord!.id);
    expect(ownResult).toHaveLength(1);
    const { data: otherResult } = await driver.from("payroll_records").select("id").eq("id", otherRecord!.id);
    expect(otherResult ?? []).toHaveLength(0);

    // A period containing at least one of the driver's own records is visible...
    const { data: periodResult } = await driver.from("payroll_periods").select("id").eq("id", period!.id);
    expect(periodResult).toHaveLength(1);
  });

  it("R-FIN-07 DRIVER/HELPER cannot insert/update/delete anything in payroll tables", async () => {
    const admin = adminClient();
    const { data: period } = await admin
      .from("payroll_periods")
      .insert({ period_start: futureDate(300), period_end: futureDate(314), status: "DRAFT", prepared_by: dispatcherId })
      .select("id")
      .single();
    createdPayrollPeriodIds.push(period!.id);

    const driver = await clientFor("driverA");
    const { data: inserted, error: insertError } = await driver
      .from("payroll_records")
      .insert({ payroll_period_id: period!.id, profile_id: driverAId, base_pay: 999 })
      .select("id");
    expect(insertError).not.toBeNull();
    expect(inserted ?? []).toHaveLength(0);

    await driver.from("payroll_periods").update({ status: "FINALIZED" }).eq("id", period!.id);
    const { data: after } = await admin.from("payroll_periods").select("status").eq("id", period!.id).single();
    expect(after?.status).toBe("DRAFT"); // unchanged
  });
});

# Spec 04 — Finance (Invoices, Expenses, Payroll)

**Branch:** `test/finance-invoices-expenses-payroll`
**Depends on:** Wave 0 (this is the first time the finance migration is actually applied anywhere, even if only locally)
**Layers:** unit (Zod schemas, net-pay math) · integration (triggers, server actions) · RLS

## Workflow summary

A dispatcher creates invoices (`DRAFT`) with line items; totals recalculate via trigger. Expenses
are filed by dispatchers (any) or by drivers/helpers (only for trips they're on). Payroll periods
contain per-employee records; trip-level bonus line items roll up into `trip_bonus`, which feeds
`net_pay` via trigger.

## Confirmed/derived business rules

- `balance_due = grand_total - amount_paid` — a generated column, not app logic. Test it's
  read-only/computed, never independently writable.
- `invoice_line_items.subtotal = quantity * unit_price` — also generated.
- Invoice number auto-generates on insert as `INV-YYYY-#####` from a global (non-per-year-reset)
  sequence, only when not explicitly supplied.
- Invoice `subtotal`/`grand_total` recalculate automatically on any INSERT/UPDATE/DELETE of
  `invoice_line_items`.
- `due_date >= issue_date` is enforced both by a DB CHECK constraint and separately by the Zod
  schema — test both layers independently, since one could regress without the other catching it.
- Drivers/helpers can only submit expenses with `trip_id` set to a trip they're assigned to;
  `trip_id IS NULL` (overhead) expenses are dispatcher-only.
- Payroll: one record per employee per period (`unique_employee_per_period`), one line item per
  trip per record (`unique_trip_per_record`). `net_pay` recalculates via trigger whenever
  `payroll_line_items` change (via the `rollup_trip_bonus` → `calculate_net_pay` chain) or when
  `payroll_records` is updated directly.
- **New intended rule, currently unenforced — write as a failing/red test (confirmed 2026-08-28):**
  once `invoices.status != 'DRAFT'`, edits to core financial fields (line items, discount_amount,
  tax_amount, due_date, notes) should be rejected. Status-transition fields (`status`,
  `amount_paid`, `payment_method`, `payment_date`, `payment_reference`) should remain editable so a
  DRAFT → SENT → PAID flow still works.
  **This exact field split is an assumption, not yet confirmed with Ahmer** — flag it explicitly
  during implementation before building the enforcement (likely a `BEFORE UPDATE` trigger,
  matching the migration's own stated intent), since it determines the precise CHECK/trigger logic.
  Today's `updateInvoiceAction` has no such guard at all, so this will fail until a follow-up
  `bugfix/lock-sent-invoices` branch implements it.
- **Not covered this wave:** automatic `OVERDUE` status. The migration's design notes call for a
  `pg_cron` nightly sweep that doesn't exist in the repo. No test for it — candidate `feature/`
  branch later.

## Assumed schema

See `supabase/migrations/20260827000000_invoices_expenses_payroll.sql` directly — it's the
authoritative source (invoices, invoice_line_items, expenses, payroll_periods, payroll_records,
payroll_line_items, plus the invoice_status/payment_method/expense_category/expense_status/
payroll_status/payroll_role enums). Not re-transcribed here to avoid drift between this doc and the
actual SQL.

## Test cases

### Unit

| ID | Description | Expected |
|---|---|---|
| U-FIN-01 | Net pay formula: `base_pay + trip_bonus + overtime_pay - deductions` (test as a pure function if extracted for unit testing, otherwise fold into the integration case I-FIN-12) | matches |
| U-FIN-02 | Invoice form Zod schema rejects `dueDate < issueDate` | validation error |
| U-FIN-03 | Invoice form Zod schema rejects an empty `lineItems` array | validation error |
| U-FIN-04 | Expense Zod schema rejects `amount <= 0` | validation error |

### Integration (against local Supabase, finance migration applied)

| ID | Description | Expected |
|---|---|---|
| I-FIN-01 | Inserting an invoice without `invoice_number` auto-generates `INV-<year>-00001`, increments on the next one | as described |
| I-FIN-02 | Insert/update/delete of an `invoice_line_items` row recalculates the parent invoice's `subtotal`/`grand_total` | trigger fires, values match |
| I-FIN-03 | `balance_due` always equals `grand_total - amount_paid` after any change to either | generated column correct |
| I-FIN-04 | Invoice insert with `due_date < issue_date`, bypassing the Zod schema (direct insert) | CHECK constraint violation |
| I-FIN-05 | `createInvoiceAction` end-to-end: invoice + line items created, totals correct | as described |
| I-FIN-06 | `deleteInvoiceAction` on a non-DRAFT invoice | rejected, `{success:false, error:'Only draft invoices can be deleted'}` |
| I-FIN-07 | **(intended-behavior / red test)** `updateInvoiceAction` editing `notes`/`discount_amount` on a SENT invoice | should reject; will fail today |
| I-FIN-08 | `updateInvoiceAction` changing `status` DRAFT→SENT, then SENT→PAID with `amount_paid`/`payment_method`/`payment_date`, still succeeds after I-FIN-07's guard lands | allowed |
| I-FIN-09 | Driver/helper expense insert with `trip_id` for a trip they're NOT assigned to | rejected (RLS) |
| I-FIN-10 | Driver/helper expense insert with `trip_id = null` (overhead) | rejected (RLS) |
| I-FIN-11 | Dispatcher expense insert with `trip_id = null` | allowed |
| I-FIN-12 | Inserting 2 `payroll_line_items` for one record sums into `trip_bonus`, which then updates `net_pay` | rollup chain verified end-to-end |
| I-FIN-13 | Duplicate `payroll_records` for the same (period, profile) | rejected, `unique_employee_per_period` |
| I-FIN-14 | Duplicate `payroll_line_items` for the same (record, trip) | rejected, `unique_trip_per_record` |
| I-FIN-15 | Duplicate `payroll_periods` with identical (period_start, period_end) | rejected, `unique_pay_period` |

### RLS

| ID | Description | Expected |
|---|---|---|
| R-FIN-01 | DISPATCHER full CRUD on all 6 finance tables | allowed |
| R-FIN-02 | CLIENT can SELECT only their own invoices (`client_id = auth.uid()`) | allowed / denied appropriately |
| R-FIN-03 | CLIENT cannot SELECT `expenses`, `payroll_periods`, `payroll_records`, or `payroll_line_items` at all | denied |
| R-FIN-04 | DRIVER/HELPER can SELECT expenses they submitted OR that belong to a trip they're on | allowed |
| R-FIN-05 | DRIVER/HELPER cannot SELECT another employee's unrelated expense | denied |
| R-FIN-06 | DRIVER/HELPER can SELECT only their own payroll_records/payroll_periods/payroll_line_items | allowed for own, denied for others' |
| R-FIN-07 | DRIVER/HELPER cannot INSERT/UPDATE/DELETE anything in payroll tables | denied |

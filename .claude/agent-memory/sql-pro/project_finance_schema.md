---
name: project-finance-schema
description: FleetMan finance schema modules (invoices, expenses, payroll) — migration written, not yet applied to remote DB
metadata:
  type: project
---

Finance schema migration written to `supabase/migrations/20260827000000_invoices_expenses_payroll.sql`. Zod schemas written to `packages/shared/src/schemas/` (invoice.schema.ts, expense.schema.ts, payroll.schema.ts).

**Why:** Billing, operational cost tracking, and driver/helper payroll are the three new back-office modules added to the FleetMan logistics backend.

**Key decisions to remember:**
- Migration is written but NOT yet applied to remote DB — user will apply manually.
- `balance_due` on invoices: GENERATED ALWAYS AS (grand_total - amount_paid) STORED.
- `invoice_line_items.subtotal`: GENERATED ALWAYS AS (quantity * unit_price) STORED.
- Invoice number sequence is global (not per-year reset). Format: INV-YYYY-00001.
- Payroll net_pay is maintained by a two-trigger chain: payroll_line_items → rollup_trip_bonus → calculate_net_pay.
- Drivers/helpers CANNOT submit expenses with trip_id IS NULL (enforced by RLS INSERT policy WITH CHECK). Only dispatchers can file overhead expenses.
- RLS uses JWT app_metadata claim (not profile table join) — matches existing DB convention.
- OVERDUE invoice status is NOT handled by trigger — recommended pg_cron nightly sweep.
- PaymentMethodSchema is defined in invoice.schema.ts only; payroll.schema.ts imports it from there (not re-exported to avoid barrel duplicate).

**How to apply:** `supabase db push` or via Supabase Studio SQL editor. Run after any existing migrations.

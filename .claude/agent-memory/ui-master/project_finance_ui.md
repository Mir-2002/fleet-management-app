---
name: project-finance-ui
description: Finance module UI implementation — invoices, expenses, payroll pages and components for the fleet management app
metadata:
  type: project
---

Full finance UI implemented across 15 files in apps/web/src.

**Why:** Fleet management app needed complete invoice/expense/payroll tracking UI wired to Supabase tables.

**How to apply:** When extending finance features, follow the same page/action/table/dialog pattern already established. All status badges use the `STATUS_STYLES` Record + non-null assertion fallback (`?? STATUS_STYLES["KEY"]!`).

Key decisions:
- `InvoiceRow` type includes all DB columns including `discount_amount`, `tax_amount`, `payment_method`, `payment_date`, `payment_reference` — do NOT use module augmentation to extend it
- Zod schemas for forms avoid `.default()` on numeric fields; use `defaultValues` in `useForm` instead to prevent resolver type mismatches
- Payroll records map uses `Fragment` with key (not `<>`) since two `<tr>` elements are returned per record
- StatusBadge uses `?? STATUS_STYLES["FALLBACK"]!` (non-null assertion) to satisfy strict TS

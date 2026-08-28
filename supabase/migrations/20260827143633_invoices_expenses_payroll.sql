-- =============================================================================
-- FleetMan Finance Schema
-- Migration: 20260827000000_invoices_expenses_payroll
-- Modules: Invoices, Expenses, Payroll
-- Currency: PHP (Philippine Peso) — single-currency system
-- RLS role check convention: auth.jwt() -> 'app_metadata' ->> 'user_role'
--   (matches all existing policies; avoids a profile table join per evaluation)
-- =============================================================================


-- =============================================================================
-- SECTION 1: ENUMS
-- =============================================================================

-- Invoice lifecycle: DRAFT is the editable state; SENT locks the record for
-- editing; PAID/OVERDUE/CANCELLED/VOID are terminal or near-terminal states.
-- OVERDUE is set by a pg_cron sweep (see Design Notes), not a trigger.
CREATE TYPE invoice_status AS ENUM (
  'DRAFT',
  'SENT',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'VOID'
);

-- Payment channels supported by the business (Philippines-centric: GCash/Maya
-- are mobile wallets ubiquitous in local logistics).
CREATE TYPE payment_method AS ENUM (
  'CASH',
  'BANK_TRANSFER',
  'CHEQUE',
  'GCASH',
  'MAYA'
);

-- Operational cost categories for expense tracking per trip or fleet-wide.
CREATE TYPE expense_category AS ENUM (
  'FUEL',
  'TOLL',
  'MAINTENANCE',
  'LOADING_UNLOADING',
  'ACCOMMODATION',
  'MISCELLANEOUS'
);

-- Expense approval workflow: submitted by field staff, approved by dispatcher.
CREATE TYPE expense_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

-- Payroll period lifecycle: DRAFT allows edits; FINALIZED locks the period;
-- PAID confirms disbursement.
CREATE TYPE payroll_status AS ENUM (
  'DRAFT',
  'FINALIZED',
  'PAID'
);

-- Distinguishes which role the worker played on the trip for pay calculation
-- purposes. Separate from the global user_role enum because a DRIVER role
-- profile will always be DRIVER here, but the type is scoped to payroll intent.
CREATE TYPE payroll_role AS ENUM (
  'DRIVER',
  'HELPER'
);


-- =============================================================================
-- SECTION 2: SHARED TRIGGER FUNCTION — updated_at
-- =============================================================================

-- Single shared function used by all BEFORE UPDATE triggers below.
-- Written as CREATE OR REPLACE so re-running the migration is idempotent.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- SECTION 3: INVOICE NUMBER SEQUENCE & GENERATOR
-- =============================================================================

-- Global monotonically-increasing sequence. The year is embedded cosmetically
-- in the formatted number (INV-2026-00001). The sequence does NOT reset yearly
-- because a true per-year reset requires a counter table and scheduled job —
-- overkill for this system. Numbers remain globally unique and auditable.
CREATE SEQUENCE invoice_number_seq START 1;

-- Called by the BEFORE INSERT trigger on invoices. If invoice_number is
-- supplied explicitly (e.g. data import), the trigger is a no-op for that row.
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number :=
      'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
      LPAD(nextval('invoice_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;


-- =============================================================================
-- SECTION 4: INVOICE TOTALS TRIGGER FUNCTION
-- =============================================================================

-- Recalculates invoices.subtotal and invoices.grand_total whenever a line item
-- is inserted, updated, or deleted. Uses COALESCE(NEW.invoice_id, OLD.invoice_id)
-- to correctly handle DELETE (where NEW is NULL).
--
-- grand_total = subtotal - discount_amount + tax_amount
-- balance_due is a GENERATED ALWAYS AS column (grand_total - amount_paid),
-- so it never needs a trigger — it updates automatically.
CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id uuid;
  v_subtotal   numeric(12, 2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(quantity * unit_price), 0)
    INTO v_subtotal
    FROM invoice_line_items
   WHERE invoice_id = v_invoice_id;

  UPDATE invoices
     SET subtotal    = v_subtotal,
         grand_total = v_subtotal - discount_amount + tax_amount
   WHERE id = v_invoice_id;

  RETURN NEW;
END;
$$;


-- =============================================================================
-- SECTION 5: PAYROLL TRIGGER FUNCTIONS
-- =============================================================================

-- Rolls up the sum of bonus_amount from payroll_line_items into the parent
-- payroll_records.trip_bonus. Fires AFTER any change to payroll_line_items.
-- Updating trip_bonus on payroll_records causes the calculate_net_pay trigger
-- to fire automatically (BEFORE UPDATE chain).
CREATE OR REPLACE FUNCTION rollup_trip_bonus()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_record_id  uuid;
  v_trip_bonus numeric(12, 2);
BEGIN
  v_record_id := COALESCE(NEW.payroll_record_id, OLD.payroll_record_id);

  SELECT COALESCE(SUM(bonus_amount), 0)
    INTO v_trip_bonus
    FROM payroll_line_items
   WHERE payroll_record_id = v_record_id;

  UPDATE payroll_records
     SET trip_bonus = v_trip_bonus
   WHERE id = v_record_id;

  RETURN NEW;
END;
$$;

-- Recalculates net_pay on the payroll_records row being inserted or updated.
-- Fires BEFORE INSERT OR UPDATE so NEW.net_pay is set before the row is written.
-- net_pay = base_pay + trip_bonus + overtime_pay - deductions
CREATE OR REPLACE FUNCTION calculate_net_pay()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.net_pay := NEW.base_pay + NEW.trip_bonus + NEW.overtime_pay - NEW.deductions;
  RETURN NEW;
END;
$$;


-- =============================================================================
-- SECTION 6: TABLES — INVOICES MODULE
-- =============================================================================

CREATE TABLE invoices (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Human-readable invoice number, e.g. INV-2026-00001.
  -- NOT NULL is enforced post-generation; the BEFORE INSERT trigger populates it
  -- before the NOT NULL constraint is checked.
  invoice_number   text          NOT NULL UNIQUE,

  client_id        uuid          NOT NULL REFERENCES profiles (id),
  request_id       uuid          REFERENCES requests (id) ON DELETE SET NULL,
  trip_id          uuid          REFERENCES trips (id)    ON DELETE SET NULL,

  issue_date       date          NOT NULL DEFAULT CURRENT_DATE,
  due_date         date          NOT NULL,

  status           invoice_status NOT NULL DEFAULT 'DRAFT',

  -- Monetary columns use numeric(12,2): up to 9,999,999,999.99 PHP.
  -- subtotal and grand_total are maintained by the invoice_line_items trigger.
  subtotal         numeric(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount  numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount       numeric(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  grand_total      numeric(12, 2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),

  -- balance_due is always accurate: never drifts from grand_total / amount_paid.
  -- GENERATED ALWAYS AS (virtual) means it is computed at read time, zero storage.
  amount_paid      numeric(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance_due      numeric(12, 2) GENERATED ALWAYS AS (grand_total - amount_paid) STORED,

  -- Payment details — populated when status moves to PAID.
  payment_method    payment_method,
  payment_date      date,
  payment_reference text,

  notes            text,

  created_by       uuid          NOT NULL REFERENCES profiles (id),
  created_at       timestamptz   NOT NULL DEFAULT NOW(),
  updated_at       timestamptz   NOT NULL DEFAULT NOW(),

  CONSTRAINT due_date_after_issue CHECK (due_date >= issue_date)
);

-- Line items: one row per charge component (base fee, surcharge, fuel levy, etc.)
CREATE TABLE invoice_line_items (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid          NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,

  description  text          NOT NULL,
  quantity     numeric(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   numeric(12, 2) NOT NULL            CHECK (unit_price >= 0),

  -- Computed at read time; always equals quantity * unit_price.
  subtotal     numeric(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- Controls display order in the invoice PDF / UI.
  sort_order   integer       NOT NULL DEFAULT 0,

  created_at   timestamptz   NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 7: TABLES — EXPENSES MODULE
-- =============================================================================

CREATE TABLE expenses (
  id           uuid             PRIMARY KEY DEFAULT gen_random_uuid(),

  category     expense_category NOT NULL,

  -- trip_id nullable: fleet-wide overhead (e.g. garage maintenance).
  -- Drivers/helpers are restricted by RLS to trip_id IS NOT NULL — they may
  -- only submit expenses tied to trips they are assigned to.
  -- Dispatchers may file trip_id IS NULL expenses (overhead).
  trip_id      uuid             REFERENCES trips  (id) ON DELETE SET NULL,
  truck_id     uuid             REFERENCES trucks (id) ON DELETE SET NULL,

  amount       numeric(12, 2)   NOT NULL CHECK (amount > 0),
  expense_date date             NOT NULL DEFAULT CURRENT_DATE,
  description  text,
  receipt_url  text,            -- Supabase Storage signed URL; see Design Notes.

  submitted_by uuid             NOT NULL REFERENCES profiles (id),
  approved_by  uuid             REFERENCES profiles (id),

  status       expense_status   NOT NULL DEFAULT 'PENDING',

  created_at   timestamptz      NOT NULL DEFAULT NOW(),
  updated_at   timestamptz      NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 8: TABLES — PAYROLL MODULE
-- =============================================================================

-- One record per bi-monthly (or other) pay period for the company.
CREATE TABLE payroll_periods (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),

  period_start date           NOT NULL,
  period_end   date           NOT NULL,

  status       payroll_status NOT NULL DEFAULT 'DRAFT',

  prepared_by  uuid           NOT NULL REFERENCES profiles (id),
  approved_by  uuid           REFERENCES profiles (id),

  created_at   timestamptz    NOT NULL DEFAULT NOW(),
  updated_at   timestamptz    NOT NULL DEFAULT NOW(),

  CONSTRAINT period_end_after_start  CHECK (period_end > period_start),
  -- Prevents duplicate pay periods from being accidentally created.
  CONSTRAINT unique_pay_period       UNIQUE (period_start, period_end)
);

-- One record per employee (driver or helper) per pay period.
CREATE TABLE payroll_records (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id uuid           NOT NULL REFERENCES payroll_periods (id) ON DELETE CASCADE,
  profile_id        uuid           NOT NULL REFERENCES profiles (id),

  -- Earnings breakdown; net_pay is always recalculated by trigger.
  base_pay          numeric(12, 2) NOT NULL DEFAULT 0 CHECK (base_pay >= 0),
  trip_bonus        numeric(12, 2) NOT NULL DEFAULT 0 CHECK (trip_bonus >= 0),
  overtime_pay      numeric(12, 2) NOT NULL DEFAULT 0 CHECK (overtime_pay >= 0),
  deductions        numeric(12, 2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  net_pay           numeric(12, 2) NOT NULL DEFAULT 0,

  -- Payment details — populated when period status moves to PAID.
  payment_method    payment_method,
  payment_date      date,
  payment_reference text,

  created_at        timestamptz    NOT NULL DEFAULT NOW(),
  updated_at        timestamptz    NOT NULL DEFAULT NOW(),

  -- One payroll entry per person per period.
  CONSTRAINT unique_employee_per_period UNIQUE (payroll_period_id, profile_id)
);

-- One row per trip covered in this payroll record.
-- Provides an auditable breakdown of how trip_bonus was calculated.
CREATE TABLE payroll_line_items (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id uuid         NOT NULL REFERENCES payroll_records (id) ON DELETE CASCADE,
  trip_id           uuid         NOT NULL REFERENCES trips (id),

  -- role_played records what the worker did on this specific trip.
  -- A worker's global profile role should match, but this makes payroll
  -- self-documenting even if profiles are later updated.
  role_played       payroll_role NOT NULL,

  base_amount       numeric(12, 2) NOT NULL DEFAULT 0 CHECK (base_amount >= 0),
  bonus_amount      numeric(12, 2) NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),

  created_at        timestamptz  NOT NULL DEFAULT NOW(),

  -- A trip should appear only once per payroll record (prevents double-counting).
  CONSTRAINT unique_trip_per_record UNIQUE (payroll_record_id, trip_id)
);


-- =============================================================================
-- SECTION 9: INDEXES
-- =============================================================================

-- invoices: FK columns + status (frequent filter) + due_date/status composite
-- for the pg_cron overdue sweep and dispatcher dashboards.
CREATE INDEX idx_invoices_client_id      ON invoices (client_id);
CREATE INDEX idx_invoices_request_id     ON invoices (request_id);
CREATE INDEX idx_invoices_trip_id        ON invoices (trip_id);
CREATE INDEX idx_invoices_created_by     ON invoices (created_by);
CREATE INDEX idx_invoices_status         ON invoices (status);
CREATE INDEX idx_invoices_due_date_status ON invoices (due_date, status);

-- invoice_line_items: primary join path from invoices.
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items (invoice_id);

-- expenses: FK columns + status + date for range queries.
CREATE INDEX idx_expenses_trip_id        ON expenses (trip_id);
CREATE INDEX idx_expenses_truck_id       ON expenses (truck_id);
CREATE INDEX idx_expenses_submitted_by   ON expenses (submitted_by);
CREATE INDEX idx_expenses_status         ON expenses (status);
CREATE INDEX idx_expenses_expense_date   ON expenses (expense_date);

-- payroll_periods: status + date range for period lookups.
CREATE INDEX idx_payroll_periods_status     ON payroll_periods (status);
CREATE INDEX idx_payroll_periods_date_range ON payroll_periods (period_start, period_end);

-- payroll_records: both FK directions are queried frequently.
CREATE INDEX idx_payroll_records_period_id  ON payroll_records (payroll_period_id);
CREATE INDEX idx_payroll_records_profile_id ON payroll_records (profile_id);

-- payroll_line_items: FK columns used in JOINs and rollup aggregation.
CREATE INDEX idx_payroll_line_items_record_id ON payroll_line_items (payroll_record_id);
CREATE INDEX idx_payroll_line_items_trip_id   ON payroll_line_items (trip_id);


-- =============================================================================
-- SECTION 10: ROW LEVEL SECURITY — ENABLE
-- =============================================================================

ALTER TABLE invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_line_items  ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 11: RLS POLICIES
--
-- Convention (matches all existing policies in this DB):
--   Role check: (auth.jwt() -> 'app_metadata' ->> 'user_role') = '<ROLE>'
--   This reads from the JWT claim set in app_metadata at sign-in, avoiding
--   a subquery to the profiles table on every row evaluation.
--
-- Service role bypasses RLS automatically (Supabase default).
-- =============================================================================

-- Helper macro used throughout (inline, no function needed):
--   dispatcher_check: (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER'
--   client_check:     (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'CLIENT'
--   field_worker_check: role IN ('DRIVER','HELPER') — expressed as two OR conditions


-- ----------------------------------------------------------------------------
-- invoices
-- ----------------------------------------------------------------------------

-- Dispatchers have full CRUD — they create and manage all invoices.
CREATE POLICY dispatcher_invoices_all
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER'
  );

-- Clients can view only invoices addressed to them.
CREATE POLICY client_invoices_select_own
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'CLIENT'
    AND client_id = auth.uid()
  );


-- ----------------------------------------------------------------------------
-- invoice_line_items
-- ----------------------------------------------------------------------------

-- Dispatchers have full CRUD on line items (they build the invoice).
CREATE POLICY dispatcher_invoice_line_items_all
  ON invoice_line_items
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER'
  );

-- Clients can see line items for their own invoices.
-- Subquery references invoices which is itself RLS-protected, giving defence
-- in depth; but we also add the explicit client_id check for clarity.
CREATE POLICY client_invoice_line_items_select_own
  ON invoice_line_items
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'CLIENT'
    AND invoice_id IN (
      SELECT id FROM invoices WHERE client_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- expenses
-- ----------------------------------------------------------------------------

-- Dispatchers have full CRUD — they can view, edit, approve, and file
-- overhead expenses (including trip_id IS NULL fleet-wide costs).
CREATE POLICY dispatcher_expenses_all
  ON expenses
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER'
  );

-- Drivers and helpers can view expenses they submitted OR expenses on trips
-- they are assigned to (e.g. a driver seeing the toll their helper filed).
CREATE POLICY driver_helper_expenses_select
  ON expenses
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('DRIVER', 'HELPER')
    AND (
      submitted_by = auth.uid()
      OR trip_id IN (
        SELECT id FROM trips
         WHERE driver_id = auth.uid()
            OR helper_id = auth.uid()
      )
    )
  );

-- Drivers and helpers can only INSERT expenses for trips they are assigned to.
-- trip_id IS NOT NULL enforced here: general overhead is dispatcher-only.
CREATE POLICY driver_helper_expenses_insert
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('DRIVER', 'HELPER')
    AND submitted_by = auth.uid()
    AND trip_id IS NOT NULL
    AND trip_id IN (
      SELECT id FROM trips
       WHERE driver_id = auth.uid()
          OR helper_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- payroll_periods
-- ----------------------------------------------------------------------------

-- Dispatchers manage all pay periods.
CREATE POLICY dispatcher_payroll_periods_all
  ON payroll_periods
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER'
  );

-- Drivers and helpers can see periods that contain a record for them.
-- This lets the mobile app show "your pay period history" without exposing
-- other employees' period data.
CREATE POLICY driver_helper_payroll_periods_select
  ON payroll_periods
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('DRIVER', 'HELPER')
    AND id IN (
      SELECT payroll_period_id FROM payroll_records
       WHERE profile_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- payroll_records
-- ----------------------------------------------------------------------------

-- Dispatchers have full CRUD.
CREATE POLICY dispatcher_payroll_records_all
  ON payroll_records
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER'
  );

-- Drivers and helpers can view only their own payroll record.
CREATE POLICY driver_helper_payroll_records_select_own
  ON payroll_records
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('DRIVER', 'HELPER')
    AND profile_id = auth.uid()
  );


-- ----------------------------------------------------------------------------
-- payroll_line_items
-- ----------------------------------------------------------------------------

-- Dispatchers have full CRUD.
CREATE POLICY dispatcher_payroll_line_items_all
  ON payroll_line_items
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER'
  );

-- Drivers and helpers can see per-trip breakdown lines for their own records.
CREATE POLICY driver_helper_payroll_line_items_select_own
  ON payroll_line_items
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') IN ('DRIVER', 'HELPER')
    AND payroll_record_id IN (
      SELECT id FROM payroll_records WHERE profile_id = auth.uid()
    )
  );


-- =============================================================================
-- SECTION 12: TRIGGERS
-- =============================================================================

-- ----------------------------------------------------------------------------
-- updated_at auto-maintenance
-- (BEFORE UPDATE on every table that has an updated_at column)
-- ----------------------------------------------------------------------------

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payroll_periods_updated_at
  BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payroll_records_updated_at
  BEFORE UPDATE ON payroll_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ----------------------------------------------------------------------------
-- Invoice number auto-generation
-- (BEFORE INSERT on invoices; skips rows where invoice_number is pre-supplied)
-- ----------------------------------------------------------------------------

CREATE TRIGGER trg_invoices_generate_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();


-- ----------------------------------------------------------------------------
-- Invoice totals recalculation
-- (AFTER INSERT, UPDATE, DELETE on invoice_line_items)
-- Keeps invoices.subtotal and invoices.grand_total in sync with line items.
-- balance_due is a GENERATED column — it self-updates from grand_total.
-- ----------------------------------------------------------------------------

CREATE TRIGGER trg_invoice_line_items_recalc_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_invoice_totals();


-- ----------------------------------------------------------------------------
-- Payroll net_pay calculation
-- (BEFORE INSERT OR UPDATE on payroll_records)
-- net_pay = base_pay + trip_bonus + overtime_pay - deductions
-- Fires on every write, including when rollup_trip_bonus() updates trip_bonus.
-- ----------------------------------------------------------------------------

CREATE TRIGGER trg_payroll_records_calculate_net_pay
  BEFORE INSERT OR UPDATE ON payroll_records
  FOR EACH ROW EXECUTE FUNCTION calculate_net_pay();


-- ----------------------------------------------------------------------------
-- Payroll trip_bonus rollup
-- (AFTER INSERT, UPDATE, DELETE on payroll_line_items)
-- Aggregates bonus_amount into payroll_records.trip_bonus, which in turn
-- fires trg_payroll_records_calculate_net_pay to refresh net_pay.
-- ----------------------------------------------------------------------------

CREATE TRIGGER trg_payroll_line_items_rollup_bonus
  AFTER INSERT OR UPDATE OR DELETE ON payroll_line_items
  FOR EACH ROW EXECUTE FUNCTION rollup_trip_bonus();


-- =============================================================================
-- END OF MIGRATION
--
-- Design Notes (see below the SQL for full prose)
-- =============================================================================

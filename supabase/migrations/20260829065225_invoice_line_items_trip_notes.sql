-- Add trip traceability and per-line-item notes to invoice_line_items
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes   text;

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_trip_id ON invoice_line_items (trip_id);

SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_net_pay()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.net_pay := NEW.base_pay + NEW.trip_bonus + NEW.overtime_pay - NEW.deductions;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number :=
      'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
      LPAD(nextval('invoice_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email, 'FleetMan user'),
    COALESCE((NEW.raw_app_meta_data ->> 'user_role')::public.user_role, 'CLIENT')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_rls_policies()
  RETURNS TABLE (
    schemaname text,
    tablename  text,
    policyname text,
    cmd        text,
    roles      text[],
    permissive text
  )
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT schemaname, tablename, policyname, cmd, roles, permissive
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_invoice_totals()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.rollup_trip_bonus()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$;


-- Reconstructed from the hosted project's verbose Supabase MCP metadata.
-- This consolidates the hosted core schema through migration 20260827084137
-- so a clean local stack can apply the later finance migration.
--
-- CORRECTION (2026-08-28, wave-1 test implementation): the original reconstruction
-- swapped enum members between request_status and trip_status -- request_status
-- had expense_status's 'REJECTED' instead of 'DISPATCHED'/'COMPLETED', and
-- trip_status had an extra 'DISPATCHED' that is actually a request_status value
-- (set by dashboard/trips/actions.ts when a trip reaches IN_PROGRESS). Values below
-- are corrected to match packages/shared/src/schemas/{request,trip}.schema.ts
-- exactly. Please verify directly against the hosted project when possible --
-- this was not re-checked against a live connection (no DB access from this shell).

CREATE TYPE public.user_role AS ENUM ('CLIENT', 'DISPATCHER', 'DRIVER', 'HELPER');
CREATE TYPE public.request_status AS ENUM ('PENDING', 'ACCEPTED', 'DISPATCHED', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.trip_status AS ENUM (
  'ASSIGNED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'CANCELLED'
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'CLIENT',
  contact_info text,
  license_number text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number text NOT NULL UNIQUE,
  truck_type text NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  trucking text
);

CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles (id),
  truck_type_requested text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  status public.request_status DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now(),
  notes text,
  cargo_handling_tags text[] NOT NULL
    CHECK (cargo_handling_tags <@ ARRAY['DRY_GOODS', 'FROZEN', 'FRAGILE', 'PERISHABLE', 'HAZMAT']::text[]),
  cargo_weight numeric NOT NULL,
  cargo_length numeric,
  cargo_width numeric,
  cargo_height numeric,
  cargo_measurement_mode text NOT NULL
    CHECK (cargo_measurement_mode = ANY (ARRAY['PER_ITEM', 'WHOLE']::text[]))
);

CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.requests (id),
  dispatcher_id uuid REFERENCES public.profiles (id),
  truck_id uuid REFERENCES public.trucks (id),
  driver_id uuid REFERENCES public.profiles (id),
  helper_id uuid REFERENCES public.profiles (id),
  status public.trip_status DEFAULT 'ASSIGNED',
  dispatched_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests (id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  address text NOT NULL,
  latitude numeric,
  longitude numeric,
  arrival_time timestamptz,
  departure_time timestamptz,
  created_at timestamptz DEFAULT now(),
  stop_type text NOT NULL CHECK (stop_type = ANY (ARRAY['PICKUP', 'DROPOFF']::text[])),
  contact_name text,
  contact_phone text
);

CREATE INDEX idx_requests_client_id ON public.requests (client_id);
CREATE INDEX idx_requests_status ON public.requests (status);
CREATE INDEX idx_stops_request_sequence ON public.stops (request_id, sequence);
CREATE INDEX idx_trips_driver_id ON public.trips (driver_id);
CREATE INDEX idx_trips_helper_id ON public.trips (helper_id);
CREATE INDEX idx_trips_status ON public.trips (status);
CREATE INDEX idx_trips_truck_id ON public.trips (truck_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY dispatcher_profiles_all ON public.profiles
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER');
CREATE POLICY users_profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);

CREATE POLICY dispatcher_trucks_all ON public.trucks
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER');

CREATE POLICY dispatcher_requests_all ON public.requests
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER');
CREATE POLICY client_requests_select_own ON public.requests
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'CLIENT'
    AND client_id = (SELECT auth.uid())
  );
CREATE POLICY client_requests_insert_own ON public.requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'CLIENT'
    AND client_id = (SELECT auth.uid())
    AND status = 'PENDING'
  );
CREATE POLICY client_requests_update_pending_own ON public.requests
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'CLIENT'
    AND client_id = (SELECT auth.uid())
    AND status = 'PENDING'
  )
  WITH CHECK (
    client_id = (SELECT auth.uid())
    AND status = 'PENDING'
  );
CREATE POLICY client_requests_delete_pending_own ON public.requests
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'CLIENT'
    AND client_id = (SELECT auth.uid())
    AND status = 'PENDING'
  );

CREATE POLICY dispatcher_trips_all ON public.trips
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER');
CREATE POLICY driver_trips_select_assigned ON public.trips
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DRIVER'
    AND driver_id = (SELECT auth.uid())
  );
CREATE POLICY helper_trips_select_assigned ON public.trips
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') = 'HELPER'
    AND helper_id = (SELECT auth.uid())
  );

CREATE POLICY dispatcher_stops_all ON public.stops
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'user_role') = 'DISPATCHER');
CREATE POLICY client_stops_select_own ON public.stops
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = stops.request_id
        AND requests.client_id = (SELECT auth.uid())
    )
  );
CREATE POLICY client_stops_insert_own ON public.stops
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = stops.request_id
        AND requests.client_id = (SELECT auth.uid())
        AND requests.status = 'PENDING'
    )
  );

GRANT ALL ON TABLE public.profiles, public.trucks, public.requests, public.trips, public.stops
  TO authenticated, service_role;
GRANT USAGE ON TYPE public.user_role, public.request_status, public.trip_status
  TO authenticated, service_role;

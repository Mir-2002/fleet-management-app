-- Test-only infrastructure for Spec 05 (RLS policy matrix). Exposes a
-- SECURITY DEFINER function so the test harness can introspect pg_policies
-- through the normal supabase-js RPC path instead of needing a raw psql
-- connection. Restricted to service_role -- not reachable by any app role.
--
-- Safe to keep in the schema (read-only, no data access, no elevated write
-- capability), but if that's ever a concern, this is intentionally its own
-- migration file so it can be dropped independently of the real schema.

CREATE OR REPLACE FUNCTION public.list_rls_policies()
RETURNS TABLE (
  schemaname text,
  tablename text,
  policyname text,
  cmd text,
  roles text[],
  permissive text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT schemaname, tablename, policyname, cmd, roles, permissive
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
$$;

REVOKE ALL ON FUNCTION public.list_rls_policies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_rls_policies() TO service_role;

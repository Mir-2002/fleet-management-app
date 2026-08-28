// Shared harness for RLS and DB-backed integration tests. Talks to a LOCAL
// Supabase stack only (`supabase start`, see testing/00-INFRASTRUCTURE.md) —
// deliberately does NOT fall back to apps/web/.env.local, since that file may
// point at the live hosted project. Missing env vars fail loudly instead of
// silently defaulting to something that could touch production data.
//
// Run `npm run db:test:reset` before using this harness so the fixture users
// in testing/fixtures.mjs actually exist.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { FIXTURE_USERS } from "../fixtures.mjs";

type FixtureUserKey = keyof typeof FIXTURE_USERS;

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
// Supabase's modern CLI/dashboard naming is "publishable" (client-safe) / "secret" (admin) key,
// replacing the older "anon" / "service_role" labels for the same two keys. We read the modern
// names first and fall back to the legacy ones so either `supabase status` output style works.
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Run \`supabase start\` then \`supabase status\` and export ` +
        `the printed keys (SUPABASE_PUBLISHABLE_KEY=<publishable/anon key>, SUPABASE_SECRET_KEY=<secret/service_role key>) ` +
        `before running integration/RLS tests. SUPABASE_URL defaults to http://127.0.0.1:54321.`
    );
  }
  return value;
}

/** Secret-key client — bypasses RLS. Use only for test setup/teardown, never for assertions. */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, requireEnv("SUPABASE_SECRET_KEY", SUPABASE_SECRET_KEY), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const roleClientCache = new Map<FixtureUserKey, SupabaseClient>();

/**
 * A real, signed-in client for one of the seeded fixture users (see
 * testing/fixtures.mjs), authenticated through the same anon-key +
 * signInWithPassword flow the app itself uses — so RLS is actually
 * evaluated, not bypassed. Cached per fixture key within a test run.
 */
export async function clientFor(userKey: FixtureUserKey): Promise<SupabaseClient> {
  const cached = roleClientCache.get(userKey);
  if (cached) return cached;

  const user = FIXTURE_USERS[userKey];
  const client = createClient(SUPABASE_URL, requireEnv("SUPABASE_PUBLISHABLE_KEY", SUPABASE_PUBLISHABLE_KEY), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) {
    throw new Error(`Could not sign in fixture user ${userKey} (${user.email}): ${error.message}`);
  }

  roleClientCache.set(userKey, client);
  return client;
}

/** An unauthenticated client, for asserting anonymous access is denied. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, requireEnv("SUPABASE_PUBLISHABLE_KEY", SUPABASE_PUBLISHABLE_KEY), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function userId(userKey: FixtureUserKey): Promise<string> {
  const client = await clientFor(userKey);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error(`Could not resolve user id for ${userKey}`);
  return data.user.id;
}

export { FIXTURE_USERS };

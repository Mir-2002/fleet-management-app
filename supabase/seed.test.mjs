// Seed script for the local test database. Run via `npm run db:test:reset`
// (which runs `supabase db reset` first, applying every migration, then this
// script) so integration/RLS tests always start from a known, deterministic
// state. Not for the hosted project — see supabase/seed.mjs for that.

import { createClient } from '@supabase/supabase-js'
import { FIXTURE_USERS, FIXTURE_TRUCKS } from '../testing/fixtures.mjs'

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'SUPABASE_SERVICE_ROLE_KEY is not set. Run `supabase status` after ' +
    '`supabase start` and export the printed service_role key, e.g.\n' +
    '  export SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>\n' +
    '(SUPABASE_URL defaults to http://127.0.0.1:54321, the standard local API URL.)'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function seedUser(key, user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    app_metadata: { user_role: user.role },
    user_metadata: { full_name: user.fullName },
  })

  if (error) {
    console.error(`Failed to create fixture user ${key} (${user.email}):`, error.message)
    process.exitCode = 1
    return null
  }

  // The on_auth_user_created trigger (see baseline migration) already inserts
  // a matching profiles row from app_metadata/user_metadata; this upsert just
  // fills in fields the trigger doesn't set (license_number) and is a no-op
  // otherwise, matching the app's own createDriverAction/createClientAction
  // pattern of upserting profiles after auth.admin.createUser.
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    full_name: user.fullName,
    role: user.role,
    license_number: user.licenseNumber ?? null,
  })

  if (profileError) {
    console.error(`Failed to upsert profile for ${key}:`, profileError.message)
    process.exitCode = 1
    return null
  }

  console.log(`Seeded ${key}: ${user.email} | id: ${data.user.id} | role: ${user.role}`)
  return data.user.id
}

async function seedTrucks() {
  const { error } = await supabase.from('trucks').insert(
    FIXTURE_TRUCKS.map((t) => ({
      plate_number: t.plateNumber,
      truck_type: t.truckType,
      is_available: t.isAvailable,
    }))
  )

  if (error) {
    console.error('Failed to seed trucks:', error.message)
    process.exitCode = 1
    return
  }

  console.log(`Seeded ${FIXTURE_TRUCKS.length} trucks.`)
}

for (const [key, user] of Object.entries(FIXTURE_USERS)) {
  await seedUser(key, user)
}
await seedTrucks()

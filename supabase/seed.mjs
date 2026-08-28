import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const users = [
  {
    email: 'dispatcher@fleetman.com',
    password: 'password123',
    user_metadata: { full_name: 'Dispatcher Dave', user_role: 'DISPATCHER' },
    app_metadata: { user_role: 'DISPATCHER' },
  },
  {
    email: 'driver@fleetman.com',
    password: 'password123',
    user_metadata: { full_name: 'Driver Dan', user_role: 'DRIVER' },
    app_metadata: { user_role: 'DRIVER' },
  },
]

for (const user of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
  })

  if (error) {
    console.error(`Failed to create ${user.email}:`, error.message)
    continue
  }

  console.log(`Created ${user.email} | id: ${data.user.id} | app_metadata:`, data.user.app_metadata)
}

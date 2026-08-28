'use server'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  console.log('[login] attempt:', email)

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: formData.get('password') as string,
  })

  if (error) {
    console.log('[login] auth error:', error.message)
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  const role = data.user?.app_metadata?.user_role
  console.log('[login] user id:', data.user?.id, '| role:', role)

  if (role !== 'DISPATCHER') {
    console.log('[login] unauthorized role — signing out and redirecting')
    await supabase.auth.signOut()
    redirect('/login?error=unauthorized')
  }

  console.log('[login] success — redirecting to /dashboard')
  redirect('/dashboard')
}

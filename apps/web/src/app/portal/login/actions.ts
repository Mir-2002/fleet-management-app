'use server'

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function portalLogin(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    redirect(`/portal/login?error=${encodeURIComponent(error.message)}`)
  }

  if (data.user?.app_metadata?.user_role !== 'CLIENT') {
    await supabase.auth.signOut()
    redirect('/portal/login?error=unauthorized')
  }

  redirect('/portal/requests')
}

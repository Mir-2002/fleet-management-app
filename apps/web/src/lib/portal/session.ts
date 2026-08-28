import { redirect } from "next/navigation"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export type ClientSession = {
  user: User
  supabase: SupabaseClient
}

export async function requireClientSession(): Promise<ClientSession> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.user_role !== 'CLIENT') {
    redirect('/portal/login')
  }

  return { user, supabase }
}

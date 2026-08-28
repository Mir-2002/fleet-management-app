'use server'

import { revalidatePath } from "next/cache"
import { CreateHelperSchema, CreateHelperInput, UpdateHelperSchema, UpdateHelperInput } from "@fleetman/shared"
import { createAdminClient } from "@/lib/supabase/admin"

export async function createHelperAction(data: CreateHelperInput) {
  const parsed = CreateHelperSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Invalid data" }

  const supabase = createAdminClient()

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  })

  if (authError) return { success: false as const, error: authError.message }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authUser.user.id,
    full_name: parsed.data.fullName,
    contact_info: parsed.data.contactInfo,
    role: 'HELPER',
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id)
    return { success: false as const, error: profileError.message }
  }

  revalidatePath('/dashboard/resources/helpers')
  return { success: true as const }
}

export async function updateHelperAction(id: string, data: UpdateHelperInput) {
  const parsed = UpdateHelperSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.errors[0]?.message ?? "Invalid data" }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.fullName, contact_info: parsed.data.contactInfo })
    .eq('id', id)

  if (error) return { success: false as const, error: error.message }
  revalidatePath('/dashboard/resources/helpers')
  return { success: true as const }
}

export async function deleteHelperAction(id: string) {
  const supabase = createAdminClient()

  const { data: trips } = await supabase
    .from('trips')
    .select('id')
    .eq('helper_id', id)
    .limit(1)
  if (trips && trips.length > 0)
    return { success: false as const, error: 'This helper has associated trips and cannot be deleted.' }

  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return { success: false as const, error: error.message }
  revalidatePath('/dashboard/resources/helpers')
  return { success: true as const }
}

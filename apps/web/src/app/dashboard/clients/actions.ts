'use server'

import { revalidatePath } from "next/cache"
import { CreateClientSchema, CreateClientInput, UpdateClientSchema, UpdateClientInput } from "@fleetman/shared"
import { createAdminClient } from "@/lib/supabase/admin"

export async function createClientAction(data: CreateClientInput) {
  const parsed = CreateClientSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Invalid data" }

  const supabase = createAdminClient()

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    app_metadata: { user_role: 'CLIENT' },
  })

  if (authError) return { success: false as const, error: authError.message }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authUser.user.id,
    full_name: parsed.data.fullName,
    contact_info: parsed.data.contactInfo,
    role: 'CLIENT',
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id)
    return { success: false as const, error: profileError.message }
  }

  revalidatePath('/dashboard/clients')
  return { success: true as const }
}

export async function updateClientAction(id: string, data: UpdateClientInput) {
  const parsed = UpdateClientSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: parsed.error.errors[0]?.message ?? "Invalid data" }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.fullName, contact_info: parsed.data.contactInfo })
    .eq('id', id)

  if (error) return { success: false as const, error: error.message }
  revalidatePath('/dashboard/clients')
  return { success: true as const }
}

export async function deleteClientAction(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return { success: false as const, error: error.message }
  revalidatePath('/dashboard/clients')
  return { success: true as const }
}

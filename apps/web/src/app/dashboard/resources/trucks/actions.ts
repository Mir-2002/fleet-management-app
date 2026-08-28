'use server'

import { revalidatePath } from "next/cache"
import { CreateTruckSchema, CreateTruckInput, UpdateTruckSchema, UpdateTruckInput } from "@fleetman/shared"
import { createClient } from "@/lib/supabase/server"

export async function createTruckAction(data: CreateTruckInput) {
  const parsed = CreateTruckSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Invalid data" }

  const supabase = await createClient()
  const { error } = await supabase.from('trucks').insert({
    plate_number: parsed.data.plateNumber,
    truck_type: parsed.data.truckType,
    is_available: true,
    trucking: parsed.data.trucking ?? null,
  })

  if (error) return { success: false as const, error: error.message }
  revalidatePath('/dashboard/resources/trucks')
  return { success: true as const }
}

export async function updateTruckAction(id: string, data: UpdateTruckInput) {
  const parsed = UpdateTruckSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Invalid data" }

  const supabase = await createClient()
  const { error } = await supabase
    .from('trucks')
    .update({
      truck_type: parsed.data.truckType,
      is_available: parsed.data.isAvailable,
      trucking: parsed.data.trucking ?? null,
    })
    .eq('id', id)

  if (error) return { success: false as const, error: error.message }
  revalidatePath('/dashboard/resources/trucks')
  return { success: true as const }
}

export async function deleteTruckAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('trucks').delete().eq('id', id)
  if (error) return { success: false as const, error: error.message }
  revalidatePath('/dashboard/resources/trucks')
  return { success: true as const }
}

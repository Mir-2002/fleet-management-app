'use server'

import { revalidatePath } from "next/cache"
import { CreateRequestSchema, CreateRequestInput, UpdateRequestSchema, UpdateRequestInput } from "@fleetman/shared"
import { createClient } from "@/lib/supabase/server"

export async function createRequestAction(data: CreateRequestInput, autoAccept: boolean = false) {
  const parsed = CreateRequestSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Invalid data" }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (new Date(parsed.data.scheduledDate) < today) {
    return { success: false as const, error: 'Scheduled date cannot be in the past.' }
  }

  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      client_id: parsed.data.clientId,
      cargo_handling_tags: parsed.data.cargoHandlingTags,
      cargo_weight: parsed.data.cargoWeight,
      cargo_length: parsed.data.cargoLength ?? null,
      cargo_width: parsed.data.cargoWidth ?? null,
      cargo_height: parsed.data.cargoHeight ?? null,
      cargo_measurement_mode: parsed.data.cargoMeasurementMode,
      truck_type_requested: parsed.data.truckTypeRequested,
      scheduled_date: parsed.data.scheduledDate,
      scheduled_time: parsed.data.scheduledTime,
      status: autoAccept ? 'ACCEPTED' : 'PENDING',
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single()

  if (requestError) return { success: false as const, error: requestError.message }

  const stopsData = parsed.data.stops.map((stop, i) => ({
    request_id: request.id,
    sequence: i + 1,
    stop_type: stop.stopType,
    address: stop.address,
    contact_name: stop.contactName || null,
    contact_phone: stop.contactPhone || null,
    ...(stop.latitude !== undefined && { latitude: stop.latitude }),
    ...(stop.longitude !== undefined && { longitude: stop.longitude }),
  }))

  const { error: stopsError } = await supabase.from('stops').insert(stopsData)
  if (stopsError) return { success: false as const, error: stopsError.message }

  if (autoAccept) {
    const { error: tripError } = await supabase
      .from('trips')
      .insert({ request_id: request.id, status: 'ASSIGNED' })
    if (tripError) return { success: false as const, error: tripError.message }
    revalidatePath('/dashboard')
  }

  revalidatePath('/dashboard/requests')
  return { success: true as const }
}

export async function acceptRequestAction(requestId: string) {
  const supabase = await createClient()

  const { error: updateError } = await supabase
    .from('requests')
    .update({ status: 'ACCEPTED' })
    .eq('id', requestId)

  if (updateError) return { success: false as const, error: updateError.message }

  const { error: tripError } = await supabase
    .from('trips')
    .insert({ request_id: requestId, status: 'ASSIGNED' })

  if (tripError) return { success: false as const, error: tripError.message }

  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard')
  return { success: true as const }
}

export async function updateRequestAction(id: string, data: UpdateRequestInput) {
  const parsed = UpdateRequestSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Invalid data" }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('requests')
    .select('status')
    .eq('id', id)
    .single()

  if (existing?.status !== 'PENDING')
    return { success: false as const, error: 'Only pending requests can be edited.' }

  const { error } = await supabase
    .from('requests')
    .update({
      cargo_handling_tags: parsed.data.cargoHandlingTags,
      cargo_weight: parsed.data.cargoWeight,
      cargo_length: parsed.data.cargoLength ?? null,
      cargo_width: parsed.data.cargoWidth ?? null,
      cargo_height: parsed.data.cargoHeight ?? null,
      cargo_measurement_mode: parsed.data.cargoMeasurementMode,
      truck_type_requested: parsed.data.truckTypeRequested,
      scheduled_date: parsed.data.scheduledDate,
      scheduled_time: parsed.data.scheduledTime,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', id)

  if (error) return { success: false as const, error: error.message }
  revalidatePath('/dashboard/requests')
  return { success: true as const }
}

export async function deleteRequestAction(id: string) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('requests')
    .select('status')
    .eq('id', id)
    .single()

  if (existing?.status !== 'PENDING')
    return { success: false as const, error: 'Only pending requests can be deleted.' }

  const { error } = await supabase.from('requests').delete().eq('id', id)
  if (error) return { success: false as const, error: error.message }
  revalidatePath('/dashboard/requests')
  return { success: true as const }
}

export async function getStopsForRequestAction(requestId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stops')
    .select('sequence, stop_type, address, contact_name, contact_phone')
    .eq('request_id', requestId)
    .order('sequence')
  return (data ?? []) as {
    sequence: number
    stop_type: string
    address: string
    contact_name: string | null
    contact_phone: string | null
  }[]
}

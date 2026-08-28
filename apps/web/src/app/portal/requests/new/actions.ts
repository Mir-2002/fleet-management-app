'use server'

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { CreateRequestSchema } from "@fleetman/shared"
import { requireClientSession } from "@/lib/portal/session"

type PortalStopData = {
  sequence: number
  stopType: string
  address: string
  contactName?: string
  contactPhone?: string
}

type PortalRequestFormData = {
  cargoHandlingTags: string[]
  cargoWeight: number
  cargoLength?: number | null
  cargoWidth?: number | null
  cargoHeight?: number | null
  cargoMeasurementMode: string
  truckTypeRequested: string
  scheduledDate: string
  scheduledTime: string
  stops: PortalStopData[]
  notes?: string
}

export async function portalCreateRequestAction(data: PortalRequestFormData) {
  const { user, supabase } = await requireClientSession()

  const parsed = CreateRequestSchema.safeParse({ ...data, clientId: user.id })
  if (!parsed.success) return { success: false as const, error: "Invalid data" }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (new Date(parsed.data.scheduledDate) < today) {
    return { success: false as const, error: 'Scheduled date cannot be in the past.' }
  }

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      client_id: user.id,
      cargo_handling_tags: parsed.data.cargoHandlingTags,
      cargo_weight: parsed.data.cargoWeight,
      cargo_length: parsed.data.cargoLength ?? null,
      cargo_width: parsed.data.cargoWidth ?? null,
      cargo_height: parsed.data.cargoHeight ?? null,
      cargo_measurement_mode: parsed.data.cargoMeasurementMode,
      truck_type_requested: parsed.data.truckTypeRequested,
      scheduled_date: parsed.data.scheduledDate,
      scheduled_time: parsed.data.scheduledTime,
      status: 'PENDING',
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
  }))

  const { error: stopsError } = await supabase.from('stops').insert(stopsData)
  if (stopsError) return { success: false as const, error: stopsError.message }

  revalidatePath('/portal/requests')
  redirect('/portal/requests')
}

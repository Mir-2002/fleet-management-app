'use server'

import { revalidatePath } from "next/cache"
import { canTransitionTripStatus, TripStatus } from "@fleetman/shared"
import { createClient } from "@/lib/supabase/server"

export async function updateTripStatusAction(tripId: string, status: TripStatus) {
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('request_id, status, truck_id, driver_id, helper_id')
    .eq('id', tripId)
    .single()

  if (!trip || !canTransitionTripStatus(trip.status as TripStatus, status)) {
    return { success: false as const, error: 'Cannot move a trip backwards.' }
  }

  if (status === 'IN_PROGRESS') {
    if (!trip?.truck_id || !trip?.driver_id || !trip?.helper_id) {
      return { success: false as const, error: 'Assign a truck, driver, and helper before starting this trip.' }
    }
  }

  const { error } = await supabase
    .from('trips')
    .update({ status })
    .eq('id', tripId)

  if (error) return { success: false as const, error: error.message }

  if ((status === 'DELIVERED' || status === 'COMPLETED') && trip?.truck_id) {
    await supabase.from('trucks').update({ is_available: true }).eq('id', trip.truck_id)
    revalidatePath('/dashboard/resources/trucks')
  }

  if (trip?.request_id) {
    if (status === 'IN_PROGRESS') {
      await supabase.from('requests').update({ status: 'DISPATCHED' }).eq('id', trip.request_id)
    } else if (status === 'COMPLETED') {
      await supabase.from('requests').update({ status: 'COMPLETED' }).eq('id', trip.request_id)
    }
    revalidatePath('/dashboard/requests')
  }

  revalidatePath('/dashboard')
  return { success: true as const }
}

export async function updateTripAssignmentAction(
  tripId: string,
  data: { truckId: string | null; driverId: string | null; helperId: string | null }
) {
  const supabase = await createClient()

  const { data: currentTrip } = await supabase
    .from('trips')
    .select('truck_id')
    .eq('id', tripId)
    .single()

  const [driverCheck, helperCheck] = await Promise.all([
    data.driverId
      ? supabase
          .from('trips')
          .select('id')
          .in('status', ['ASSIGNED', 'IN_PROGRESS'])
          .eq('driver_id', data.driverId)
          .neq('id', tripId)
          .limit(1)
      : Promise.resolve({ data: [] as { id: string }[] }),
    data.helperId
      ? supabase
          .from('trips')
          .select('id')
          .in('status', ['ASSIGNED', 'IN_PROGRESS'])
          .eq('helper_id', data.helperId)
          .neq('id', tripId)
          .limit(1)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ])

  if (driverCheck.data && driverCheck.data.length > 0)
    return { success: false as const, error: 'This driver is already assigned to another active trip.' }
  if (helperCheck.data && helperCheck.data.length > 0)
    return { success: false as const, error: 'This helper is already assigned to another active trip.' }

  const { error } = await supabase
    .from('trips')
    .update({
      truck_id: data.truckId || null,
      driver_id: data.driverId || null,
      helper_id: data.helperId || null,
    })
    .eq('id', tripId)

  if (error) return { success: false as const, error: error.message }

  const oldTruckId = currentTrip?.truck_id ?? null
  const newTruckId = data.truckId ?? null
  if (oldTruckId !== newTruckId) {
    if (oldTruckId) {
      await supabase.from('trucks').update({ is_available: true }).eq('id', oldTruckId)
    }
    if (newTruckId) {
      await supabase.from('trucks').update({ is_available: false }).eq('id', newTruckId)
    }
    revalidatePath('/dashboard/resources/trucks')
  }

  revalidatePath('/dashboard')
  return { success: true as const }
}

export async function getResourcesForAssignmentAction(currentTripId: string) {
  const supabase = await createClient()

  const [{ data: trucks }, { data: drivers }, { data: helpers }, { data: activeTrips }] =
    await Promise.all([
      supabase.from('trucks').select('id, plate_number, truck_type, is_available').order('plate_number'),
      supabase.from('profiles').select('id, full_name').eq('role', 'DRIVER').order('full_name'),
      supabase.from('profiles').select('id, full_name').eq('role', 'HELPER').order('full_name'),
      supabase
        .from('trips')
        .select('truck_id, driver_id, helper_id')
        .in('status', ['ASSIGNED', 'IN_PROGRESS'])
        .neq('id', currentTripId),
    ])

  const busyTruckIds = new Set(
    activeTrips?.map((t) => t.truck_id).filter(Boolean) ?? []
  )
  const busyDriverIds = new Set(
    activeTrips?.map((t) => t.driver_id).filter(Boolean) ?? []
  )
  const busyHelperIds = new Set(
    activeTrips?.map((t) => t.helper_id).filter(Boolean) ?? []
  )

  return {
    trucks: (trucks ?? []).map((t) => ({
      id: t.id,
      plate_number: t.plate_number,
      truck_type: t.truck_type as string,
      is_available: t.is_available,
      is_on_trip: busyTruckIds.has(t.id),
    })),
    drivers: (drivers ?? []).map((d) => ({
      id: d.id,
      full_name: d.full_name as string,
      is_on_trip: busyDriverIds.has(d.id),
    })),
    helpers: (helpers ?? []).map((h) => ({
      id: h.id,
      full_name: h.full_name as string,
      is_on_trip: busyHelperIds.has(h.id),
    })),
  }
}

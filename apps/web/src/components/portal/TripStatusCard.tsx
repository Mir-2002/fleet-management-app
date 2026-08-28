"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

type TripRow = {
  status: string
  trucks: { plate_number: string } | null
  driver: { full_name: string } | null
  helper: { full_name: string } | null
}

const tripStatusStyles: Record<string, { dot: string; badge: string; label: string }> = {
  ASSIGNED:    { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Awaiting Dispatch" },
  IN_PROGRESS: { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200",       label: "In Transit" },
  DELIVERED:   { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",    label: "Delivered" },
  COMPLETED:   { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",    label: "Completed" },
  CANCELLED:   { dot: "bg-red-400",    badge: "bg-red-50 text-red-600 border-red-200",          label: "Cancelled" },
}

interface TripStatusCardProps {
  requestId: string
  initialTrip: TripRow | null
}

export function TripStatusCard({ requestId, initialTrip }: TripStatusCardProps) {
  const [trip, setTrip] = useState<TripRow | null>(initialTrip)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`trip-status-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `request_id=eq.${requestId}`,
        },
        async () => {
          const { data } = await supabase
            .from('trips')
            .select(`
              status,
              trucks!truck_id (plate_number),
              driver:profiles!driver_id (full_name),
              helper:profiles!helper_id (full_name)
            `)
            .eq('request_id', requestId)
            .single()
          if (data) setTrip(data as unknown as TripRow)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [requestId])

  if (!trip) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Trip Status</p>
        <p className="text-sm text-slate-400">Your request hasn't been dispatched yet. We'll update this once a trip is assigned.</p>
      </div>
    )
  }

  const style = tripStatusStyles[trip.status] ?? { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 border-slate-200", label: trip.status }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trip Status</p>
        <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${style.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Truck</p>
          <p className="text-slate-700 font-medium">
            {trip.trucks?.plate_number ?? <span className="text-slate-400">Not assigned</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Driver</p>
          <p className="text-slate-700 font-medium">
            {trip.driver?.full_name ?? <span className="text-slate-400">Not assigned</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Helper</p>
          <p className="text-slate-700 font-medium">
            {trip.helper?.full_name ?? <span className="text-slate-400">Not assigned</span>}
          </p>
        </div>
      </div>
    </div>
  )
}

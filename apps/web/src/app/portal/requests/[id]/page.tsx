import { notFound } from "next/navigation"
import Link from "next/link"
import { requireClientSession } from "@/lib/portal/session"
import { TripStatusCard } from "@/components/portal/TripStatusCard"

const TAG_LABELS: Record<string, string> = {
  DRY_GOODS: 'Dry Goods',
  FROZEN: 'Frozen',
  FRAGILE: 'Fragile',
  PERISHABLE: 'Perishable',
  HAZMAT: 'Hazmat',
}

const STOP_TYPE_STYLES: Record<string, string> = {
  PICKUP:  "border-indigo-200 bg-indigo-50 text-indigo-700",
  DROPOFF: "border-green-200 bg-green-50 text-green-700",
}

const requestStatusStyles: Record<string, { dot: string; badge: string; label: string }> = {
  PENDING:    { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",    label: "Pending Review" },
  ACCEPTED:   { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Accepted" },
  DISPATCHED: { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200",       label: "In Transit" },
  COMPLETED:  { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",    label: "Completed" },
  CANCELLED:  { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Cancelled" },
}

export default async function PortalRequestDetailPage({ params }: { params: { id: string } }) {
  const { user, supabase } = await requireClientSession()

  const [{ data: request }, { data: stopsData }, { data: tripData }] = await Promise.all([
    supabase
      .from('requests')
      .select('id, cargo_handling_tags, cargo_weight, cargo_length, cargo_width, cargo_height, cargo_measurement_mode, truck_type_requested, scheduled_date, scheduled_time, status, notes, created_at')
      .eq('id', params.id)
      .eq('client_id', user.id)
      .single(),
    supabase
      .from('stops')
      .select('sequence, stop_type, address, contact_name, contact_phone')
      .eq('request_id', params.id)
      .order('sequence'),
    supabase
      .from('trips')
      .select(`
        status,
        trucks!truck_id (plate_number),
        driver:profiles!driver_id (full_name),
        helper:profiles!helper_id (full_name)
      `)
      .eq('request_id', params.id)
      .single(),
  ])

  if (!request) notFound()

  const stops = (stopsData ?? []) as {
    sequence: number
    stop_type: string
    address: string
    contact_name: string | null
    contact_phone: string | null
  }[]

  const defaultStatusStyle = { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 border-slate-200", label: "Unknown" }
  const style = requestStatusStyles[request.status] ?? defaultStatusStyle

  const trip = tripData as {
    status: string
    trucks: { plate_number: string } | null
    driver: { full_name: string } | null
    helper: { full_name: string } | null
  } | null

  const hasDimensions =
    request.cargo_length != null &&
    request.cargo_width != null &&
    request.cargo_height != null

  const tagSummary = (request.cargo_handling_tags ?? [])
    .map((t: string) => TAG_LABELS[t] ?? t)
    .join(', ')

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/portal/requests" className="text-sm text-slate-400 hover:text-slate-600">
          ← My Requests
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{tagSummary || 'Shipment Request'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Submitted {new Date(request.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium ${style.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      <TripStatusCard requestId={request.id} initialTrip={trip} />

      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cargo Details</p>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-1">Handling Type</p>
            <div className="flex flex-wrap gap-1.5">
              {(request.cargo_handling_tags ?? []).map((tag: string) => (
                <span
                  key={tag}
                  className={[
                    "rounded-sm border px-2 py-0.5 text-xs font-medium",
                    tag === 'HAZMAT'
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-slate-50 text-slate-600",
                  ].join(" ")}
                >
                  {TAG_LABELS[tag] ?? tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Weight</p>
              <p className="text-slate-700">
                {request.cargo_weight} kg
                <span className="text-slate-400 text-xs ml-1.5">
                  ({request.cargo_measurement_mode === 'PER_ITEM' ? 'per item' : 'whole cargo'})
                </span>
              </p>
            </div>
            {hasDimensions && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Dimensions</p>
                <p className="text-slate-700">
                  {request.cargo_length} × {request.cargo_width} × {request.cargo_height} cm
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Truck Type</p>
              <p className="text-slate-700">{request.truck_type_requested}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Scheduled</p>
              <p className="text-slate-700">
                {request.scheduled_date
                  ? new Date(request.scheduled_date).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })
                  : "—"}
                {request.scheduled_time && ` at ${request.scheduled_time}`}
              </p>
            </div>
          </div>
        </div>

        {request.notes && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-400 mb-0.5">Notes</p>
            <p className="text-sm text-slate-700">{request.notes}</p>
          </div>
        )}
      </div>

      {stops.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Route</p>
          <ol className="space-y-3">
            {stops.map((stop) => (
              <li key={stop.sequence} className="flex gap-3 text-sm">
                <span className={`shrink-0 self-start mt-0.5 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${STOP_TYPE_STYLES[stop.stop_type] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  {stop.stop_type === 'PICKUP' ? 'Pickup' : 'Drop Off'}
                </span>
                <div className="min-w-0">
                  <p className="text-slate-700">{stop.address}</p>
                  {stop.contact_name && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {stop.contact_name}{stop.contact_phone ? ` · ${stop.contact_phone}` : ''}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

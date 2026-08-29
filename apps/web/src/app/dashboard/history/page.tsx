import { createClient } from "@/lib/supabase/server"
import { TripHistoryTable } from "@/components/dashboard/TripHistoryTable"
import { PageHeader } from "@/components/dashboard/PageHeader"

type TripRow = {
  id: string
  status: string
  requests: {
    cargo_handling_tags: string[]
    truck_type_requested: string
    scheduled_date: string
    profiles: { full_name: string }[] | { full_name: string } | null
  } | null
  trucks: { plate_number: string } | null
  driver: { full_name: string } | null
  helper: { full_name: string } | null
}

export type HistoryTrip = {
  id: string
  status: string
  clientName: string
  cargoType: string
  truckType: string
  truckPlate: string | null
  driverName: string | null
  helperName: string | null
  scheduledDate: string | null
}

export default async function HistoryPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("trips")
    .select(`
      id, status,
      requests!request_id (
        cargo_handling_tags, truck_type_requested, scheduled_date,
        profiles!client_id (full_name)
      ),
      trucks!truck_id (plate_number),
      driver:profiles!driver_id (full_name),
      helper:profiles!helper_id (full_name)
    `)
    .in("status", ["DELIVERED", "COMPLETED"])
    .order("created_at", { ascending: false })

  const rawTrips = (data as unknown as TripRow[]) ?? []

  const trips: HistoryTrip[] = rawTrips.map((t) => {
    const req = t.requests
    const profilesRaw = req?.profiles
    const clientName = Array.isArray(profilesRaw)
      ? profilesRaw[0]?.full_name ?? "Unknown"
      : (profilesRaw as { full_name: string } | null)?.full_name ?? "Unknown"

    return {
      id: t.id,
      status: t.status,
      clientName,
      cargoType: req?.cargo_handling_tags?.join(", ") ?? "—",
      truckType: req?.truck_type_requested ?? "—",
      truckPlate: t.trucks?.plate_number ?? null,
      driverName: t.driver?.full_name ?? null,
      helperName: t.helper?.full_name ?? null,
      scheduledDate: req?.scheduled_date ?? null,
    }
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Trip History" subtitle="Delivered and completed trips" />

      <div className="flex-1 overflow-auto p-6">
        <TripHistoryTable trips={trips} />
      </div>
    </div>
  )
}

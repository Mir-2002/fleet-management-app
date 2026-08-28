import Link from "next/link"
import { requireClientSession } from "@/lib/portal/session"
import { PortalRequestsTable } from "@/components/portal/PortalRequestsTable"

export default async function PortalRequestsPage() {
  const { user, supabase } = await requireClientSession()

  const { data } = await supabase
    .from('requests')
    .select('id, cargo_handling_tags, cargo_weight, cargo_measurement_mode, truck_type_requested, scheduled_date, scheduled_time, status, created_at')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  const requests = data ?? []

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track all your shipment requests</p>
        </div>
        <Link
          href="/portal/requests/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + New Request
        </Link>
      </div>

      <PortalRequestsTable rows={requests} />
    </div>
  )
}

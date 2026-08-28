import { requireClientSession } from "@/lib/portal/session"
import { PortalNewRequestForm } from "@/components/portal/PortalNewRequestForm"

export default async function PortalNewRequestPage() {
  await requireClientSession()

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">New Request</h1>
        <p className="text-sm text-slate-500 mt-0.5">Fill in your shipment details and we'll get back to you.</p>
      </div>
      <PortalNewRequestForm />
    </div>
  )
}

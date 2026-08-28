import { requireClientSession } from "@/lib/portal/session"
import { PortalInvoicesTable } from "@/components/portal/PortalInvoicesTable"

export default async function PortalInvoicesPage() {
  const { user, supabase } = await requireClientSession()

  const { data } = await supabase
    .from('invoices')
    .select('id, invoice_number, issue_date, due_date, status, grand_total, balance_due, amount_paid')
    .eq('client_id', user.id)
    .not('status', 'eq', 'DRAFT')
    .order('created_at', { ascending: false })

  const invoices = data ?? []

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">My Invoices</h1>
        <p className="text-sm text-slate-500 mt-0.5">View and track your invoices</p>
      </div>
      <PortalInvoicesTable rows={invoices} />
    </div>
  )
}

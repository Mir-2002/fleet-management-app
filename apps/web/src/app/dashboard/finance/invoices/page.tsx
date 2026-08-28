import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { InvoicesTable } from "@/components/dashboard/finance/InvoicesTable"
import { NewInvoiceDialog } from "@/components/dashboard/finance/NewInvoiceDialog"
import { InvoiceKpiCards } from "@/components/dashboard/finance/kpi/InvoiceKpiCards"
import type { InvoiceRow } from "@/components/dashboard/finance/InvoicesTable"

export default async function InvoicesPage() {
  const supabase = await createClient()

  const [
    { data: invoiceData, error },
    { data: clientsData },
    { data: requestsData },
    { data: tripsData },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, client_id, request_id, trip_id, issue_date, due_date, status, grand_total, amount_paid, balance_due, created_at, profiles!client_id(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "CLIENT").order("full_name"),
    supabase.from("requests").select("id, scheduled_date").order("scheduled_date", { ascending: false }),
    supabase.from("trips").select("id").order("created_at", { ascending: false }),
  ])

  if (error) console.error("[invoices] fetch error:", error.message)

  const rows = (invoiceData as unknown as InvoiceRow[]) ?? []
  const clients = (clientsData ?? []) as { id: string; full_name: string }[]
  const requests = (requestsData ?? []) as { id: string; scheduled_date: string }[]

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const sentCount = rows.filter((r) => r.status === "SENT").length
  const overdueCount = rows.filter((r) => r.status === "OVERDUE").length

  const outstanding = rows
    .filter((r) => r.status === "SENT" || r.status === "OVERDUE")
    .reduce((sum, r) => sum + (r.grand_total ?? 0), 0)

  const paidCount = rows.filter((r) => r.status === "PAID").length

  const paidThisMonth = rows
    .filter((r) => {
      if (r.status !== "PAID") return false
      const d = new Date(r.issue_date + "T00:00:00")
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    })
    .reduce((sum, r) => sum + (r.grand_total ?? 0), 0)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Invoices"
        action={<NewInvoiceDialog clients={clients} requests={requests} trips={tripsData ?? []} />}
      />

      <div className="px-6 py-4 border-b border-slate-200 shrink-0">
        <InvoiceKpiCards
          outstanding={outstanding}
          sentCount={sentCount}
          overdueCount={overdueCount}
          paidThisMonth={paidThisMonth}
          totalCount={rows.length}
          paidCount={paidCount}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {rows.length === 0 ? (
          <EmptyState entity="Invoice" />
        ) : (
          <div className="rounded-sm border border-slate-200 overflow-hidden">
            <InvoicesTable rows={rows} clients={clients} requests={requests} />
          </div>
        )}
      </div>
    </div>
  )
}

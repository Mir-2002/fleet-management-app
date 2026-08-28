import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { ExpensesTable } from "@/components/dashboard/finance/ExpensesTable"
import { NewExpenseDialog } from "@/components/dashboard/finance/NewExpenseDialog"
import { ExpenseKpiCards } from "@/components/dashboard/finance/kpi/ExpenseKpiCards"
import type { ExpenseRow } from "@/components/dashboard/finance/ExpensesTable"

const CATEGORY_LABELS: Record<string, string> = {
  FUEL: "Fuel",
  TOLL: "Toll",
  MAINTENANCE: "Maintenance",
  LOADING_UNLOADING: "Loading/Unloading",
  ACCOMMODATION: "Accommodation",
  MISCELLANEOUS: "Misc",
}

export default async function ExpensesPage() {
  const supabase = await createClient()

  const [
    { data: expenseData, error },
    { data: tripsData },
    { data: trucksData },
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, category, trip_id, truck_id, amount, expense_date, description, receipt_url, status, created_at, submitted_by_profile:profiles!submitted_by(full_name), trips(id)")
      .order("expense_date", { ascending: false }),
    supabase
      .from("trips")
      .select("id, request_id, requests(scheduled_date)")
      .order("created_at", { ascending: false }),
    supabase.from("trucks").select("id, plate_number"),
  ])

  if (error) console.error("[expenses] fetch error:", error.message)

  const rows = (expenseData as unknown as ExpenseRow[]) ?? []
  const trips = (tripsData ?? []) as { id: string }[]
  const trucks = (trucksData ?? []) as { id: string; plate_number: string }[]

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const pendingCount = rows.filter((r) => r.status === "PENDING").length

  const approvedThisMonth = rows
    .filter((r) => {
      if (r.status !== "APPROVED") return false
      const d = new Date(r.expense_date + "T00:00:00")
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    })
    .reduce((sum, r) => sum + (r.amount ?? 0), 0)

  const totalThisMonth = rows
    .filter((r) => {
      const d = new Date(r.expense_date + "T00:00:00")
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    })
    .reduce((sum, r) => sum + (r.amount ?? 0), 0)

  const categoryTotals = rows
    .filter((r) => {
      const d = new Date(r.expense_date + "T00:00:00")
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    })
    .reduce<Record<string, number>>((acc, r) => {
      const key = r.category as string
      acc[key] = (acc[key] ?? 0) + (r.amount ?? 0)
      return acc
    }, {})

  const categoryBreakdown = Object.entries(categoryTotals).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] ?? key,
    value,
  }))

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Expenses"
        action={<NewExpenseDialog trips={trips} trucks={trucks} />}
      />

      <div className="px-6 py-4 border-b border-slate-200 shrink-0">
        <ExpenseKpiCards
          pendingCount={pendingCount}
          approvedThisMonth={approvedThisMonth}
          totalThisMonth={totalThisMonth}
          categoryBreakdown={categoryBreakdown}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {rows.length === 0 ? (
          <EmptyState entity="Expense" />
        ) : (
          <div className="rounded-sm border border-slate-200 overflow-hidden">
            <ExpensesTable rows={rows} />
          </div>
        )}
      </div>
    </div>
  )
}

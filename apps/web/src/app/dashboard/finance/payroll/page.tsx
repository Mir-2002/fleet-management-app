import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { PayrollTable } from "@/components/dashboard/finance/PayrollTable"
import { NewPayrollPeriodDialog } from "@/components/dashboard/finance/NewPayrollPeriodDialog"
import { PayrollKpiCards } from "@/components/dashboard/finance/kpi/PayrollKpiCards"
import type { PayrollPeriodRow } from "@/components/dashboard/finance/PayrollTable"

export default async function PayrollPage() {
  const supabase = await createClient()

  const [
    { data: periodsData, error },
    { data: driversData },
    { data: helpersData },
  ] = await Promise.all([
    supabase
      .from("payroll_periods")
      .select("id, period_start, period_end, status, created_at, prepared_by_profile:profiles!prepared_by(full_name), payroll_records(id, profile_id, net_pay, payment_date, profiles!profile_id(role, full_name))")
      .order("period_start", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "DRIVER")
      .order("full_name"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "HELPER")
      .order("full_name"),
  ])

  if (error) console.error("[payroll] fetch error:", error.message)

  const rows = (periodsData as unknown as PayrollPeriodRow[]) ?? []
  const driversProfiles = (driversData ?? []) as { id: string; full_name: string }[]
  const helpersProfiles = (helpersData ?? []) as { id: string; full_name: string }[]

  const openPeriods = rows.filter(
    (r) => r.status === "DRAFT" || r.status === "FINALIZED"
  ).length

  const allRecords = rows.flatMap((r) => r.payroll_records ?? [])

  const driverProfileIds = new Set(
    allRecords
      .filter((rec) => rec.profiles?.role === "DRIVER")
      .map((rec) => rec.profile_id)
  )
  const helperProfileIds = new Set(
    allRecords
      .filter((rec) => rec.profiles?.role === "HELPER")
      .map((rec) => rec.profile_id)
  )

  const totalPayout = allRecords.reduce((sum, rec) => sum + (rec.net_pay ?? 0), 0)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Payroll"
        action={<NewPayrollPeriodDialog />}
      />

      <div className="px-6 py-4 border-b border-border shrink-0">
        <PayrollKpiCards
          openPeriods={openPeriods}
          driverCount={driverProfileIds.size}
          helperCount={helperProfileIds.size}
          totalPayout={totalPayout}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {rows.length === 0 ? (
          <EmptyState entity="Payroll Period" />
        ) : (
          <div className="rounded-sm border border-border overflow-hidden">
            <PayrollTable
              rows={rows}
              driversProfiles={driversProfiles}
              helpersProfiles={helpersProfiles}
            />
          </div>
        )}
      </div>
    </div>
  )
}

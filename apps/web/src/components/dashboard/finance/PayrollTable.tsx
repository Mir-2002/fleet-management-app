"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PayrollPeriodDetailDialog } from "@/components/dashboard/finance/PayrollPeriodDetailDialog"

export type PayrollPeriodRow = {
  id: string
  period_start: string
  period_end: string
  status: string
  created_at: string
  prepared_by_profile: { full_name: string } | null
  payroll_records: {
    id: string
    profile_id: string
    net_pay: number
    profiles: { role: string; full_name: string } | null
  }[]
}

interface PayrollTableProps {
  rows: PayrollPeriodRow[]
  driversProfiles: { id: string; full_name: string }[]
  helpersProfiles: { id: string; full_name: string }[]
}

const STATUS_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  DRAFT:     { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",   label: "Draft" },
  FINALIZED: { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Finalized" },
  PAID:      { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",   label: "Paid" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES["DRAFT"]!
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function formatPHP(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${fmt(start)} – ${fmt(end)}`
}

export function PayrollTable({ rows, driversProfiles, helpersProfiles }: PayrollTableProps) {
  const [selected, setSelected] = useState<PayrollPeriodRow | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? rows.filter((r) => {
        const preparedBy = r.prepared_by_profile?.full_name ?? ""
        const range = formatDateRange(r.period_start, r.period_end)
        const q = query.toLowerCase()
        return preparedBy.toLowerCase().includes(q) || range.toLowerCase().includes(q)
      })
    : rows

  return (
    <>
      <div className="px-4 py-3 border-b border-border">
        <Input
          placeholder="Search by period or preparer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Period</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
            <TableHead className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider">Drivers</TableHead>
            <TableHead className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider">Helpers</TableHead>
            <TableHead className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Total Payout</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Prepared By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row) => {
            const records = row.payroll_records ?? []
            const driverCount = records.filter((r) => r.profiles?.role === "DRIVER").length
            const helperCount = records.filter((r) => r.profiles?.role === "HELPER").length
            const totalPayout = records.reduce((sum, r) => sum + (r.net_pay ?? 0), 0)
            return (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => { setSelected(row); setOpen(true) }}
              >
                <TableCell className="px-4 py-3 font-medium">
                  {formatDateRange(row.period_start, row.period_end)}
                </TableCell>
                <TableCell className="px-4 py-3"><StatusBadge status={row.status} /></TableCell>
                <TableCell className="px-4 py-3 text-center text-muted-foreground">{driverCount}</TableCell>
                <TableCell className="px-4 py-3 text-center text-muted-foreground">{helperCount}</TableCell>
                <TableCell className="px-4 py-3 text-right tabular-nums font-medium">{formatPHP(totalPayout)}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{row.prepared_by_profile?.full_name ?? "—"}</TableCell>
              </TableRow>
            )
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {selected && (
        <PayrollPeriodDetailDialog
          row={selected}
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setSelected(null) }}
          driversProfiles={driversProfiles}
          helpersProfiles={helpersProfiles}
        />
      )}
    </>
  )
}

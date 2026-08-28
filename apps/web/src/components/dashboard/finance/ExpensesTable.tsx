"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ExpenseDetailDialog } from "@/components/dashboard/finance/ExpenseDetailDialog"

export type ExpenseRow = {
  id: string
  category: string
  trip_id: string | null
  truck_id: string | null
  amount: number
  expense_date: string
  description: string | null
  receipt_url: string | null
  status: string
  created_at: string
  submitted_by_profile: { full_name: string } | null
}

const STATUS_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  PENDING:  { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",   label: "Pending" },
  APPROVED: { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",   label: "Approved" },
  REJECTED: { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200",          label: "Rejected" },
}

const CATEGORY_LABELS: Record<string, string> = {
  FUEL:               "Fuel",
  TOLL:               "Toll",
  MAINTENANCE:        "Maintenance",
  LOADING_UNLOADING:  "Loading/Unloading",
  ACCOMMODATION:      "Accommodation",
  MISCELLANEOUS:      "Miscellaneous",
}

const CATEGORY_COLORS: Record<string, string> = {
  FUEL:               "bg-blue-50 text-blue-700 border-blue-200",
  TOLL:               "bg-purple-50 text-purple-700 border-purple-200",
  MAINTENANCE:        "bg-orange-50 text-orange-700 border-orange-200",
  LOADING_UNLOADING:  "bg-teal-50 text-teal-700 border-teal-200",
  ACCOMMODATION:      "bg-indigo-50 text-indigo-700 border-indigo-200",
  MISCELLANEOUS:      "bg-slate-100 text-slate-700 border-slate-200",
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES["PENDING"]!
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function CategoryChip({ category }: { category: string }) {
  const label = CATEGORY_LABELS[category] ?? category
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.MISCELLANEOUS
  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium ${color}`}>
      {label}
    </span>
  )
}

function formatPHP(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ExpensesTable({ rows }: { rows: ExpenseRow[] }) {
  const [selected, setSelected] = useState<ExpenseRow | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? rows.filter((r) => {
        const name = r.submitted_by_profile?.full_name ?? ""
        const cat = CATEGORY_LABELS[r.category] ?? r.category
        const q = query.toLowerCase()
        return name.toLowerCase().includes(q) || cat.toLowerCase().includes(q)
      })
    : rows

  return (
    <>
      <div className="px-4 py-3 border-b border-slate-200">
        <Input
          placeholder="Search by submitter or category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Submitted By</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Receipt</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr
              key={row.id}
              className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              onClick={() => { setSelected(row); setOpen(true) }}
            >
              <td className="px-4 py-3 text-slate-500">{row.expense_date ? formatDate(row.expense_date) : "—"}</td>
              <td className="px-4 py-3"><CategoryChip category={row.category} /></td>
              <td className="px-4 py-3 text-slate-900 font-medium">{row.submitted_by_profile?.full_name ?? "—"}</td>
              <td className="px-4 py-3 text-slate-900 text-right tabular-nums font-medium">{formatPHP(row.amount ?? 0)}</td>
              <td className="px-4 py-3 text-center">
                {row.receipt_url ? (
                  <a
                    href={row.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                No results.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selected && (
        <ExpenseDetailDialog
          row={selected}
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setSelected(null) }}
        />
      )}
    </>
  )
}

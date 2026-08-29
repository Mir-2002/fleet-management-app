"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
      <div className="px-4 py-3 border-b border-border">
        <Input
          placeholder="Search by submitter or category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Date</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Category</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Submitted By</TableHead>
            <TableHead className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Amount</TableHead>
            <TableHead className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider">Receipt</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => { setSelected(row); setOpen(true) }}
            >
              <TableCell className="px-4 py-3 text-muted-foreground">{row.expense_date ? formatDate(row.expense_date) : "—"}</TableCell>
              <TableCell className="px-4 py-3"><CategoryChip category={row.category} /></TableCell>
              <TableCell className="px-4 py-3 font-medium">{row.submitted_by_profile?.full_name ?? "—"}</TableCell>
              <TableCell className="px-4 py-3 text-right tabular-nums font-medium">{formatPHP(row.amount ?? 0)}</TableCell>
              <TableCell className="px-4 py-3 text-center">
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
                  <span className="text-muted-foreground/40">—</span>
                )}
              </TableCell>
              <TableCell className="px-4 py-3"><StatusBadge status={row.status} /></TableCell>
            </TableRow>
          ))}
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
        <ExpenseDetailDialog
          row={selected}
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setSelected(null) }}
        />
      )}
    </>
  )
}

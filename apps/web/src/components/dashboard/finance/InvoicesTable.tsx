"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { InvoiceDetailDialog } from "@/components/dashboard/finance/InvoiceDetailDialog"

export type InvoiceRow = {
  id: string
  invoice_number: string
  client_id: string
  request_id: string | null
  trip_id: string | null
  issue_date: string
  due_date: string
  status: string
  grand_total: number
  amount_paid: number
  balance_due: number
  discount_amount: number
  tax_amount: number
  payment_method: string | null
  payment_date: string | null
  payment_reference: string | null
  created_at: string
  profiles: { full_name: string } | null
}

const STATUS_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  DRAFT:     { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Draft" },
  SENT:      { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Sent" },
  PAID:      { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",    label: "Paid" },
  OVERDUE:   { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200",          label: "Overdue" },
  CANCELLED: { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Cancelled" },
  VOID:      { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Void" },
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

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface InvoicesTableProps {
  rows: InvoiceRow[]
  clients: { id: string; full_name: string }[]
  requests: { id: string; scheduled_date: string }[]
}

export function InvoicesTable({ rows, clients, requests }: InvoicesTableProps) {
  const [selected, setSelected] = useState<InvoiceRow | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? rows.filter((r) => {
        const clientName = r.profiles?.full_name ?? ""
        const inv = r.invoice_number ?? ""
        const q = query.toLowerCase()
        return inv.toLowerCase().includes(q) || clientName.toLowerCase().includes(q)
      })
    : rows

  return (
    <>
      <div className="px-4 py-3 border-b border-border">
        <Input
          placeholder="Search by invoice # or client…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Invoice #</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Client</TableHead>
            <TableHead className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Amount</TableHead>
            <TableHead className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Balance Due</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Issued</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Due Date</TableHead>
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
              <TableCell className="px-4 py-3 font-mono text-xs">{row.invoice_number ?? "—"}</TableCell>
              <TableCell className="px-4 py-3 font-medium">{row.profiles?.full_name ?? "—"}</TableCell>
              <TableCell className="px-4 py-3 text-right tabular-nums">{formatPHP(row.grand_total ?? 0)}</TableCell>
              <TableCell className="px-4 py-3 text-right tabular-nums">{formatPHP(row.balance_due ?? 0)}</TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">{row.issue_date ? formatDate(row.issue_date) : "—"}</TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">{row.due_date ? formatDate(row.due_date) : "—"}</TableCell>
              <TableCell className="px-4 py-3"><StatusBadge status={row.status} /></TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {selected && (
        <InvoiceDetailDialog
          row={selected}
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setSelected(null) }}
        />
      )}
    </>
  )
}

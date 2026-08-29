"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RequestDetailDialog, type RequestRow } from "@/components/dashboard/forms/RequestDetailDialog"

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const statusStyles: Record<string, { dot: string; badge: string; label: string }> = {
  PENDING:    { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",   label: "Pending" },
  ACCEPTED:   { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Accepted" },
  DISPATCHED: { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Dispatched" },
  COMPLETED:  { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",   label: "Completed" },
  CANCELLED:  { dot: "bg-muted-foreground",  badge: "bg-muted text-muted-foreground border-border",  label: "Cancelled" },
}

const defaultStyle = { dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border", label: "Unknown" }

const TAG_LABELS: Record<string, string> = {
  DRY_GOODS: 'Dry Goods',
  FROZEN: 'Frozen',
  FRAGILE: 'Fragile',
  PERISHABLE: 'Perishable',
  HAZMAT: 'Hazmat',
}

export function RequestsTable({ rows }: { rows: RequestRow[] }) {
  const [selected, setSelected] = useState<RequestRow | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const filtered = rows.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
    if (!query.trim()) return true
    const tagStr = (r.cargo_handling_tags ?? []).map((t) => TAG_LABELS[t] ?? t).join(' ')
    return [tagStr, r.truck_type_requested, r.profiles?.full_name].filter(Boolean).some((f) =>
      f!.toLowerCase().includes(query.toLowerCase())
    )
  })

  function handleRowClick(row: RequestRow) {
    setSelected(row)
    setOpen(true)
  }

  return (
    <>
      <div className="rounded-sm border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search by client, handling type, or truck type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Client</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Handling</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Truck Type</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row) => {
            const style = statusStyles[row.status ?? ""] ?? defaultStyle
            return (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => handleRowClick(row)}
              >
                <TableCell className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${style.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 font-medium">
                  {row.profiles?.full_name ?? "—"}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(row.cargo_handling_tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className={[
                          "rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
                          tag === 'HAZMAT'
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-border bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {TAG_LABELS[tag] ?? tag}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{row.truck_type_requested}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">
                  {row.scheduled_date ? new Date(row.scheduled_date).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            )
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No requests match your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      </div>

      {selected && (
        <RequestDetailDialog
          row={selected}
          open={open}
          onOpenChange={(val) => {
            setOpen(val)
            if (!val) setSelected(null)
          }}
        />
      )}
    </>
  )
}

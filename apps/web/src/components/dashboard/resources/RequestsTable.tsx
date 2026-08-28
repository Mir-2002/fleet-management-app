"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { RequestDetailDialog, type RequestRow } from "@/components/dashboard/forms/RequestDetailDialog"

const statusStyles: Record<string, { dot: string; badge: string; label: string }> = {
  PENDING:    { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",   label: "Pending" },
  ACCEPTED:   { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Accepted" },
  DISPATCHED: { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Dispatched" },
  COMPLETED:  { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",   label: "Completed" },
  CANCELLED:  { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",  label: "Cancelled" },
}

const defaultStyle = { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 border-slate-200", label: "Unknown" }

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

  const filtered = query.trim()
    ? rows.filter((r) => {
        const tagStr = (r.cargo_handling_tags ?? []).map((t) => TAG_LABELS[t] ?? t).join(' ')
        return [tagStr, r.truck_type_requested, r.profiles?.full_name].filter(Boolean).some((f) =>
          f!.toLowerCase().includes(query.toLowerCase())
        )
      })
    : rows

  function handleRowClick(row: RequestRow) {
    setSelected(row)
    setOpen(true)
  }

  return (
    <>
      <div className="rounded-sm border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <Input
          placeholder="Search by client, handling type, or truck type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Client</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Handling</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Truck Type</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => {
            const style = statusStyles[row.status ?? ""] ?? defaultStyle
            return (
              <tr
                key={row.id}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                onClick={() => handleRowClick(row)}
              >
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${style.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-900 font-medium">
                  {row.profiles?.full_name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(row.cargo_handling_tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className={[
                          "rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
                          tag === 'HAZMAT'
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-50 text-slate-600",
                        ].join(" ")}
                      >
                        {TAG_LABELS[tag] ?? tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{row.truck_type_requested}</td>
                <td className="px-4 py-3 text-slate-500">
                  {row.scheduled_date ? new Date(row.scheduled_date).toLocaleDateString() : "—"}
                </td>
              </tr>
            )
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                No requests match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>

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

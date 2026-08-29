"use client"

import Link from "next/link"

const TAG_LABELS: Record<string, string> = {
  DRY_GOODS: 'Dry Goods',
  FROZEN: 'Frozen',
  FRAGILE: 'Fragile',
  PERISHABLE: 'Perishable',
  HAZMAT: 'Hazmat',
}

type RequestRow = {
  id: string
  cargo_handling_tags: string[]
  cargo_weight: number
  cargo_measurement_mode: string
  truck_type_requested: string
  scheduled_date: string | null
  scheduled_time: string | null
  status: string
  created_at: string
}

const statusStyles: Record<string, { dot: string; badge: string; label: string }> = {
  PENDING:    { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",    label: "Pending Review" },
  ACCEPTED:   { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Accepted" },
  DISPATCHED: { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200",       label: "In Transit" },
  COMPLETED:  { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",    label: "Completed" },
  CANCELLED:  { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Cancelled" },
}

const defaultStyle = { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 border-slate-200", label: "Unknown" }

export function PortalRequestsTable({ rows }: { rows: RequestRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-white py-16 text-center">
        <p className="text-muted-foreground text-sm">No requests yet.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Click "New Request" to submit your first shipment.</p>
      </div>
    )
  }

  return (
    <div className="rounded-sm border border-border bg-white overflow-hidden">
      {rows.map((row, i) => {
        const style = statusStyles[row.status] ?? defaultStyle
        const tagSummary = (row.cargo_handling_tags ?? []).map((t) => TAG_LABELS[t] ?? t).join(', ')
        return (
          <Link
            key={row.id}
            href={`/portal/requests/${row.id}`}
            className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors ${
              i !== 0 ? "border-t border-border/60" : ""
            }`}
          >
            <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium shrink-0 ${style.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{tagSummary || '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {row.truck_type_requested} · {row.cargo_weight} kg
                {row.cargo_measurement_mode === 'PER_ITEM' ? ' per item' : ''}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm text-slate-600">
                {row.scheduled_date
                  ? new Date(row.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              </p>
              {row.scheduled_time && (
                <p className="text-xs text-slate-400">{row.scheduled_time}</p>
              )}
            </div>

            <svg className="h-4 w-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )
      })}
    </div>
  )
}

"use client"

import Link from "next/link"

type InvoiceRow = {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: string
  grand_total: number
  balance_due: number
  amount_paid: number
}

const STATUS_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  SENT:      { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Sent" },
  PAID:      { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",    label: "Paid" },
  OVERDUE:   { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200",          label: "Overdue" },
  CANCELLED: { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Cancelled" },
  VOID:      { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Void" },
}

function formatPHP(amount: number) {
  return `₱${(amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function PortalInvoicesTable({ rows }: { rows: InvoiceRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white py-16 text-center">
        <p className="text-slate-500 text-sm">No invoices yet.</p>
        <p className="text-slate-400 text-xs mt-1">Invoices forwarded to you will appear here.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {rows.map((row, i) => {
        const style = STATUS_STYLES[row.status] ?? STATUS_STYLES["SENT"]!
        const hasBalance = (row.balance_due ?? 0) > 0
        return (
          <Link
            key={row.id}
            href={`/portal/invoices/${row.id}`}
            className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${i !== 0 ? "border-t border-slate-100" : ""}`}
          >
            <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium shrink-0 ${style.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 font-mono">{row.invoice_number}</p>
              <p className="text-xs text-slate-500 mt-0.5">Issued {formatDate(row.issue_date)} · Due {formatDate(row.due_date)}</p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-slate-900 tabular-nums">{formatPHP(row.grand_total)}</p>
              {hasBalance && (
                <p className="text-xs text-red-500 mt-0.5 tabular-nums">Balance: {formatPHP(row.balance_due)}</p>
              )}
              {!hasBalance && row.status === "PAID" && (
                <p className="text-xs text-green-600 mt-0.5">Paid in full</p>
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

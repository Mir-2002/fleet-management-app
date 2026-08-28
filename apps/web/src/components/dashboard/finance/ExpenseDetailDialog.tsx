"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { ExpenseRow } from "@/components/dashboard/finance/ExpensesTable"
import {
  approveExpenseAction,
  rejectExpenseAction,
  deleteExpenseAction,
} from "@/app/dashboard/finance/expenses/actions"

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

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES["PENDING"]!
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function formatPHP(amount: number): string {
  return `₱${(amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface ExpenseDetailDialogProps {
  row: ExpenseRow
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function ExpenseDetailDialog({ row, open, onOpenChange }: ExpenseDetailDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setLoading("approve")
    setError(null)
    const result = await approveExpenseAction(row.id)
    if (result.success) {
      router.refresh()
      onOpenChange(false)
    } else {
      setError(result.error)
    }
    setLoading(null)
  }

  async function handleReject() {
    setLoading("reject")
    setError(null)
    const result = await rejectExpenseAction(row.id)
    if (result.success) {
      router.refresh()
      onOpenChange(false)
    } else {
      setError(result.error)
    }
    setLoading(null)
  }

  async function handleDelete() {
    if (!confirm("Delete this expense? This action cannot be undone.")) return
    setLoading("delete")
    setError(null)
    const result = await deleteExpenseAction(row.id)
    if (result.success) {
      router.refresh()
      onOpenChange(false)
    } else {
      setError(result.error)
    }
    setLoading(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{CATEGORY_LABELS[row.category] ?? row.category}</span>
            <StatusBadge status={row.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Amount</p>
              <p className="text-slate-900 font-semibold text-base">{formatPHP(row.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Date</p>
              <p className="text-slate-700">{row.expense_date ? formatDate(row.expense_date) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Submitted By</p>
              <p className="text-slate-700">{row.submitted_by_profile?.full_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Trip Ref</p>
              <p className="text-slate-700">{row.trip_id ? row.trip_id.slice(0, 8) + "…" : "—"}</p>
            </div>
          </div>

          {row.description && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Description</p>
              <p className="text-sm text-slate-700">{row.description}</p>
            </div>
          )}

          {row.receipt_url && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Receipt</p>
              <a
                href={row.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Receipt
              </a>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
            {row.status === "PENDING" && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={loading !== null}
                >
                  {loading === "approve" ? "Approving..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleReject}
                  disabled={loading !== null}
                >
                  {loading === "reject" ? "Rejecting..." : "Reject"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200"
                  onClick={handleDelete}
                  disabled={loading !== null}
                >
                  {loading === "delete" ? "Deleting..." : "Delete"}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

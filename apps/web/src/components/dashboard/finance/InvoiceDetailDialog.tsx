"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { InvoiceRow } from "@/components/dashboard/finance/InvoicesTable"
import {
  updateInvoiceAction,
  deleteInvoiceAction,
  getInvoiceLineItemsAction,
} from "@/app/dashboard/finance/invoices/actions"

type LineItem = {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  sort_order: number
  created_at: string
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
  return `₱${(amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const paymentSchema = z.object({
  amountPaid: z.coerce.number().min(0, "Must be >= 0"),
  paymentMethod: z.string().min(1, "Required"),
  paymentDate: z.string().min(1, "Required"),
  paymentReference: z.string().optional(),
})
type PaymentFormValues = z.infer<typeof paymentSchema>

interface InvoiceDetailDialogProps {
  row: InvoiceRow
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function InvoiceDetailDialog({ row, open, onOpenChange }: InvoiceDetailDialogProps) {
  const router = useRouter()
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amountPaid: row.grand_total ?? 0,
      paymentMethod: "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentReference: "",
    },
  })

  useEffect(() => {
    if (open) {
      setLoadingItems(true)
      getInvoiceLineItemsAction(row.id).then((items) => {
        setLineItems(items as LineItem[])
        setLoadingItems(false)
      })
    }
  }, [open, row.id])

  async function handleSend() {
    setActionLoading("send")
    setActionError(null)
    const result = await updateInvoiceAction(row.id, { status: "SENT" })
    if (result.success) {
      router.refresh()
      onOpenChange(false)
    } else {
      setActionError(result.error)
    }
    setActionLoading(null)
  }

  async function handleVoid() {
    setActionLoading("void")
    setActionError(null)
    const result = await updateInvoiceAction(row.id, { status: "VOID" })
    if (result.success) {
      router.refresh()
      onOpenChange(false)
    } else {
      setActionError(result.error)
    }
    setActionLoading(null)
  }

  async function handleDelete() {
    if (!confirm("Delete this invoice? This action cannot be undone.")) return
    setActionLoading("delete")
    setActionError(null)
    const result = await deleteInvoiceAction(row.id)
    if (result.success) {
      router.refresh()
      onOpenChange(false)
    } else {
      setActionError(result.error)
    }
    setActionLoading(null)
  }

  async function handleMarkPaid(data: PaymentFormValues) {
    const result = await updateInvoiceAction(row.id, {
      status: "PAID",
      amount_paid: data.amountPaid,
      payment_method: data.paymentMethod,
      payment_date: data.paymentDate,
      payment_reference: data.paymentReference || undefined,
    })
    if (result.success) {
      router.refresh()
      onOpenChange(false)
    } else {
      paymentForm.setError("root", { message: result.error })
    }
  }

  const subtotal = lineItems.reduce((s, li) => s + (li.subtotal ?? 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono">{row.invoice_number ?? "Invoice"}</span>
            <StatusBadge status={row.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Client</p>
              <p className="text-slate-900 font-medium">{row.profiles?.full_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Issue Date</p>
              <p className="text-slate-700">{row.issue_date ? formatDate(row.issue_date) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Due Date</p>
              <p className="text-slate-700">{row.due_date ? formatDate(row.due_date) : "—"}</p>
            </div>
            {row.status === "PAID" && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Payment Method</p>
                <p className="text-slate-700">{row.payment_method ?? "—"}</p>
              </div>
            )}
          </div>

          {/* Line items */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Line Items</p>
            {loadingItems ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : (
              <table className="w-full text-sm border border-slate-200 rounded-sm overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Description</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Unit Price</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li) => (
                    <tr key={li.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-800">{li.description}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{li.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatPHP(li.unit_price)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-800">{formatPHP(li.subtotal ?? li.quantity * li.unit_price)}</td>
                    </tr>
                  ))}
                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-sm text-slate-400">No line items.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals */}
          <div className="rounded-sm border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPHP(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <span className="tabular-nums text-red-600">−{formatPHP(row.discount_amount ?? 0)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span className="tabular-nums">{formatPHP(row.tax_amount ?? 0)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-1.5">
              <span>Grand Total</span>
              <span className="tabular-nums">{formatPHP(row.grand_total ?? 0)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Amount Paid</span>
              <span className="tabular-nums">{formatPHP(row.amount_paid ?? 0)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-1.5">
              <span>Balance Due</span>
              <span className="tabular-nums">{formatPHP(row.balance_due ?? 0)}</span>
            </div>
          </div>

          {/* Mark Paid inline form */}
          {showPaymentForm && (
            <div className="border border-slate-200 rounded-sm p-4 bg-green-50">
              <p className="text-sm font-medium text-slate-700 mb-3">Record Payment</p>
              <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(handleMarkPaid)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={paymentForm.control}
                      name="amountPaid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Amount Paid (₱)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} className="h-8 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={paymentForm.control}
                      name="paymentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Payment Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="h-8 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={paymentForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select…" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CASH">Cash</SelectItem>
                              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                              <SelectItem value="CHECK">Check</SelectItem>
                              <SelectItem value="GCASH">GCash</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={paymentForm.control}
                      name="paymentReference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Reference #</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} className="h-8 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {paymentForm.formState.errors.root && (
                    <p className="text-sm text-red-500">{paymentForm.formState.errors.root.message}</p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700" disabled={paymentForm.formState.isSubmitting}>
                      {paymentForm.formState.isSubmitting ? "Saving..." : "Confirm Payment"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowPaymentForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          {actionError && (
            <p className="text-sm text-red-500">{actionError}</p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
            {row.status === "DRAFT" && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleSend}
                disabled={actionLoading === "send"}
              >
                {actionLoading === "send" ? "Sending..." : "Send Invoice"}
              </Button>
            )}
            {(row.status === "SENT" || row.status === "OVERDUE") && !showPaymentForm && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowPaymentForm(true)}
              >
                Mark Paid
              </Button>
            )}
            {row.status === "SENT" && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-300"
                onClick={handleVoid}
                disabled={actionLoading === "void"}
              >
                {actionLoading === "void" ? "Voiding..." : "Void"}
              </Button>
            )}
            {row.status === "DRAFT" && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleDelete}
                disabled={actionLoading === "delete"}
              >
                {actionLoading === "delete" ? "Deleting..." : "Delete"}
              </Button>
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


"use client"

import { useState, Fragment } from "react"
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
import type { PayrollPeriodRow } from "@/components/dashboard/finance/PayrollTable"
import {
  addPayrollRecordAction,
  finalizePayrollPeriodAction,
  markPayrollRecordPaidAction,
} from "@/app/dashboard/finance/payroll/actions"

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
  return `₱${(amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const addEmployeeSchema = z.object({
  profileId: z.string().min(1, "Select an employee"),
  basePay: z.coerce.number().min(0, "Must be >= 0"),
})
type AddEmployeeFormValues = z.infer<typeof addEmployeeSchema>

const markPaidSchema = z.object({
  paymentMethod: z.string().min(1, "Required"),
  paymentDate: z.string().min(1, "Required"),
  paymentReference: z.string().optional(),
})
type MarkPaidFormValues = z.infer<typeof markPaidSchema>

interface PayrollPeriodDetailDialogProps {
  row: PayrollPeriodRow
  open: boolean
  onOpenChange: (v: boolean) => void
  driversProfiles: { id: string; full_name: string }[]
  helpersProfiles: { id: string; full_name: string }[]
}

export function PayrollPeriodDetailDialog({
  row,
  open,
  onOpenChange,
  driversProfiles,
  helpersProfiles,
}: PayrollPeriodDetailDialogProps) {
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [payingRecordId, setPayingRecordId] = useState<string | null>(null)

  const allProfiles = [
    ...driversProfiles.map((p) => ({ ...p, role: "DRIVER" })),
    ...helpersProfiles.map((p) => ({ ...p, role: "HELPER" })),
  ]

  const addEmployeeForm = useForm<AddEmployeeFormValues>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: { profileId: "", basePay: 0 },
  })

  const markPaidForm = useForm<MarkPaidFormValues>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: {
      paymentMethod: "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentReference: "",
    },
  })

  const [records, setRecords] = useState(row.payroll_records ?? [])
  const totalNetPay = records.reduce((s, r) => s + (r.net_pay ?? 0), 0)

  async function handleAddEmployee(data: AddEmployeeFormValues) {
    const result = await addPayrollRecordAction(row.id, {
      profileId: data.profileId,
      basePay: Number(data.basePay),
    })
    if (result.success) {
      const profile = allProfiles.find((p) => p.id === data.profileId)
      setRecords((prev) => [
        ...prev,
        {
          id: result.record.id,
          profile_id: result.record.profile_id,
          net_pay: result.record.net_pay ?? Number(data.basePay),
          profiles: profile ? { full_name: profile.full_name, role: profile.role } : null,
        },
      ])
      router.refresh()
      setShowAddEmployee(false)
      addEmployeeForm.reset()
    } else {
      addEmployeeForm.setError("root", { message: result.error })
    }
  }

  async function handleFinalize() {
    if (!confirm("Finalize this pay period? This will lock all records.")) return
    setActionLoading("finalize")
    setActionError(null)
    const result = await finalizePayrollPeriodAction(row.id)
    if (result.success) {
      router.refresh()
      onOpenChange(false)
    } else {
      setActionError(result.error)
    }
    setActionLoading(null)
  }

  async function handleMarkRecordPaid(recordId: string, data: MarkPaidFormValues) {
    const result = await markPayrollRecordPaidAction(recordId, {
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate,
      paymentReference: data.paymentReference,
    })
    if (result.success) {
      router.refresh()
      setPayingRecordId(null)
      markPaidForm.reset()
    } else {
      markPaidForm.setError("root", { message: result.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>
              {formatDate(row.period_start)} – {formatDate(row.period_end)}
            </span>
            <StatusBadge status={row.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Header info */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Prepared By</p>
              <p className="text-slate-700">{row.prepared_by_profile?.full_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Employees</p>
              <p className="text-slate-700">{records.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Total Net Pay</p>
              <p className="text-slate-900 font-semibold">{formatPHP(totalNetPay)}</p>
            </div>
          </div>

          {/* Payroll Records Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">Payroll Records</p>
              {row.status === "DRAFT" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowAddEmployee(!showAddEmployee)}
                >
                  {showAddEmployee ? "Cancel" : "+ Add Employee"}
                </Button>
              )}
            </div>

            {showAddEmployee && (
              <div className="border border-slate-200 rounded-sm p-3 bg-slate-50 mb-3">
                <Form {...addEmployeeForm}>
                  <form onSubmit={addEmployeeForm.handleSubmit(handleAddEmployee)} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={addEmployeeForm.control}
                        name="profileId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Employee</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select employee…" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {allProfiles.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.full_name} ({p.role})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addEmployeeForm.control}
                        name="basePay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Base Pay (₱)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" placeholder="0.00" className="h-8 text-sm" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {addEmployeeForm.formState.errors.root && (
                      <p className="text-sm text-red-500">{addEmployeeForm.formState.errors.root.message}</p>
                    )}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={addEmployeeForm.formState.isSubmitting}>
                        {addEmployeeForm.formState.isSubmitting ? "Adding..." : "Add"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowAddEmployee(false); addEmployeeForm.reset() }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            <div className="border border-slate-200 rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Role</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Net Pay</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Payment</th>
                    {row.status === "FINALIZED" && (
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const profileName = rec.profiles?.full_name ?? "—"
                    const role = rec.profiles?.role ?? "—"
                    const isPaid = !!(rec as { payment_date?: string }).payment_date
                    return (
                      <Fragment key={rec.id}>
                        <tr className="border-b border-slate-100">
                          <td className="px-3 py-2.5 text-slate-900 font-medium">{profileName}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-sm ${
                              role === "DRIVER"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-teal-50 text-teal-700"
                            }`}>
                              {role}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-900 font-medium">
                            {formatPHP(rec.net_pay ?? 0)}
                          </td>
                          <td className="px-3 py-2.5">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-sm">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                Paid
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Unpaid</span>
                            )}
                          </td>
                          {row.status === "FINALIZED" && (
                            <td className="px-3 py-2.5">
                              {!isPaid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs"
                                  onClick={() => setPayingRecordId(payingRecordId === rec.id ? null : rec.id)}
                                >
                                  Mark Paid
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                        {payingRecordId === rec.id && (
                          <tr className="border-b border-slate-100 bg-green-50">
                            <td colSpan={row.status === "FINALIZED" ? 5 : 4} className="px-3 py-3">
                              <Form {...markPaidForm}>
                                <form onSubmit={markPaidForm.handleSubmit((d) => handleMarkRecordPaid(rec.id, d))} className="space-y-2">
                                  <div className="grid grid-cols-3 gap-2">
                                    <FormField
                                      control={markPaidForm.control}
                                      name="paymentMethod"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">Method</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                              <SelectTrigger className="h-7 text-xs">
                                                <SelectValue placeholder="Select…" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              <SelectItem value="CASH">Cash</SelectItem>
                                              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                              <SelectItem value="GCASH">GCash</SelectItem>
                                              <SelectItem value="CHECK">Check</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={markPaidForm.control}
                                      name="paymentDate"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">Date</FormLabel>
                                          <FormControl>
                                            <Input type="date" className="h-7 text-xs" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={markPaidForm.control}
                                      name="paymentReference"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">Reference</FormLabel>
                                          <FormControl>
                                            <Input placeholder="Optional" className="h-7 text-xs" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  {markPaidForm.formState.errors.root && (
                                    <p className="text-xs text-red-500">{markPaidForm.formState.errors.root.message}</p>
                                  )}
                                  <div className="flex gap-2">
                                    <Button type="submit" size="sm" className="h-6 text-xs bg-green-600 hover:bg-green-700" disabled={markPaidForm.formState.isSubmitting}>
                                      {markPaidForm.formState.isSubmitting ? "Saving..." : "Confirm"}
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={() => { setPayingRecordId(null); markPaidForm.reset() }}>
                                      Cancel
                                    </Button>
                                  </div>
                                </form>
                              </Form>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={row.status === "FINALIZED" ? 5 : 4} className="px-3 py-6 text-center text-sm text-slate-400">
                        No employees added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {actionError && <p className="text-sm text-red-500">{actionError}</p>}

          {/* Bottom actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            {row.status === "DRAFT" && records.length > 0 && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleFinalize}
                disabled={actionLoading === "finalize"}
              >
                {actionLoading === "finalize" ? "Finalizing..." : "Finalize Period"}
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

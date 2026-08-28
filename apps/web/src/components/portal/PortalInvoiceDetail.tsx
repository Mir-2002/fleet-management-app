type LineItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  sort_order: number
}

type InvoiceData = {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: string
  grand_total: number
  subtotal: number
  discount_amount: number
  tax_amount: number
  amount_paid: number
  balance_due: number
  payment_method: string | null
  payment_date: string | null
  notes: string | null
}

const STATUS_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  SENT:      { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Sent" },
  PAID:      { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",    label: "Paid" },
  OVERDUE:   { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200",          label: "Overdue" },
  CANCELLED: { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Cancelled" },
  VOID:      { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Void" },
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", GCASH: "GCash", MAYA: "Maya",
}

function formatPHP(amount: number) {
  return `₱${(amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

interface PortalInvoiceDetailProps {
  invoice: InvoiceData
  lineItems: LineItem[]
}

export function PortalInvoiceDetail({ invoice, lineItems }: PortalInvoiceDetailProps) {
  const style = STATUS_STYLES[invoice.status] ?? STATUS_STYLES["SENT"]!
  const balanceDue = invoice.balance_due ?? 0

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 font-mono">{invoice.invoice_number}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Invoice</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium ${style.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      {/* Info card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Invoice Details</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Issue Date</p>
            <p className="text-slate-700">{formatDate(invoice.issue_date)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Due Date</p>
            <p className="text-slate-700">{formatDate(invoice.due_date)}</p>
          </div>
          {invoice.status === "PAID" && invoice.payment_method && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Payment Method</p>
              <p className="text-slate-700">{PAYMENT_METHOD_LABELS[invoice.payment_method] ?? invoice.payment_method}</p>
            </div>
          )}
          {invoice.status === "PAID" && invoice.payment_date && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Payment Date</p>
              <p className="text-slate-700">{formatDate(invoice.payment_date)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Line items card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Services</p>
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
      </div>

      {/* Totals card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Summary</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatPHP(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Discount</span>
            <span className="tabular-nums text-red-600">−{formatPHP(invoice.discount_amount ?? 0)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax</span>
            <span className="tabular-nums">{formatPHP(invoice.tax_amount ?? 0)}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-1.5">
            <span>Grand Total</span>
            <span className="tabular-nums">{formatPHP(invoice.grand_total)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Amount Paid</span>
            <span className="tabular-nums">{formatPHP(invoice.amount_paid ?? 0)}</span>
          </div>
          <div className={`flex justify-between font-semibold border-t border-slate-200 pt-1.5 ${balanceDue > 0 ? "text-red-600" : "text-green-700"}`}>
            <span>Balance Due</span>
            <span className="tabular-nums">{formatPHP(balanceDue)}</span>
          </div>
        </div>
      </div>

      {/* Notes card */}
      {invoice.notes && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Notes</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </>
  )
}

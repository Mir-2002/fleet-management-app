import { notFound } from "next/navigation"
import Link from "next/link"
import { requireClientSession } from "@/lib/portal/session"
import { PortalInvoiceDetail } from "@/components/portal/PortalInvoiceDetail"

export default async function PortalInvoiceDetailPage({ params }: { params: { id: string } }) {
  const { user, supabase } = await requireClientSession()

  const [{ data: invoice }, { data: lineItems }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, issue_date, due_date, status, grand_total, subtotal, discount_amount, tax_amount, amount_paid, balance_due, payment_method, payment_date, notes')
      .eq('id', params.id)
      .eq('client_id', user.id)
      .not('status', 'eq', 'DRAFT')
      .single(),
    supabase
      .from('invoice_line_items')
      .select('id, description, quantity, unit_price, subtotal, sort_order')
      .eq('invoice_id', params.id)
      .order('sort_order'),
  ])

  if (!invoice) notFound()

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
      <div className="mb-2">
        <Link href="/portal/invoices" className="text-sm text-slate-400 hover:text-slate-600">
          ← My Invoices
        </Link>
      </div>
      <PortalInvoiceDetail invoice={invoice} lineItems={lineItems ?? []} />
    </div>
  )
}

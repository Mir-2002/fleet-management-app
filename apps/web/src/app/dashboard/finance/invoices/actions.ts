'use server'

import { revalidatePath } from "next/cache"
import { CreateInvoiceFormInput, CreateInvoiceFormSchema } from "@fleetman/shared"
import { createClient } from "@/lib/supabase/server"

export async function createInvoiceAction(data: CreateInvoiceFormInput) {
  const parsed = CreateInvoiceFormSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Invalid data" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: "Not authenticated" }

  const { lineItems, ...invoiceFields } = parsed.data

  if (invoiceFields.dueDate < invoiceFields.issueDate) {
    return { success: false as const, error: "Due date must be on or after issue date" }
  }

  const { data: invoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      client_id: invoiceFields.clientId,
      request_id: invoiceFields.requestId || null,
      trip_id: invoiceFields.tripId || null,
      issue_date: invoiceFields.issueDate,
      due_date: invoiceFields.dueDate,
      discount_amount: invoiceFields.discountAmount,
      tax_amount: invoiceFields.taxAmount,
      notes: invoiceFields.notes || null,
      status: "DRAFT",
      subtotal: 0,
      amount_paid: 0,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (insertError) return { success: false as const, error: insertError.message }
  if (!invoice) return { success: false as const, error: "Failed to create invoice" }

  const lineItemRows = lineItems.map((item, idx) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    sort_order: item.sortOrder ?? idx,
  }))

  const { error: lineItemError } = await supabase
    .from("invoice_line_items")
    .insert(lineItemRows)

  if (lineItemError) return { success: false as const, error: lineItemError.message }

  revalidatePath("/dashboard/finance/invoices")
  return { success: true as const }
}

export async function updateInvoiceAction(
  id: string,
  data: {
    status?: string
    amount_paid?: number
    payment_method?: string
    payment_date?: string
    payment_reference?: string
    due_date?: string
    notes?: string
    discount_amount?: number
    tax_amount?: number
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("invoices")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/invoices")
  return { success: true as const }
}

export async function deleteInvoiceAction(id: string) {
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .single()

  if (!invoice) return { success: false as const, error: "Invoice not found" }
  if (invoice.status !== "DRAFT") return { success: false as const, error: "Only draft invoices can be deleted" }

  const { error } = await supabase.from("invoices").delete().eq("id", id)
  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/invoices")
  return { success: true as const }
}

export async function getInvoiceLineItemsAction(invoiceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("invoice_line_items")
    .select("id, invoice_id, description, quantity, unit_price, subtotal, sort_order, created_at")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true })

  if (error) return []
  return data ?? []
}

export async function addLineItemAction(
  invoiceId: string,
  itemData: { description: string; quantity: number; unitPrice: number; sortOrder?: number }
) {
  const supabase = await createClient()
  const { error } = await supabase.from("invoice_line_items").insert({
    invoice_id: invoiceId,
    description: itemData.description,
    quantity: itemData.quantity,
    unit_price: itemData.unitPrice,
    sort_order: itemData.sortOrder ?? 0,
  })

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/invoices")
  return { success: true as const }
}

export async function removeLineItemAction(lineItemId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("invoice_line_items").delete().eq("id", lineItemId)

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/invoices")
  return { success: true as const }
}

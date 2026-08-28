'use server'

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const CreateExpenseFormSchema = z.object({
  category: z.enum(['FUEL', 'TOLL', 'MAINTENANCE', 'LOADING_UNLOADING', 'ACCOMMODATION', 'MISCELLANEOUS']),
  tripId: z.string().uuid().optional().or(z.literal("")),
  truckId: z.string().uuid().optional().or(z.literal("")),
  amount: z.number().positive(),
  expenseDate: z.string().min(1),
  description: z.string().optional(),
  receiptUrl: z.string().url().optional().or(z.literal("")),
})

export type CreateExpenseFormInput = z.infer<typeof CreateExpenseFormSchema>

export async function createExpenseAction(data: CreateExpenseFormInput) {
  const parsed = CreateExpenseFormSchema.safeParse(data)
  if (!parsed.success) return { success: false as const, error: "Invalid data" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: "Not authenticated" }

  const { error } = await supabase.from("expenses").insert({
    category: parsed.data.category,
    trip_id: parsed.data.tripId || null,
    truck_id: parsed.data.truckId || null,
    amount: parsed.data.amount,
    expense_date: parsed.data.expenseDate,
    description: parsed.data.description || null,
    receipt_url: parsed.data.receiptUrl || null,
    submitted_by: user.id,
    status: "PENDING",
  })

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/expenses")
  return { success: true as const }
}

export async function approveExpenseAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: "Not authenticated" }

  const { error } = await supabase
    .from("expenses")
    .update({ status: "APPROVED", approved_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/expenses")
  return { success: true as const }
}

export async function rejectExpenseAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("expenses")
    .update({ status: "REJECTED", updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/expenses")
  return { success: true as const }
}

export async function deleteExpenseAction(id: string) {
  const supabase = await createClient()

  const { data: expense } = await supabase
    .from("expenses")
    .select("status")
    .eq("id", id)
    .single()

  if (!expense) return { success: false as const, error: "Expense not found" }
  if (expense.status !== "PENDING") return { success: false as const, error: "Only pending expenses can be deleted" }

  const { error } = await supabase.from("expenses").delete().eq("id", id)
  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/expenses")
  return { success: true as const }
}

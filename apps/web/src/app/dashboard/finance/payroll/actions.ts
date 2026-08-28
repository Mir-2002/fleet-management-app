'use server'

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function createPayrollPeriodAction(data: { periodStart: string; periodEnd: string }) {
  if (!data.periodStart || !data.periodEnd) {
    return { success: false as const, error: "Both period start and end are required" }
  }
  if (data.periodEnd <= data.periodStart) {
    return { success: false as const, error: "Period end must be after period start" }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: "Not authenticated" }

  const { error } = await supabase.from("payroll_periods").insert({
    period_start: data.periodStart,
    period_end: data.periodEnd,
    status: "DRAFT",
    prepared_by: user.id,
  })

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/payroll")
  return { success: true as const }
}

export async function addPayrollRecordAction(
  periodId: string,
  data: { profileId: string; basePay: number }
) {
  if (!periodId || !data.profileId) {
    return { success: false as const, error: "Invalid data" }
  }

  const supabase = await createClient()
  const { data: record, error } = await supabase.from("payroll_records").insert({
    payroll_period_id: periodId,
    profile_id: data.profileId,
    base_pay: data.basePay,
    overtime_pay: 0,
    deductions: 0,
    trip_bonus: 0,
  }).select("id, profile_id, base_pay, trip_bonus, overtime_pay, deductions, net_pay").single()

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/payroll")
  return { success: true as const, record }
}

export async function updatePayrollRecordAction(
  id: string,
  data: { basePay?: number; overtimePay?: number; deductions?: number }
) {
  const supabase = await createClient()
  const updateData: Record<string, number | string> = { updated_at: new Date().toISOString() }
  if (data.basePay !== undefined) updateData.base_pay = data.basePay
  if (data.overtimePay !== undefined) updateData.overtime_pay = data.overtimePay
  if (data.deductions !== undefined) updateData.deductions = data.deductions

  const { error } = await supabase.from("payroll_records").update(updateData).eq("id", id)
  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/payroll")
  return { success: true as const }
}

export async function addPayrollLineItemAction(
  recordId: string,
  data: {
    tripId: string
    rolePlayed: 'DRIVER' | 'HELPER'
    baseAmount: number
    bonusAmount: number
  }
) {
  const supabase = await createClient()
  const { error } = await supabase.from("payroll_line_items").insert({
    payroll_record_id: recordId,
    trip_id: data.tripId,
    role_played: data.rolePlayed,
    base_amount: data.baseAmount,
    bonus_amount: data.bonusAmount,
  })

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/payroll")
  return { success: true as const }
}

export async function removePayrollLineItemAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("payroll_line_items").delete().eq("id", id)
  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/payroll")
  return { success: true as const }
}

export async function finalizePayrollPeriodAction(periodId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("payroll_periods")
    .update({ status: "FINALIZED", updated_at: new Date().toISOString() })
    .eq("id", periodId)

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/payroll")
  return { success: true as const }
}

export async function markPayrollRecordPaidAction(
  recordId: string,
  data: { paymentMethod: string; paymentDate: string; paymentReference?: string }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("payroll_records")
    .update({
      payment_method: data.paymentMethod,
      payment_date: data.paymentDate,
      payment_reference: data.paymentReference || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordId)

  if (error) return { success: false as const, error: error.message }

  revalidatePath("/dashboard/finance/payroll")
  return { success: true as const }
}

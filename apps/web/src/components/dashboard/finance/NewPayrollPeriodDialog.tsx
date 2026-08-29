"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { z } from "zod"
import { createPayrollPeriodAction } from "@/app/dashboard/finance/payroll/actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const schema = z
  .object({
    periodStart: z.string().min(1, "Required"),
    periodEnd: z.string().min(1, "Required"),
  })
  .refine((d) => d.periodEnd > d.periodStart, {
    message: "End must be after start",
    path: ["periodEnd"],
  })

type PayrollPeriodFormValues = z.infer<typeof schema>

export function NewPayrollPeriodDialog() {
  const [open, setOpen] = useState(false)

  const form = useForm<PayrollPeriodFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodStart: "",
      periodEnd: "",
    },
  })

  async function onSubmit(data: PayrollPeriodFormValues) {
    const result = await createPayrollPeriodAction({
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
    })

    if (result.success) {
      setOpen(false)
      form.reset()
    } else {
      form.setError("root", { message: result.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Pay Period
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Pay Period</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="periodStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period Start</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="periodEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period End</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Period"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

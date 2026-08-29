"use client"

import { useState, useRef, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, X, ChevronDown, Loader2 } from "lucide-react"
import { z } from "zod"
import { createInvoiceAction, getClientTripsAction, type ClientTrip } from "@/app/dashboard/finance/invoices/actions"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const lineItemSchema = z.object({
  description: z.string().min(1, "Required"),
  quantity: z.coerce.number().positive("Must be > 0"),
  unitPrice: z.coerce.number().min(0, "Must be >= 0"),
  tripId: z.string().optional(),
  notes: z.string().optional(),
})

const newInvoiceSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  issueDate: z.string().min(1, "Required"),
  dueDate: z.string().min(1, "Required"),
  discountAmount: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one item"),
}).refine(d => d.dueDate >= d.issueDate, {
  message: "Due date must be on or after issue date",
  path: ["dueDate"],
})

type NewInvoiceFormValues = z.infer<typeof newInvoiceSchema>

interface NewInvoiceDialogProps {
  clients: { id: string; full_name: string }[]
  requests: { id: string; scheduled_date: string }[]
  trips: { id: string }[]
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str
}

function formatTripDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function NewInvoiceDialog({ clients }: NewInvoiceDialogProps) {
  const [open, setOpen] = useState(false)
  const [availableTrips, setAvailableTrips] = useState<ClientTrip[]>([])
  const [tripsLoading, setTripsLoading] = useState(false)
  const [tripPopoverOpen, setTripPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const today = new Date().toISOString().split("T")[0]

  const form = useForm<NewInvoiceFormValues>({
    resolver: zodResolver(newInvoiceSchema),
    defaultValues: {
      clientId: "",
      issueDate: today,
      dueDate: today,
      discountAmount: 0,
      taxAmount: 0,
      notes: "",
      lineItems: [{ description: "", quantity: 1, unitPrice: 0, tripId: undefined, notes: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  })

  const lineItems = form.watch("lineItems") ?? []
  const subtotal = lineItems.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0
  )
  const discount = Number(form.watch("discountAmount")) || 0
  const tax = Number(form.watch("taxAmount")) || 0
  const grandTotal = subtotal - discount + tax

  const addedTripIds = new Set(fields.map(f => (f as any).tripId).filter(Boolean))

  // Close popover on outside click
  useEffect(() => {
    if (!tripPopoverOpen) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setTripPopoverOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [tripPopoverOpen])

  async function handleClientChange(value: string) {
    form.setValue("clientId", value)
    setAvailableTrips([])
    setTripPopoverOpen(false)
    if (value) {
      setTripsLoading(true)
      const trips = await getClientTripsAction(value)
      setAvailableTrips(trips)
      setTripsLoading(false)
    }
  }

  async function onSubmit(data: NewInvoiceFormValues) {
    const result = await createInvoiceAction({
      clientId: data.clientId,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      discountAmount: data.discountAmount,
      taxAmount: data.taxAmount,
      notes: data.notes,
      lineItems: data.lineItems.map((item, idx) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        sortOrder: idx,
        tripId: item.tripId || undefined,
        notes: item.notes || undefined,
      })),
    })

    if (result.success) {
      setOpen(false)
      form.reset()
      setAvailableTrips([])
    } else {
      form.setError("root", { message: result.error })
    }
  }

  const showTripButton = availableTrips.length > 0 || tripsLoading

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Invoice</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select onValueChange={handleClientChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discountAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Amount (₱)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Amount (₱)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes…" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">Line Items</p>
                <div className="flex items-center gap-2">
                  {showTripButton && (
                    <div className="relative" ref={popoverRef}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={tripsLoading}
                        onClick={() => setTripPopoverOpen(v => !v)}
                      >
                        {tripsLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Loading trips…
                          </>
                        ) : (
                          <>
                            Add Trip
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </>
                        )}
                      </Button>

                      {tripPopoverOpen && !tripsLoading && (
                        <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-md border border-border bg-popover shadow-md">
                          <div className="max-h-64 overflow-y-auto py-1">
                            {availableTrips.length === 0 ? (
                              <p className="text-xs text-muted-foreground px-3 py-2">No unbilled trips found.</p>
                            ) : (
                              availableTrips.map((trip) => {
                                const isAdded = addedTripIds.has(trip.id)
                                return (
                                  <div
                                    key={trip.id}
                                    className={`py-2 px-3 rounded-sm ${
                                      isAdded
                                        ? "opacity-40 cursor-not-allowed"
                                        : "cursor-pointer hover:bg-muted/60"
                                    }`}
                                    onClick={() => {
                                      if (isAdded) return
                                      append({
                                        description: `${trip.pickup_address} → ${trip.dropoff_address}`,
                                        quantity: 1,
                                        unitPrice: 0,
                                        tripId: trip.id,
                                        notes: "",
                                      })
                                      setTripPopoverOpen(false)
                                    }}
                                  >
                                    <p className="text-sm font-medium text-foreground">
                                      {truncate(trip.pickup_address, 40)} → {truncate(trip.dropoff_address, 40)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {formatTripDate(trip.completed_at)}
                                    </p>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: "", quantity: 1, unitPrice: 0, tripId: undefined, notes: "" })}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="rounded-sm border border-border/60 bg-muted/20 p-2">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`lineItems.${idx}.description`}
                          render={({ field: f }) => (
                            <FormItem>
                              {idx === 0 && <FormLabel className="text-xs text-muted-foreground">Description</FormLabel>}
                              <FormControl>
                                <Input placeholder="Service description" className="text-sm" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="w-20">
                        <FormField
                          control={form.control}
                          name={`lineItems.${idx}.quantity`}
                          render={({ field: f }) => (
                            <FormItem>
                              {idx === 0 && <FormLabel className="text-xs text-muted-foreground">Qty</FormLabel>}
                              <FormControl>
                                <Input type="number" step="1" min="1" className="text-sm" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="w-28">
                        <FormField
                          control={form.control}
                          name={`lineItems.${idx}.unitPrice`}
                          render={({ field: f }) => (
                            <FormItem>
                              {idx === 0 && <FormLabel className="text-xs text-muted-foreground">Unit Price</FormLabel>}
                              <FormControl>
                                <Input type="number" step="0.01" min="0" placeholder="0.00" className="text-sm" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className={idx === 0 ? "pt-6" : "pt-0"}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-red-500"
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1.5">
                      <FormField
                        control={form.control}
                        name={`lineItems.${idx}.notes`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Optional note…"
                                className="h-7 text-xs text-muted-foreground"
                                {...f}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {form.formState.errors.lineItems?.root && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.lineItems.root.message}
                </p>
              )}
              {typeof form.formState.errors.lineItems?.message === "string" && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.lineItems.message}
                </p>
              )}
            </div>

            {/* Totals Summary */}
            <div className="rounded-sm border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">
                  ₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span className="tabular-nums text-red-600">
                  −₱{discount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span className="tabular-nums">
                  ₱{tax.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
                <span>Grand Total</span>
                <span className="tabular-nums">
                  ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {form.formState.errors.root && (
              <p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Create Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

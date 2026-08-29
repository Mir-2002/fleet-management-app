"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Card, CardContent } from "@/components/ui/card"
import { portalCreateRequestAction } from "@/app/portal/requests/new/actions"

const TRUCK_TYPES = ["Wing Van", "10-Wheeler", "6-Wheeler", "Reefer Truck", "Flatbed"]

const HANDLING_TAGS = [
  { value: 'DRY_GOODS',   label: 'Dry Goods' },
  { value: 'FROZEN',      label: 'Frozen' },
  { value: 'FRAGILE',     label: 'Fragile' },
  { value: 'PERISHABLE',  label: 'Perishable' },
  { value: 'HAZMAT',      label: 'Hazmat' },
] as const

const StopSchema = z.object({
  sequence: z.number(),
  stopType: z.enum(['PICKUP', 'DROPOFF'], { required_error: 'Stop type is required' }),
  address: z.string().min(1, "Address is required"),
  contactName: z.string().optional(),
  contactPhone: z.string().refine((v) => !v || v.length >= 7, 'Phone must be at least 7 digits').optional(),
})

const PortalRequestSchema = z.object({
  cargoHandlingTags: z.array(z.enum(['DRY_GOODS', 'FROZEN', 'FRAGILE', 'PERISHABLE', 'HAZMAT'])).min(1, 'Select at least one handling type'),
  cargoWeight: z.number({ invalid_type_error: 'Weight is required' }).positive('Weight must be greater than 0'),
  cargoLength: z.number().positive().optional().nullable(),
  cargoWidth: z.number().positive().optional().nullable(),
  cargoHeight: z.number().positive().optional().nullable(),
  cargoMeasurementMode: z.enum(['PER_ITEM', 'WHOLE']),
  truckTypeRequested: z.string().min(1, "Truck type is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledTime: z.string().min(1, "Time is required"),
  stops: z.array(StopSchema).min(2, "At least 2 stops required"),
  notes: z.string().optional(),
}).refine(
  (d) => {
    const dims = [d.cargoLength, d.cargoWidth, d.cargoHeight].filter((v) => v != null)
    return dims.length === 0 || dims.length === 3
  },
  { message: "Provide all three dimensions or leave all empty.", path: ['cargoLength'] }
)

type PortalRequestFormData = z.infer<typeof PortalRequestSchema>

export function PortalNewRequestForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<PortalRequestFormData>({
    resolver: zodResolver(PortalRequestSchema),
    defaultValues: {
      cargoHandlingTags: [],
      cargoWeight: undefined,
      cargoLength: undefined,
      cargoWidth: undefined,
      cargoHeight: undefined,
      cargoMeasurementMode: 'WHOLE',
      truckTypeRequested: "",
      scheduledDate: "",
      scheduledTime: "",
      stops: [
        { sequence: 1, stopType: 'PICKUP', address: "", contactName: "", contactPhone: "" },
        { sequence: 2, stopType: 'DROPOFF', address: "", contactName: "", contactPhone: "" },
      ],
      notes: "",
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stops",
  })

  const watchedTags = form.watch('cargoHandlingTags') ?? []
  const watchedMode = form.watch('cargoMeasurementMode')

  function toggleTag(value: string) {
    const current = form.getValues('cargoHandlingTags') ?? []
    if (current.includes(value as never)) {
      form.setValue('cargoHandlingTags', current.filter((t) => t !== value) as never, { shouldValidate: true })
    } else {
      form.setValue('cargoHandlingTags', [...current, value] as never, { shouldValidate: true })
    }
  }

  async function onSubmit(data: PortalRequestFormData) {
    setSubmitting(true)
    const result = await portalCreateRequestAction(data)
    if (result && !result.success) {
      form.setError("root", { message: result.error })
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* Cargo Details */}
        <Card className="shadow-none">
          <CardContent className="p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cargo Details</p>

            {/* Handling Tags */}
            <FormField
              control={form.control}
              name="cargoHandlingTags"
              render={() => (
                <FormItem>
                  <FormLabel>Handling Type</FormLabel>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {HANDLING_TAGS.map((tag) => {
                      const selected = watchedTags.includes(tag.value as never)
                      const isHazmat = tag.value === 'HAZMAT'
                      return (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => toggleTag(tag.value)}
                          className={[
                            "rounded-sm border px-3 py-1 text-xs font-medium transition-colors",
                            selected && isHazmat
                              ? "border-amber-500 bg-amber-50 text-amber-700"
                              : selected
                              ? "border-slate-700 bg-slate-700 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Weight + Measurement Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cargoWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight</FormLabel>
                    {/* The unit-suffix wrapper must sit OUTSIDE FormControl: FormControl uses a
                        Radix Slot that forwards the label-linked id to its single direct child,
                        so if the div were the direct child, the id would land on the div instead
                        of the Input, breaking the FormLabel's htmlFor association. */}
                    <div className="relative">
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          aria-label="Cargo weight in kilograms"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                          className="pr-9"
                        />
                      </FormControl>
                      <span aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">kg</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cargoMeasurementMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Measured</FormLabel>
                    <div className="flex rounded-md border border-input overflow-hidden">
                      {(['PER_ITEM', 'WHOLE'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => field.onChange(mode)}
                          className={[
                            "flex-1 py-2 text-xs font-medium transition-colors",
                            watchedMode === mode
                              ? "bg-slate-700 text-white"
                              : "bg-white text-slate-500 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          {mode === 'PER_ITEM' ? 'Per Item' : 'Whole Cargo'}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dimensions */}
            <div>
              <p className="text-sm font-medium mb-2">
                Dimensions <span className="text-muted-foreground font-normal text-xs">(optional — all or none)</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['cargoLength', 'cargoWidth', 'cargoHeight'] as const).map((name, i) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        {/* Slot-forwarding fix: keep positioning wrapper outside FormControl */}
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder={['L', 'W', 'H'][i]}
                              aria-label={['Length in centimeters', 'Width in centimeters', 'Height in centimeters'][i]}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                              className="pr-9"
                            />
                          </FormControl>
                          <span aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">cm</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Truck Type */}
            <FormField
              control={form.control}
              name="truckTypeRequested"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Truck Type Required</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select truck type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRUCK_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="shadow-none">
          <CardContent className="p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Route / Stops */}
        <Card className="shadow-none">
          <CardContent className="p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Route</p>

            {fields.map((field, index) => (
              <div key={field.id} className="rounded-sm border border-border p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`stops.${index}.stopType`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <Select onValueChange={f.onChange} value={f.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Stop type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PICKUP">Pickup</SelectItem>
                            <SelectItem value="DROPOFF">Drop Off</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8 text-slate-400 hover:text-red-500"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name={`stops.${index}.address`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Enter address" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name={`stops.${index}.contactName`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Contact person (optional)" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`stops.${index}.contactPhone`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Contact phone (optional)" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed text-slate-500"
              onClick={() => append({ sequence: fields.length + 1, stopType: 'PICKUP', address: "", contactName: "", contactPhone: "" })}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Stop
            </Button>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="shadow-none">
          <CardContent className="p-5">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special instructions or details for the dispatcher…"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

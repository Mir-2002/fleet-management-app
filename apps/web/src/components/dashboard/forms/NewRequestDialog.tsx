"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, HelpCircle } from "lucide-react"
import { CreateRequestSchema, CreateRequestInput } from "@fleetman/shared"
import { createRequestAction } from "@/app/dashboard/requests/actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const TRUCK_TYPES = ["Wing Van", "10-Wheeler", "6-Wheeler", "Reefer Truck", "Flatbed"]

const HANDLING_TAGS = [
  { value: 'DRY_GOODS',  label: 'Dry Goods' },
  { value: 'FROZEN',     label: 'Frozen' },
  { value: 'FRAGILE',    label: 'Fragile' },
  { value: 'PERISHABLE', label: 'Perishable' },
  { value: 'HAZMAT',     label: 'Hazmat' },
] as const

type Client = { id: string; full_name: string }

export function NewRequestDialog({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false)
  const [autoAccept, setAutoAccept] = useState(false)

  const form = useForm<CreateRequestInput>({
    resolver: zodResolver(CreateRequestSchema),
    defaultValues: {
      clientId: "",
      cargoHandlingTags: [],
      cargoWeight: undefined as unknown as number,
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

  async function onSubmit(data: CreateRequestInput) {
    const result = await createRequestAction(data, autoAccept)
    if (result.success) {
      setOpen(false)
      form.reset()
      setAutoAccept(false)
    } else {
      form.setError("root", { message: result.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Request</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            {/* Client */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Handling Tags */}
            <FormField
              control={form.control}
              name="cargoHandlingTags"
              render={() => (
                <FormItem>
                  <FormLabel>Handling Type</FormLabel>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {HANDLING_TAGS.map((tag) => {
                      const selected = watchedTags.includes(tag.value as never)
                      const isHazmat = tag.value === 'HAZMAT'
                      return (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => toggleTag(tag.value)}
                          className={[
                            "rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors",
                            selected && isHazmat
                              ? "border-amber-500 bg-amber-50 text-amber-700"
                              : selected
                              ? "border-slate-700 bg-slate-700 text-white"
                              : isHazmat
                              ? "border-amber-200 bg-white text-amber-600 hover:bg-amber-50"
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

            {/* Weight + Mode */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="cargoWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                          className="pr-9"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">kg</span>
                      </div>
                    </FormControl>
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
                    <div className="flex rounded-md border border-slate-200 overflow-hidden">
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
                          {mode === 'PER_ITEM' ? 'Per Item' : 'Whole'}
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
              <p className="text-sm font-medium mb-1.5">
                Dimensions <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['cargoLength', 'cargoWidth', 'cargoHeight'] as const).map((name, i) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder={['L', 'W', 'H'][i]}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                              className="pr-9"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">cm</span>
                          </div>
                        </FormControl>
                        {name === 'cargoLength' && <FormMessage />}
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
                  <FormLabel>Truck Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select truck type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRUCK_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-3">
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

            {/* Stops */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Stops</p>
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-sm border border-slate-200 p-3 space-y-2">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                      disabled={fields.length <= 2}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`stops.${index}.address`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Address" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name={`stops.${index}.contactName`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Contact person (opt.)" className="text-xs" {...f} />
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
                            <Input placeholder="Contact phone (opt.)" className="text-xs" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              {form.formState.errors.stops?.root && (
                <p className="text-sm text-red-500">{form.formState.errors.stops.root.message}</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => append({ sequence: fields.length + 1, stopType: 'PICKUP', address: "", contactName: "", contactPhone: "" })}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Stop
              </Button>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special instructions for the dispatcher..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Auto Accept */}
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="autoAccept"
                checked={autoAccept}
                onCheckedChange={(v) => setAutoAccept(v === true)}
              />
              <Label htmlFor="autoAccept" className="text-sm font-normal cursor-pointer">
                Auto Accept
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    Skips the review queue — adds the request directly to the Kanban board as To Do.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {form.formState.errors.root && (
              <p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

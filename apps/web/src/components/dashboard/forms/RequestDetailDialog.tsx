"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { acceptRequestAction, updateRequestAction, deleteRequestAction } from "@/app/dashboard/requests/actions"

export type RequestRow = {
  id: string
  cargo_handling_tags: string[]
  cargo_weight: number
  cargo_length: number | null
  cargo_width: number | null
  cargo_height: number | null
  cargo_measurement_mode: string
  truck_type_requested: string
  scheduled_date: string
  scheduled_time: string | null
  notes: string | null
  status: string | null
  profiles: { full_name: string } | null
}

const TRUCK_TYPES = ["Wing Van", "10-Wheeler", "6-Wheeler", "Reefer Truck", "Flatbed"]

const TAG_LABELS: Record<string, string> = {
  DRY_GOODS: 'Dry Goods',
  FROZEN: 'Frozen',
  FRAGILE: 'Fragile',
  PERISHABLE: 'Perishable',
  HAZMAT: 'Hazmat',
}

const HANDLING_TAGS = [
  { value: 'DRY_GOODS',  label: 'Dry Goods' },
  { value: 'FROZEN',     label: 'Frozen' },
  { value: 'FRAGILE',    label: 'Fragile' },
  { value: 'PERISHABLE', label: 'Perishable' },
  { value: 'HAZMAT',     label: 'Hazmat' },
]

const statusStyles: Record<string, { dot: string; badge: string; label: string }> = {
  PENDING:    { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",   label: "Pending" },
  ACCEPTED:   { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Accepted" },
  DISPATCHED: { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Dispatched" },
  COMPLETED:  { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",   label: "Completed" },
  CANCELLED:  { dot: "bg-muted-foreground",  badge: "bg-muted text-muted-foreground border-border",  label: "Cancelled" },
}

const defaultStyle = { dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border", label: "Unknown" }

interface RequestDetailDialogProps {
  row: RequestRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RequestDetailDialog({ row, open, onOpenChange }: RequestDetailDialogProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cargoHandlingTags, setCargoHandlingTags] = useState<string[]>(row.cargo_handling_tags ?? [])
  const [cargoWeight, setCargoWeight] = useState<string>(String(row.cargo_weight ?? ''))
  const [cargoLength, setCargoLength] = useState<string>(row.cargo_length != null ? String(row.cargo_length) : '')
  const [cargoWidth, setCargoWidth] = useState<string>(row.cargo_width != null ? String(row.cargo_width) : '')
  const [cargoHeight, setCargoHeight] = useState<string>(row.cargo_height != null ? String(row.cargo_height) : '')
  const [cargoMeasurementMode, setCargoMeasurementMode] = useState(row.cargo_measurement_mode ?? 'WHOLE')
  const [truckType, setTruckType] = useState(row.truck_type_requested)
  const [scheduledDate, setScheduledDate] = useState(row.scheduled_date)
  const [scheduledTime, setScheduledTime] = useState(row.scheduled_time ?? "")
  const [notes, setNotes] = useState(row.notes ?? "")

  const style = statusStyles[row.status ?? ""] ?? defaultStyle
  const isPending = row.status === "PENDING"

  function handleOpenChange(val: boolean) {
    if (!val) {
      setEditing(false)
      setConfirmDelete(false)
      setError(null)
      setCargoHandlingTags(row.cargo_handling_tags ?? [])
      setCargoWeight(String(row.cargo_weight ?? ''))
      setCargoLength(row.cargo_length != null ? String(row.cargo_length) : '')
      setCargoWidth(row.cargo_width != null ? String(row.cargo_width) : '')
      setCargoHeight(row.cargo_height != null ? String(row.cargo_height) : '')
      setCargoMeasurementMode(row.cargo_measurement_mode ?? 'WHOLE')
      setTruckType(row.truck_type_requested)
      setScheduledDate(row.scheduled_date)
      setScheduledTime(row.scheduled_time ?? "")
      setNotes(row.notes ?? "")
    }
    onOpenChange(val)
  }

  function toggleTag(value: string) {
    setCargoHandlingTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  async function handleAccept() {
    setAccepting(true)
    setError(null)
    const result = await acceptRequestAction(row.id)
    setAccepting(false)
    if (result.success) {
      onOpenChange(false)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  async function handleSave() {
    const dims = [cargoLength, cargoWidth, cargoHeight].filter((v) => v !== '')
    if (dims.length > 0 && dims.length < 3) {
      setError('Provide all three dimensions (L, W, H) or leave all empty.')
      return
    }

    setSaving(true)
    setError(null)
    const result = await updateRequestAction(row.id, {
      cargoHandlingTags: cargoHandlingTags as never,
      cargoWeight: parseFloat(cargoWeight),
      cargoLength: cargoLength !== '' ? parseFloat(cargoLength) : null,
      cargoWidth: cargoWidth !== '' ? parseFloat(cargoWidth) : null,
      cargoHeight: cargoHeight !== '' ? parseFloat(cargoHeight) : null,
      cargoMeasurementMode: cargoMeasurementMode as 'PER_ITEM' | 'WHOLE',
      truckTypeRequested: truckType,
      scheduledDate,
      scheduledTime,
      notes: notes || undefined,
    })
    setSaving(false)
    if (result.success) {
      setEditing(false)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteRequestAction(row.id)
    setDeleting(false)
    if (result.success) {
      onOpenChange(false)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  const formattedDate = row.scheduled_date
    ? new Date(row.scheduled_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—"

  const formattedDateTime = row.scheduled_time
    ? `${formattedDate} at ${row.scheduled_time}`
    : formattedDate

  const hasDimensions = row.cargo_length != null && row.cargo_width != null && row.cargo_height != null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Request" : "Request Details"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Input value={row.profiles?.full_name ?? "—"} disabled className="bg-muted/30" />
              </div>

              <div className="space-y-1.5">
                <Label>Handling Type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {HANDLING_TAGS.map((tag) => {
                    const selected = cargoHandlingTags.includes(tag.value)
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
                            ? "border-foreground bg-foreground text-background"
                            : isHazmat
                            ? "border-amber-200 bg-white text-amber-600 hover:bg-amber-50"
                            : "border-border bg-background text-muted-foreground hover:bg-muted/30",
                        ].join(" ")}
                      >
                        {tag.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Weight</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={cargoWeight}
                      onChange={(e) => setCargoWeight(e.target.value)}
                      className="pr-9"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">kg</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Measured</Label>
                  <div className="flex rounded-md border border-border overflow-hidden h-10">
                    {(['PER_ITEM', 'WHOLE'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCargoMeasurementMode(mode)}
                        className={[
                          "flex-1 text-xs font-medium transition-colors",
                          cargoMeasurementMode === mode
                            ? "bg-foreground text-background"
                            : "bg-white text-muted-foreground hover:bg-muted/30",
                        ].join(" ")}
                      >
                        {mode === 'PER_ITEM' ? 'Per Item' : 'Whole'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Dimensions <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { val: cargoLength, set: setCargoLength, label: 'L' },
                    { val: cargoWidth, set: setCargoWidth, label: 'W' },
                    { val: cargoHeight, set: setCargoHeight, label: 'H' },
                  ]).map(({ val, set, label }) => (
                    <div key={label} className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={label}
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        className="pr-9"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">cm</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Truck Type</Label>
                <Select value={truckType} onValueChange={setTruckType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select truck type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRUCK_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Special Instructions</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                  rows={3}
                  placeholder="Any special instructions..."
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${style.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  {style.label}
                </span>
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Client</dt>
                  <dd className="text-foreground font-medium">{row.profiles?.full_name ?? "—"}</dd>
                </div>
                <div className="flex justify-between items-start">
                  <dt className="text-muted-foreground shrink-0">Handling</dt>
                  <dd className="flex flex-wrap gap-1 justify-end">
                    {(row.cargo_handling_tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className={[
                          "rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
                          tag === 'HAZMAT'
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-border bg-muted/30 text-muted-foreground",
                        ].join(" ")}
                      >
                        {TAG_LABELS[tag] ?? tag}
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Weight</dt>
                  <dd className="text-foreground">
                    {row.cargo_weight} kg
                    <span className="text-muted-foreground text-xs ml-1.5">
                      ({row.cargo_measurement_mode === 'PER_ITEM' ? 'per item' : 'whole'})
                    </span>
                  </dd>
                </div>
                {hasDimensions && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Dimensions</dt>
                    <dd className="text-foreground">
                      {row.cargo_length} × {row.cargo_width} × {row.cargo_height} cm
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Truck Type</dt>
                  <dd className="text-foreground">{row.truck_type_requested}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Scheduled</dt>
                  <dd className="text-foreground">{formattedDateTime}</dd>
                </div>
              </dl>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Special Instructions
                </p>
                <div className="rounded-sm bg-muted/30 border border-border px-3 py-2 text-sm text-foreground min-h-[56px]">
                  {row.notes || <span className="text-muted-foreground italic">No special instructions</span>}
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-1">
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600">Are you sure you want to delete this request?</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  {isPending && !editing && (
                    <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button variant="outline" onClick={() => { setEditing(false); setError(null) }}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                      {isPending && (
                        <>
                          <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                          <Button onClick={handleAccept} disabled={accepting}>
                            {accepting ? "Accepting..." : "Accept Request"}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

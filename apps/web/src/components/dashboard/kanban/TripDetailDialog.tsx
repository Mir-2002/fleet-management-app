"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { KanbanCard } from "./KanbanBoard"
import { updateTripAssignmentAction, getResourcesForAssignmentAction } from "@/app/dashboard/trips/actions"
import { getStopsForRequestAction } from "@/app/dashboard/requests/actions"

type Resources = Awaited<ReturnType<typeof getResourcesForAssignmentAction>>
type Stop = {
  sequence: number
  stop_type: string
  address: string
  contact_name: string | null
  contact_phone: string | null
}

const TAG_LABELS: Record<string, string> = {
  DRY_GOODS: 'Dry Goods',
  FROZEN: 'Frozen',
  FRAGILE: 'Fragile',
  PERISHABLE: 'Perishable',
  HAZMAT: 'Hazmat',
}

const STOP_TYPE_STYLES: Record<string, string> = {
  PICKUP:  "border-indigo-200 bg-indigo-50 text-indigo-700",
  DROPOFF: "border-green-200 bg-green-50 text-green-700",
}

interface TripDetailDialogProps {
  card: KanbanCard
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TripDetailDialog({ card, open, onOpenChange }: TripDetailDialogProps) {
  const router = useRouter()
  const [resources, setResources] = useState<Resources | null>(null)
  const [stops, setStops] = useState<Stop[]>([])
  const [truckId, setTruckId] = useState<string>(card.truckId ?? "")
  const [driverId, setDriverId] = useState<string>(card.driverId ?? "")
  const [helperId, setHelperId] = useState<string>(card.helperId ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTruckId(card.truckId ?? "")
    setDriverId(card.driverId ?? "")
    setHelperId(card.helperId ?? "")
    setError(null)
    Promise.all([
      getResourcesForAssignmentAction(card.id),
      getStopsForRequestAction(card.requestId),
    ]).then(([res, s]) => {
      setResources(res)
      setStops(s)
    })
  }, [open, card.truckId, card.driverId, card.helperId])

  const selectedTruck = resources?.trucks.find((t) => t.id === truckId)
  const truckTypeMismatch =
    selectedTruck && selectedTruck.truck_type !== card.truckType
      ? `Selected truck is a ${selectedTruck.truck_type} but request requires a ${card.truckType}.`
      : null

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await updateTripAssignmentAction(card.id, {
      truckId: truckId || null,
      driverId: driverId || null,
      helperId: helperId || null,
    })
    setSaving(false)
    if (result.success) {
      onOpenChange(false)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  const loading = resources === null
  const isLocked = card.status === "done"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trip Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <section className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Request Info</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <span className="text-slate-500">Client</span>
              <span className="text-slate-900 font-medium">{card.clientName}</span>
              <span className="text-slate-500">Handling</span>
              <div className="flex flex-wrap gap-1">
                {(card.cargoHandlingTags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className={[
                      "rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
                      tag === 'HAZMAT'
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-600",
                    ].join(" ")}
                  >
                    {TAG_LABELS[tag] ?? tag}
                  </span>
                ))}
              </div>
              <span className="text-slate-500">Truck Type</span>
              <span className="text-slate-900">{card.truckType}</span>
              <span className="text-slate-500">Schedule</span>
              <span className="text-slate-900">{card.schedule}</span>
            </div>

            {stops.length > 0 && (
              <div className="pt-1 border-t border-slate-200 mt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Route</p>
                <ol className="space-y-2">
                  {stops.map((stop) => (
                    <li key={stop.sequence} className="flex gap-2.5 text-sm">
                      <span className={`shrink-0 self-start mt-0.5 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${STOP_TYPE_STYLES[stop.stop_type] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {stop.stop_type === 'PICKUP' ? 'Pickup' : 'Drop Off'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-slate-700">{stop.address}</p>
                        {stop.contact_name && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {stop.contact_name}{stop.contact_phone ? ` · ${stop.contact_phone}` : ''}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assignments</p>
            {isLocked ? (
              <p className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-sm px-3 py-2">
                This trip is completed and cannot be reassigned.
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                All three must be assigned before moving to In Progress.
              </p>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm">Truck</Label>
              <Select value={truckId} onValueChange={setTruckId} disabled={loading || isLocked}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading..." : "Select a truck"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {resources?.trucks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.plate_number}{t.is_on_trip && " (On Trip)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {truckTypeMismatch && (
                <p className="text-xs text-amber-600">{truckTypeMismatch}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Driver</Label>
              <Select value={driverId} onValueChange={setDriverId} disabled={loading || isLocked}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading..." : "Select a driver"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {resources?.drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name}{d.is_on_trip && " (On Trip)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Helper</Label>
              <Select value={helperId} onValueChange={setHelperId} disabled={loading || isLocked}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading..." : "Select a helper"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {resources?.helpers.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.full_name}{h.is_on_trip && " (On Trip)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            {!isLocked && (
              <Button onClick={handleSave} disabled={saving || loading}>
                {saving ? "Saving..." : "Save Assignments"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

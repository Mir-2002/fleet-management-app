"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { updateTruckAction, deleteTruckAction } from "@/app/dashboard/resources/trucks/actions"

export type TruckRow = {
  id: string
  plate_number: string
  truck_type: string
  is_available: boolean | null
  is_on_trip?: boolean
  trucking: string | null
  created_at: string | null
}

interface TruckDetailDialogProps {
  row: TruckRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TruckDetailDialog({ row, open, onOpenChange }: TruckDetailDialogProps) {
  const [editing, setEditing] = useState(false)
  const [truckType, setTruckType] = useState(row.truck_type)
  const [isAvailable, setIsAvailable] = useState(row.is_available ?? true)
  const [trucking, setTrucking] = useState(row.trucking ?? "")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(val: boolean) {
    if (!val) {
      setEditing(false)
      setConfirmDelete(false)
      setError(null)
      setTruckType(row.truck_type)
      setIsAvailable(row.is_available ?? true)
      setTrucking(row.trucking ?? "")
    }
    onOpenChange(val)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await updateTruckAction(row.id, { truckType, isAvailable, trucking: trucking || undefined })
    setSaving(false)
    if (result.success) {
      setEditing(false)
    } else {
      setError(result.error)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteTruckAction(row.id)
    setDeleting(false)
    if (result.success) {
      onOpenChange(false)
    } else {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Truck" : "Truck Details"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Plate Number
                  <span className="text-[11px] text-muted-foreground font-normal">(immutable)</span>
                </Label>
                <Input value={row.plate_number} disabled className="bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <Label>Truck Type</Label>
                <Input value={truckType} onChange={(e) => setTruckType(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Trucking Company
                  <span className="text-[11px] text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  value={trucking}
                  onChange={(e) => setTrucking(e.target.value)}
                  placeholder="Leave blank if in-house"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_available"
                  checked={isAvailable}
                  onCheckedChange={(checked) => setIsAvailable(checked === true)}
                />
                <Label htmlFor="is_available" className="cursor-pointer">Available</Label>
              </div>
            </>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Plate Number</dt>
                <dd className="text-foreground font-medium">{row.plate_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-foreground">{row.truck_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Trucking</dt>
                <dd className="text-foreground">
                  {row.trucking ? (
                    row.trucking
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border-border">
                      In-house
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  {row.is_on_trip ? (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      On Trip
                    </span>
                  ) : row.is_available ? (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium bg-green-50 text-green-700 border-green-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border-border">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      Unavailable
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Added</dt>
                <dd className="text-muted-foreground">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
                </dd>
              </div>
            </dl>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Delete this truck?</span>
                <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Yes, delete"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </div>
            ) : (
              <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}

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
                <Button onClick={() => setEditing(true)}>Edit</Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

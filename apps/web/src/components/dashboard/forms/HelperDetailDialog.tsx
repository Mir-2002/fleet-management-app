"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateHelperAction, deleteHelperAction } from "@/app/dashboard/resources/helpers/actions"

export type HelperRow = {
  id: string
  full_name: string
  created_at: string | null
}

interface HelperDetailDialogProps {
  row: HelperRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelperDetailDialog({ row, open, onOpenChange }: HelperDetailDialogProps) {
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(row.full_name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(val: boolean) {
    if (!val) {
      setEditing(false)
      setConfirmDelete(false)
      setError(null)
      setFullName(row.full_name)
    }
    onOpenChange(val)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await updateHelperAction(row.id, { fullName })
    setSaving(false)
    if (result.success) {
      setEditing(false)
    } else {
      setError(result.error)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteHelperAction(row.id)
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
          <DialogTitle>{editing ? "Edit Helper" : "Helper Details"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {editing ? (
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Name</dt>
                <dd className="text-slate-900 font-medium">{row.full_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Joined</dt>
                <dd className="text-slate-500">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
                </dd>
              </div>
            </dl>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Delete this helper?</span>
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

"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateClientAction, deleteClientAction } from "@/app/dashboard/clients/actions"

export type ClientRow = {
  id: string
  full_name: string
  contact_info: string | null
  created_at: string | null
}

interface ClientDetailDialogProps {
  row: ClientRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientDetailDialog({ row, open, onOpenChange }: ClientDetailDialogProps) {
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(row.full_name)
  const [contactInfo, setContactInfo] = useState(row.contact_info ?? "")
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
      setContactInfo(row.contact_info ?? "")
    }
    onOpenChange(val)
  }

  async function handleSave() {
    if (contactInfo.replace(/\D/g, "").length !== 11) {
      setError("Contact number must be a valid 11-digit number")
      return
    }
    setSaving(true)
    setError(null)
    const result = await updateClientAction(row.id, { fullName, contactInfo })
    setSaving(false)
    if (result.success) {
      setEditing(false)
    } else {
      setError(result.error)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteClientAction(row.id)
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
          <DialogTitle>{editing ? "Edit Client" : "Client Details"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Number</Label>
                <Input placeholder="09XXXXXXXXX" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
              </div>
            </>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="text-foreground font-medium">{row.full_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Contact Number</dt>
                <dd className="text-foreground">{row.contact_info ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Joined</dt>
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
                <span className="text-sm text-red-600">Delete this client?</span>
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

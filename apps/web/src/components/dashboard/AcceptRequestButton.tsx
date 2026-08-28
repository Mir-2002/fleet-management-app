"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { acceptRequestAction } from "@/app/dashboard/requests/actions"

export function AcceptRequestButton({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleAccept() {
    setLoading(true)
    await acceptRequestAction(requestId)
    setLoading(false)
  }

  return (
    <Button size="sm" variant="outline" onClick={handleAccept} disabled={loading}>
      {loading ? "Accepting…" : "Accept"}
    </Button>
  )
}

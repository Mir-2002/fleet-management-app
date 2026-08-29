import { Card, CardContent } from "@/components/ui/card"
import { InboxIcon } from "lucide-react"

export function EmptyState({ entity }: { entity: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-14 text-center shadow-none border-dashed">
      <CardContent className="flex flex-col items-center gap-3 pb-0">
        <InboxIcon className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No {entity.toLowerCase()}s yet.</p>
      </CardContent>
    </Card>
  )
}

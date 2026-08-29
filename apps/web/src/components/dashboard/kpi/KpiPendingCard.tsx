"use client"

import Link from "next/link"
import { ClipboardList } from "lucide-react"

interface KpiPendingCardProps {
  count: number
  weekDelta: number
}

export function KpiPendingCard({ count, weekDelta }: KpiPendingCardProps) {
  const isPositive = weekDelta > 0
  const isNegative = weekDelta < 0

  return (
    <Link href="/dashboard/requests" className="block group">
    <div className="bg-card border border-border border-l-[3px] border-l-amber-500 rounded-sm p-4 flex items-center justify-between min-h-[100px] hover:border-primary/30 transition-colors cursor-pointer">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending Requests</p>
        </div>
        <p className="text-3xl font-semibold text-foreground tabular-nums">{count}</p>
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span
          className={[
            "text-sm font-semibold tabular-nums leading-none",
            isPositive ? "text-green-600" : isNegative ? "text-red-500" : "text-muted-foreground",
          ].join(" ")}
        >
          {isPositive ? "+" : ""}{weekDelta}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5">vs. last week</span>
      </div>
    </div>
    </Link>
  )
}

"use client"

import { ClipboardList } from "lucide-react"

interface KpiPendingCardProps {
  count: number
  weekDelta: number
}

export function KpiPendingCard({ count, weekDelta }: KpiPendingCardProps) {
  const isPositive = weekDelta > 0
  const isNegative = weekDelta < 0

  return (
    <div className="bg-white border border-slate-200 border-l-[3px] border-l-amber-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Pending Requests</p>
        </div>
        <p className="text-3xl font-semibold text-slate-900 tabular-nums">{count}</p>
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span
          className={[
            "text-sm font-semibold tabular-nums leading-none",
            isPositive ? "text-green-600" : isNegative ? "text-red-500" : "text-slate-400",
          ].join(" ")}
        >
          {isPositive ? "+" : ""}{weekDelta}
        </span>
        <span className="text-[10px] text-slate-400 mt-0.5">vs. last week</span>
      </div>
    </div>
  )
}

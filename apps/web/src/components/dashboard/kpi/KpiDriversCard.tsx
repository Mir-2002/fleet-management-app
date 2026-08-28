"use client"

import { Users } from "lucide-react"
import { PieChart, Pie, Cell } from "recharts"

interface KpiDriversCardProps {
  available: number
  total: number
}

export function KpiDriversCard({ available, total }: KpiDriversCardProps) {
  const onTrip = Math.max(0, total - available)

  const pieData =
    total === 0
      ? [{ name: "none", value: 1 }]
      : [
          { name: "available", value: available },
          { name: "on-trip", value: onTrip },
        ]

  const pieColors = total === 0 ? ["#e2e8f0"] : ["#7c3aed", "#e2e8f0"]

  return (
    <div className="bg-white border border-slate-200 border-l-[3px] border-l-violet-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Drivers</p>
        </div>
        <div className="flex items-baseline gap-1">
          <p className="text-3xl font-semibold text-slate-900 tabular-nums">
            {total === 0 ? "—" : available}
          </p>
          {total > 0 && (
            <span className="text-sm text-slate-400">/ {total}</span>
          )}
        </div>
        <p className="text-xs text-slate-400">available</p>
      </div>

      <div className="shrink-0">
        <PieChart width={56} height={56}>
          <Pie
            data={pieData}
            cx={27}
            cy={27}
            innerRadius={14}
            outerRadius={22}
            dataKey="value"
            strokeWidth={0}
            isAnimationActive={false}
          >
            {pieData.map((_, index) => (
              <Cell key={index} fill={pieColors[index]} />
            ))}
          </Pie>
        </PieChart>
      </div>
    </div>
  )
}

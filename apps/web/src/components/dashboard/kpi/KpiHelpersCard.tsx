"use client"

import Link from "next/link"
import { UserCheck } from "lucide-react"
import { PieChart, Pie, Cell } from "recharts"

interface KpiHelpersCardProps {
  available: number
  total: number
}

export function KpiHelpersCard({ available, total }: KpiHelpersCardProps) {
  const onTrip = Math.max(0, total - available)

  const pieData =
    total === 0
      ? [{ name: "none", value: 1 }]
      : [
          { name: "available", value: available },
          { name: "on-trip", value: onTrip },
        ]

  const pieColors = total === 0 ? ["#e2e8f0"] : ["#10b981", "#e2e8f0"]

  return (
    <Link href="/dashboard/resources/helpers" className="block group">
    <div className="bg-card border border-border border-l-[3px] border-l-emerald-500 rounded-sm p-4 flex items-center justify-between min-h-[100px] hover:border-primary/30 transition-colors cursor-pointer">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Helpers</p>
        </div>
        <div className="flex items-baseline gap-1">
          <p className="text-3xl font-semibold text-foreground tabular-nums">
            {total === 0 ? "—" : available}
          </p>
          {total > 0 && (
            <span className="text-sm text-muted-foreground">/ {total}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">available</p>
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
    </Link>
  )
}

"use client"

import { Truck } from "lucide-react"
import { AreaChart, Area, ResponsiveContainer } from "recharts"

interface KpiTripsCardProps {
  activeCount: number
  monthlyData: { month: string; count: number }[]
}

export function KpiTripsCard({ activeCount, monthlyData }: KpiTripsCardProps) {
  return (
    <div className="bg-card border border-border border-l-[3px] border-l-indigo-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Trips</p>
        </div>
        <p className="text-3xl font-semibold text-foreground tabular-nums">{activeCount}</p>
        <p className="text-xs text-muted-foreground">trips in progress</p>
      </div>

      <div className="w-24 h-12 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id="tripsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={1.5}
              fill="url(#tripsGradient)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

"use client"

import { FolderOpen, Users, UserCheck, Wallet } from "lucide-react"
import { PieChart, Pie, Cell } from "recharts"

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface PayrollKpiCardsProps {
  openPeriods: number
  driverCount: number
  helperCount: number
  totalPayout: number
}

export function PayrollKpiCards({ openPeriods, driverCount, helperCount, totalPayout }: PayrollKpiCardsProps) {
  const totalWorkers = driverCount + helperCount

  const pieData =
    totalWorkers === 0
      ? [{ name: "none", value: 1 }]
      : [
          { name: "drivers", value: driverCount },
          { name: "helpers", value: helperCount },
        ]
  const pieColors = totalWorkers === 0 ? ["#e2e8f0"] : ["#7c3aed", "#10b981"]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {/* Open Periods */}
      <div className="bg-card border border-border border-l-[3px] border-l-amber-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Open Periods</p>
          </div>
          <p className="text-3xl font-semibold text-foreground tabular-nums">{openPeriods === 0 ? "—" : openPeriods}</p>
          <p className="text-xs text-muted-foreground">draft + finalized</p>
        </div>
      </div>

      {/* Drivers Enrolled */}
      <div className="bg-card border border-border border-l-[3px] border-l-violet-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Drivers</p>
          </div>
          <p className="text-3xl font-semibold text-foreground tabular-nums">{driverCount === 0 ? "—" : driverCount}</p>
          <p className="text-xs text-muted-foreground">enrolled this month</p>
        </div>
        <div className="shrink-0">
          <PieChart width={56} height={56}>
            <Pie data={pieData} cx={27} cy={27} innerRadius={14} outerRadius={22} dataKey="value" strokeWidth={0} isAnimationActive={false}>
              {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
            </Pie>
          </PieChart>
        </div>
      </div>

      {/* Helpers Enrolled */}
      <div className="bg-card border border-border border-l-[3px] border-l-emerald-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Helpers</p>
          </div>
          <p className="text-3xl font-semibold text-foreground tabular-nums">{helperCount === 0 ? "—" : helperCount}</p>
          <p className="text-xs text-muted-foreground">enrolled this month</p>
        </div>
      </div>

      {/* Total Payout */}
      <div className="bg-card border border-border border-l-[3px] border-l-green-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Payout</p>
          </div>
          <p className="text-xl font-semibold text-foreground tabular-nums truncate">{formatPHP(totalPayout)}</p>
          <p className="text-xs text-muted-foreground">net pay all periods</p>
        </div>
      </div>
    </div>
  )
}

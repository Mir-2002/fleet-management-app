"use client"

import { Clock, CheckCircle2, Tag } from "lucide-react"
import { PieChart, Pie, Cell } from "recharts"

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const SLICE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#64748b"]

interface CategoryBreakdown {
  name: string
  value: number
}

interface ExpenseKpiCardsProps {
  pendingCount: number
  approvedThisMonth: number
  totalThisMonth: number
  categoryBreakdown: CategoryBreakdown[]
}

export function ExpenseKpiCards({
  pendingCount,
  approvedThisMonth,
  totalThisMonth,
  categoryBreakdown,
}: ExpenseKpiCardsProps) {
  const topCategory =
    categoryBreakdown.length > 0
      ? categoryBreakdown.reduce((a, b) => (a.value > b.value ? a : b))
      : null

  const pieData =
    categoryBreakdown.length === 0
      ? [{ name: "none", value: 1 }]
      : categoryBreakdown

  const pieColors =
    categoryBreakdown.length === 0
      ? ["#e2e8f0"]
      : SLICE_COLORS.slice(0, categoryBreakdown.length)

  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
      {/* Pending Approval */}
      <div className="bg-card border border-border border-l-[3px] border-l-amber-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending Approval</p>
          </div>
          <p className="text-3xl font-semibold text-foreground tabular-nums">{pendingCount === 0 ? "—" : pendingCount}</p>
          <p className="text-xs text-muted-foreground">awaiting review</p>
        </div>
      </div>

      {/* Approved This Month */}
      <div className="bg-card border border-border border-l-[3px] border-l-green-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Approved This Month</p>
          </div>
          <p className="text-xl font-semibold text-foreground tabular-nums truncate">{formatPHP(approvedThisMonth)}</p>
          <p className="text-xs text-muted-foreground">of {formatPHP(totalThisMonth)} submitted</p>
        </div>
      </div>

      {/* By Category */}
      <div className="col-span-2 xl:col-span-1 bg-card border border-border border-l-[3px] border-l-indigo-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">By Category</p>
          </div>
          <p className="text-xl font-semibold text-foreground truncate">
            {topCategory ? topCategory.name : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {topCategory ? `${formatPHP(topCategory.value)} top spend` : "no data this month"}
          </p>
        </div>
        <div className="shrink-0">
          <PieChart width={56} height={56}>
            <Pie data={pieData} cx={27} cy={27} innerRadius={14} outerRadius={22} dataKey="value" strokeWidth={0} isAnimationActive={false}>
              {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
            </Pie>
          </PieChart>
        </div>
      </div>
    </div>
  )
}

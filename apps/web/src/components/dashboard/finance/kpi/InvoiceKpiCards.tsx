"use client"

import { FileText, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react"
import { PieChart, Pie, Cell } from "recharts"

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface InvoiceKpiCardsProps {
  outstanding: number
  sentCount: number
  overdueCount: number
  paidThisMonth: number
  totalCount: number
  paidCount: number
}

export function InvoiceKpiCards({
  outstanding,
  sentCount,
  overdueCount,
  paidThisMonth,
  totalCount,
  paidCount,
}: InvoiceKpiCardsProps) {
  const collectionRate = totalCount === 0 ? 0 : Math.round((paidCount / totalCount) * 100)

  const outstandingPie =
    sentCount === 0 && overdueCount === 0
      ? [{ name: "none", value: 1 }]
      : [
          { name: "sent", value: sentCount },
          { name: "overdue", value: overdueCount },
        ]
  const outstandingColors =
    sentCount === 0 && overdueCount === 0
      ? ["#e2e8f0"]
      : ["#6366f1", "#ef4444"]

  const collectionPie =
    totalCount === 0
      ? [{ name: "none", value: 1 }]
      : [
          { name: "paid", value: paidCount },
          { name: "unpaid", value: totalCount - paidCount },
        ]
  const collectionColors = totalCount === 0 ? ["#e2e8f0"] : ["#22c55e", "#e2e8f0"]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {/* Outstanding */}
      <div className="bg-white border border-slate-200 border-l-[3px] border-l-indigo-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Outstanding</p>
          </div>
          <p className="text-xl font-semibold text-slate-900 tabular-nums truncate">{formatPHP(outstanding)}</p>
          <p className="text-xs text-slate-400">{sentCount} sent · {overdueCount} overdue</p>
        </div>
        <div className="shrink-0">
          <PieChart width={56} height={56}>
            <Pie data={outstandingPie} cx={27} cy={27} innerRadius={14} outerRadius={22} dataKey="value" strokeWidth={0} isAnimationActive={false}>
              {outstandingPie.map((_, i) => <Cell key={i} fill={outstandingColors[i]} />)}
            </Pie>
          </PieChart>
        </div>
      </div>

      {/* Overdue */}
      <div className="bg-white border border-slate-200 border-l-[3px] border-l-red-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Overdue</p>
          </div>
          <p className="text-3xl font-semibold text-slate-900 tabular-nums">{overdueCount === 0 ? "—" : overdueCount}</p>
          <p className="text-xs text-slate-400">past due date</p>
        </div>
      </div>

      {/* Paid This Month */}
      <div className="bg-white border border-slate-200 border-l-[3px] border-l-green-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Paid This Month</p>
          </div>
          <p className="text-xl font-semibold text-slate-900 tabular-nums truncate">{formatPHP(paidThisMonth)}</p>
          <p className="text-xs text-slate-400">collected</p>
        </div>
      </div>

      {/* Collection Rate */}
      <div className="bg-white border border-slate-200 border-l-[3px] border-l-green-500 rounded-sm p-4 flex items-center justify-between min-h-[100px]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Collection Rate</p>
          </div>
          <p className="text-3xl font-semibold text-slate-900 tabular-nums">{totalCount === 0 ? "—" : `${collectionRate}%`}</p>
          <p className="text-xs text-slate-400">{paidCount} / {totalCount} invoices</p>
        </div>
        <div className="shrink-0">
          <PieChart width={56} height={56}>
            <Pie data={collectionPie} cx={27} cy={27} innerRadius={14} outerRadius={22} dataKey="value" strokeWidth={0} isAnimationActive={false}>
              {collectionPie.map((_, i) => <Cell key={i} fill={collectionColors[i]} />)}
            </Pie>
          </PieChart>
        </div>
      </div>
    </div>
  )
}

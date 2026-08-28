"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import type { HistoryTrip } from "@/app/dashboard/history/page"

const statusStyles: Record<string, { dot: string; badge: string; label: string }> = {
  DELIVERED: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Delivered" },
  COMPLETED: { dot: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200", label: "Completed" },
}

export function TripHistoryTable({ trips }: { trips: HistoryTrip[] }) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? trips.filter((t) =>
        [t.clientName, t.cargoType, t.truckType, t.truckPlate, t.driverName, t.helperName]
          .filter(Boolean)
          .some((f) => f!.toLowerCase().includes(query.toLowerCase()))
      )
    : trips

  return (
    <>
      <div className="rounded-sm border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <Input
          placeholder="Search by client, cargo, truck, driver…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Client</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cargo</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Truck</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Driver</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Helper</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Scheduled</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((trip) => {
            const style = statusStyles[trip.status] ?? { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 border-slate-200", label: trip.status }
            return (
              <tr key={trip.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${style.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-900 font-medium">{trip.clientName}</td>
                <td className="px-4 py-3 text-slate-600">{trip.cargoType}</td>
                <td className="px-4 py-3 text-slate-600">{trip.truckPlate ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{trip.driverName ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{trip.helperName ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {trip.scheduledDate
                    ? new Date(trip.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </td>
              </tr>
            )
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                {trips.length === 0 ? "No completed trips yet." : "No trips match your search."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </>
  )
}

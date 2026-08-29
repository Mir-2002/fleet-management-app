"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
    <div className="rounded-sm border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <Input
          placeholder="Search by client, cargo, truck, driver…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Client</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Cargo</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Truck</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Driver</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Helper</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Scheduled</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((trip) => {
            const style = statusStyles[trip.status] ?? { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 border-slate-200", label: trip.status }
            return (
              <TableRow key={trip.id}>
                <TableCell className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${style.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 font-medium">{trip.clientName}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{trip.cargoType}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{trip.truckPlate ?? "—"}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{trip.driverName ?? "—"}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{trip.helperName ?? "—"}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">
                  {trip.scheduledDate
                    ? new Date(trip.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </TableCell>
              </TableRow>
            )
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                {trips.length === 0 ? "No completed trips yet." : "No trips match your search."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

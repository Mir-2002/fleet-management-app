"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { TruckDetailDialog, type TruckRow } from "@/components/dashboard/forms/TruckDetailDialog"

export function TrucksTable({ rows }: { rows: TruckRow[] }) {
  const [selected, setSelected] = useState<TruckRow | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? rows.filter((r) =>
        [r.plate_number, r.truck_type, r.trucking].filter(Boolean).some((f) =>
          f!.toLowerCase().includes(query.toLowerCase())
        )
      )
    : rows

  function handleRowClick(row: TruckRow) {
    setSelected(row)
    setOpen(true)
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-slate-200">
        <Input
          placeholder="Search by plate, type, or trucking company…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plate Number</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Trucking</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr
              key={row.id}
              className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              onClick={() => handleRowClick(row)}
            >
              <td className="px-4 py-3 text-slate-900 font-medium">{row.plate_number}</td>
              <td className="px-4 py-3 text-slate-600">{row.truck_type}</td>
              <td className="px-4 py-3 text-slate-600">{row.trucking ?? <span className="text-slate-400">In-house</span>}</td>
              <td className="px-4 py-3">
                {row.is_on_trip ? (
                  <span className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    On Trip
                  </span>
                ) : row.is_available ? (
                  <span className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium bg-green-50 text-green-700 border-green-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 border-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Unavailable
                  </span>
                )}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                No trucks match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selected && (
        <TruckDetailDialog
          row={selected}
          open={open}
          onOpenChange={(val) => {
            setOpen(val)
            if (!val) setSelected(null)
          }}
        />
      )}
    </>
  )
}

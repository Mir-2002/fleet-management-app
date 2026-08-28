"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { DriverDetailDialog, type DriverRow } from "@/components/dashboard/forms/DriverDetailDialog"

export function DriversTable({ rows }: { rows: DriverRow[] }) {
  const [selected, setSelected] = useState<DriverRow | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? rows.filter((r) =>
        [r.full_name, r.license_number].filter(Boolean).some((f) =>
          f!.toLowerCase().includes(query.toLowerCase())
        )
      )
    : rows

  function handleRowClick(row: DriverRow) {
    setSelected(row)
    setOpen(true)
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-slate-200">
        <Input
          placeholder="Search by name or license…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">License Number</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr
              key={row.id}
              className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              onClick={() => handleRowClick(row)}
            >
              <td className="px-4 py-3 text-slate-900 font-medium">{row.full_name}</td>
              <td className="px-4 py-3 text-slate-600">{row.license_number ?? "—"}</td>
              <td className="px-4 py-3 text-slate-500">
                {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-400">
                No drivers match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selected && (
        <DriverDetailDialog
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

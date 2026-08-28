"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ClientDetailDialog, type ClientRow } from "@/components/dashboard/forms/ClientDetailDialog"

export function ClientsTable({ rows }: { rows: ClientRow[] }) {
  const [selected, setSelected] = useState<ClientRow | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? rows.filter((r) =>
        [r.full_name, r.contact_info].filter(Boolean).some((f) =>
          f!.toLowerCase().includes(query.toLowerCase())
        )
      )
    : rows

  function handleRowClick(row: ClientRow) {
    setSelected(row)
    setOpen(true)
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-slate-200">
        <Input
          placeholder="Search by name or contact…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contact Info</th>
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
              <td className="px-4 py-3 text-slate-600">{row.contact_info ?? "—"}</td>
              <td className="px-4 py-3 text-slate-500">
                {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-400">
                No clients match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selected && (
        <ClientDetailDialog
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

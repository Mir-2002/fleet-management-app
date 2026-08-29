"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
      <div className="px-4 py-3 border-b border-border">
        <Input
          placeholder="Search by name or contact…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Name</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Contact Info</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => handleRowClick(row)}
            >
              <TableCell className="px-4 py-3 font-medium">{row.full_name}</TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">{row.contact_info ?? "—"}</TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">
                {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No clients match your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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

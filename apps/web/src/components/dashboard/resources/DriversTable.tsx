"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
      <div className="px-4 py-3 border-b border-border">
        <Input
          placeholder="Search by name or license…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Name</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">License Number</TableHead>
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
              <TableCell className="px-4 py-3 text-muted-foreground">{row.license_number ?? "—"}</TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">
                {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No drivers match your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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

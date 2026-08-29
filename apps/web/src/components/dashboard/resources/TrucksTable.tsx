"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
      <div className="px-4 py-3 border-b border-border">
        <Input
          placeholder="Search by plate, type, or trucking company…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
      </div>

      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Plate Number</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Type</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Trucking</TableHead>
            <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => handleRowClick(row)}
            >
              <TableCell className="px-4 py-3 font-medium">{row.plate_number}</TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">{row.truck_type}</TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">
                {row.trucking ?? <span className="text-muted-foreground/60">In-house</span>}
              </TableCell>
              <TableCell className="px-4 py-3">
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
                  <span className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border-border">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    Unavailable
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No trucks match your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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

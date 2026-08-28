"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { COLUMNS, type KanbanCard as KanbanCardType, type KanbanStatus } from "./KanbanBoard"
import { TripDetailDialog } from "./TripDetailDialog"

const statusStyles: Record<KanbanStatus, { dot: string; badge: string; label: string }> = {
  todo: {
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    label: "To Do",
  },
  in_progress: {
    dot: "bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    label: "In Progress",
  },
  for_review: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    label: "For Review",
  },
  done: {
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
    label: "Done",
  },
}

const TAG_LABELS: Record<string, string> = {
  DRY_GOODS: 'Dry Goods',
  FROZEN: 'Frozen',
  FRAGILE: 'Fragile',
  PERISHABLE: 'Perishable',
  HAZMAT: 'Hazmat',
}

interface KanbanCardProps {
  card: KanbanCardType
  onStatusChange: (cardId: string, newStatus: KanbanStatus) => void
}

export function KanbanCard({ card, onStatusChange }: KanbanCardProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const style = statusStyles[card.status]

  const isFullyAssigned = !!(card.truckId && card.driverId && card.helperId)
  const tagSummary = (card.cargoHandlingTags ?? [])
    .map((t) => TAG_LABELS[t] ?? t)
    .join(', ')

  return (
    <>
      <div
        className="bg-white border border-slate-200 rounded-sm shadow-sm p-3 space-y-2 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setDetailOpen(true)}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 ${style.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                {style.label}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {COLUMNS.map((col) => {
                const colStyle = statusStyles[col.id]
                const blocked = col.id === "in_progress" && card.status === "todo" && !isFullyAssigned
                return (
                  <DropdownMenuItem
                    key={col.id}
                    disabled={blocked}
                    className="flex items-center gap-2 text-xs"
                    onSelect={() => onStatusChange(card.id, col.id)}
                  >
                    <span className={`h-2 w-2 rounded-full ${colStyle.dot}`} />
                    <span>{col.label}</span>
                    {blocked && <span className="ml-auto text-[10px] text-slate-400">assign first</span>}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-900 leading-snug">{card.clientName}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {tagSummary || '—'} &middot; {card.truckType}
          </p>
        </div>

        <p className="text-xs text-slate-400">{card.schedule}</p>

        {(card.truckPlate || card.driverName || card.helperName) ? (
          <div className="border-t border-slate-100 pt-1.5 text-[11px] text-slate-400 space-y-0.5">
            {card.truckPlate && <p>Truck: {card.truckPlate}</p>}
            {card.driverName && <p>Driver: {card.driverName}</p>}
            {card.helperName && <p>Helper: {card.helperName}</p>}
          </div>
        ) : (
          <p className="text-[11px] text-slate-300 border-t border-slate-100 pt-1.5">
            No assignments yet
          </p>
        )}
      </div>

      <TripDetailDialog card={card} open={detailOpen} onOpenChange={setDetailOpen} />
    </>
  )
}

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
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
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

function getDateUrgency(scheduledDate: string | null, status: KanbanStatus): 'overdue' | 'today' | 'normal' {
  if (!scheduledDate || status === 'done') return 'normal'
  const d = new Date(scheduledDate)
  const today = new Date()
  const scheduled = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (scheduled < todayDay) return 'overdue'
  if (scheduled.getTime() === todayDay.getTime()) return 'today'
  return 'normal'
}

export function KanbanCard({ card, onStatusChange }: KanbanCardProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const style = statusStyles[card.status]

  const isFullyAssigned = !!(card.truckId && card.driverId && card.helperId)
  const tagSummary = (card.cargoHandlingTags ?? [])
    .map((t) => TAG_LABELS[t] ?? t)
    .join(', ')

  const urgency = getDateUrgency(card.scheduledDate, card.status)
  const urgencyBorder = urgency === 'overdue'
    ? 'border-l-[3px] border-l-red-400'
    : urgency === 'today'
    ? 'border-l-[3px] border-l-amber-400'
    : ''

  return (
    <>
      <div
        className={`bg-card border border-border rounded-sm shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow duration-150 cursor-pointer ${urgencyBorder}`}
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
                    {blocked && <span className="ml-auto text-[10px] text-muted-foreground">assign first</span>}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground leading-snug">{card.clientName}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {tagSummary || '—'} &middot; {card.truckType}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <p className="text-xs text-muted-foreground">{card.schedule}</p>
          {urgency === 'overdue' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-red-50 text-red-600 border border-red-200">Overdue</span>
          )}
          {urgency === 'today' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">Today</span>
          )}
        </div>

        {(card.truckPlate || card.driverName || card.helperName) ? (
          <div className="border-t border-border/50 pt-1.5 text-[11px] text-muted-foreground space-y-0.5">
            {card.truckPlate && <p>Truck: {card.truckPlate}</p>}
            {card.driverName && <p>Driver: {card.driverName}</p>}
            {card.helperName && <p>Helper: {card.helperName}</p>}
          </div>
        ) : card.status === 'todo' ? (
          <div className="border-t border-border/50 pt-1.5">
            <span className="inline-flex items-center gap-1 rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              ⚠ Unassigned
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 border-t border-border/50 pt-1.5">
            No assignments yet
          </p>
        )}
      </div>

      <TripDetailDialog card={card} open={detailOpen} onOpenChange={setDetailOpen} />
    </>
  )
}

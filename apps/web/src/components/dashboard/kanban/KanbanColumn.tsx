import { Badge } from "@/components/ui/badge";
import type { KanbanCard as KanbanCardType, KanbanStatus } from "./KanbanBoard";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  column: { id: KanbanStatus; label: string };
  cards: KanbanCardType[];
  onStatusChange: (cardId: string, newStatus: KanbanStatus) => void;
}

export function KanbanColumn({ column, cards, onStatusChange }: KanbanColumnProps) {
  const unassignedCount = column.id === 'todo'
    ? cards.filter((c) => !c.truckId && !c.driverId && !c.helperId).length
    : 0

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-accent/40 rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 bg-accent border-b border-border shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {column.label}
        </span>
        <div className="flex items-center gap-1.5">
          {unassignedCount > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-700 border border-amber-200">
              {unassignedCount} unassigned
            </span>
          )}
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 min-w-[20px] justify-center">
            {cards.length}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-accent/40">
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} onStatusChange={onStatusChange} />
        ))}
        {cards.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-6">No cards</p>
        )}
      </div>
    </div>
  );
}

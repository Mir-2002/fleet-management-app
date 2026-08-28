import { Badge } from "@/components/ui/badge";
import type { KanbanCard as KanbanCardType, KanbanStatus } from "./KanbanBoard";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  column: { id: KanbanStatus; label: string };
  cards: KanbanCardType[];
  onStatusChange: (cardId: string, newStatus: KanbanStatus) => void;
}

export function KanbanColumn({ column, cards, onStatusChange }: KanbanColumnProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0 bg-slate-100 rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-200/70 border-b border-slate-200 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {column.label}
        </span>
        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 min-w-[20px] justify-center bg-slate-200 text-slate-600 hover:bg-slate-200">
          {cards.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-100">
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} onStatusChange={onStatusChange} />
        ))}
        {cards.length === 0 && (
          <p className="text-xs text-slate-400 text-center pt-6">No cards</p>
        )}
      </div>
    </div>
  );
}

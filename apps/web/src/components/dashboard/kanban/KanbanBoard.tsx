"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KanbanColumn } from "./KanbanColumn";
import { updateTripStatusAction } from "@/app/dashboard/trips/actions";
import { TripStatus } from "@fleetman/shared";

export type KanbanStatus = "todo" | "in_progress" | "for_review" | "done";

export interface KanbanCard {
  id: string;
  status: KanbanStatus;
  requestId: string;
  clientName: string;
  cargoHandlingTags: string[];
  truckType: string;
  schedule: string;
  scheduledDate: string | null;
  truckId: string | null;
  truckPlate: string | null;
  driverId: string | null;
  driverName: string | null;
  helperId: string | null;
  helperName: string | null;
}

export const COLUMNS: { id: KanbanStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "for_review", label: "For Review" },
  { id: "done", label: "Done" },
];

const toDbStatus: Record<KanbanStatus, TripStatus> = {
  todo: "ASSIGNED",
  in_progress: "IN_PROGRESS",
  for_review: "DELIVERED",
  done: "COMPLETED",
};

export function KanbanBoard({ trips }: { trips: KanbanCard[] }) {
  const router = useRouter();
  const [cards, setCards] = useState<KanbanCard[]>(trips);
  const [boardError, setBoardError] = useState<string | null>(null);

  useEffect(() => {
    setCards(trips);
  }, [trips]);

  async function handleStatusChange(cardId: string, newStatus: KanbanStatus) {
    const oldStatus = cards.find((c) => c.id === cardId)?.status;
    setBoardError(null);
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status: newStatus } : c))
    );
    const result = await updateTripStatusAction(cardId, toDbStatus[newStatus]);
    if (!result.success) {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, status: oldStatus! } : c))
      );
      setBoardError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col h-full gap-2">
      {boardError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-1.5 shrink-0">
          {boardError}
        </p>
      )}
      <div className="flex flex-1 min-h-0 gap-3">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={cards.filter((c) => c.status === column.id)}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </div>
  );
}

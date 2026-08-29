import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { NewTruckDialog } from "@/components/dashboard/forms/NewTruckDialog";
import { TrucksTable } from "@/components/dashboard/resources/TrucksTable";
import type { TruckRow } from "@/components/dashboard/forms/TruckDetailDialog";

export default async function TrucksPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: activeTrips }] = await Promise.all([
    supabase
      .from("trucks")
      .select("id, plate_number, truck_type, is_available, trucking, created_at")
      .order("plate_number"),
    supabase
      .from("trips")
      .select("truck_id")
      .in("status", ["ASSIGNED", "IN_PROGRESS"]),
  ]);

  if (error) console.error("[trucks] fetch error:", error.message);

  const onTripIds = new Set(
    activeTrips?.map((t) => t.truck_id).filter(Boolean) ?? []
  );
  const rows: TruckRow[] = (data ?? []).map((row) => ({
    ...row,
    is_on_trip: onTripIds.has(row.id),
  }));

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Trucks" action={<NewTruckDialog />} />
      <div className="flex-1 overflow-y-auto p-6">
        {rows.length === 0 ? (
          <EmptyState entity="Truck" />
        ) : (
          <div className="rounded-sm border border-border overflow-hidden">
            <TrucksTable rows={rows} />
          </div>
        )}
      </div>
    </div>
  );
}

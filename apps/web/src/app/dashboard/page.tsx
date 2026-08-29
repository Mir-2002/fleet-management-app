import { KpiPendingCard } from "@/components/dashboard/kpi/KpiPendingCard";
import { KpiTripsCard } from "@/components/dashboard/kpi/KpiTripsCard";
import { KpiDriversCard } from "@/components/dashboard/kpi/KpiDriversCard";
import { KpiHelpersCard } from "@/components/dashboard/kpi/KpiHelpersCard";
import { KanbanBoard, KanbanCard, KanbanStatus } from "@/components/dashboard/kanban/KanbanBoard";
import { createClient } from "@/lib/supabase/server";

type TripRow = {
  id: string;
  status: string;
  request_id: string;
  truck_id: string | null;
  driver_id: string | null;
  helper_id: string | null;
  requests: {
    cargo_handling_tags: string[];
    truck_type_requested: string;
    scheduled_date: string;
    profiles: { full_name: string }[] | { full_name: string } | null;
  } | null;
  trucks: { plate_number: string } | null;
  driver: { full_name: string } | null;
  helper: { full_name: string } | null;
};

const toKanbanStatus: Record<string, KanbanStatus | null> = {
  ASSIGNED: "todo",
  IN_PROGRESS: "in_progress",
  DELIVERED: "for_review",
  COMPLETED: "done",
  CANCELLED: null,
};

function getLast6MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function groupByMonth(rows: { created_at: string }[]): { month: string; count: number }[] {
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    const key = r.created_at.slice(0, 7);
    map[key] = (map[key] ?? 0) + 1;
  });
  return getLast6MonthKeys().map((m) => ({ month: m, count: map[m] ?? 0 }));
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000).toISOString();

  const [
    { data: tripsData },
    { count: pendingCount },
    { count: thisWeekCount },
    { count: lastWeekCount },
    { data: recentTripsData },
    { data: driversData },
    { data: helpersData },
  ] = await Promise.all([
    supabase
      .from("trips")
      .select(`
        id, status, request_id, truck_id, driver_id, helper_id,
        requests!request_id (
          cargo_handling_tags, truck_type_requested, scheduled_date,
          profiles!client_id (full_name)
        ),
        trucks!truck_id (plate_number),
        driver:profiles!driver_id (full_name),
        helper:profiles!helper_id (full_name)
      `)
      .neq("status", "CANCELLED"),
    supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING"),
    supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", fourteenDaysAgo)
      .lt("created_at", sevenDaysAgo),
    supabase
      .from("trips")
      .select("created_at")
      .gte("created_at", sixMonthsAgo),
    supabase.from("profiles").select("id").eq("role", "DRIVER"),
    supabase.from("profiles").select("id").eq("role", "HELPER"),
  ]);

  const rawTrips = (tripsData as unknown as TripRow[]) ?? [];

  const activeTrips = rawTrips.filter(
    (t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS"
  );
  const busyDriverIds = new Set(activeTrips.map((t) => t.driver_id).filter(Boolean));
  const busyHelperIds = new Set(activeTrips.map((t) => t.helper_id).filter(Boolean));

  const totalDrivers = driversData?.length ?? 0;
  const totalHelpers = helpersData?.length ?? 0;
  const availableDrivers = Math.max(0, totalDrivers - busyDriverIds.size);
  const availableHelpers = Math.max(0, totalHelpers - busyHelperIds.size);

  const weekDelta = (thisWeekCount ?? 0) - (lastWeekCount ?? 0);
  const monthlyData = groupByMonth(
    (recentTripsData ?? []) as { created_at: string }[]
  );

  const trips: KanbanCard[] = rawTrips
    .filter((t) => toKanbanStatus[t.status] !== null)
    .map((t) => {
      const req = t.requests;
      const profilesRaw = req?.profiles;
      const clientName = Array.isArray(profilesRaw)
        ? profilesRaw[0]?.full_name ?? "Unknown"
        : (profilesRaw as { full_name: string } | null)?.full_name ?? "Unknown";

      return {
        id: t.id,
        status: toKanbanStatus[t.status] as KanbanStatus,
        requestId: t.request_id,
        clientName,
        cargoHandlingTags: req?.cargo_handling_tags ?? [],
        truckType: req?.truck_type_requested ?? "—",
        schedule: req?.scheduled_date
          ? new Date(req.scheduled_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—",
        scheduledDate: req?.scheduled_date ?? null,
        truckId: t.truck_id,
        truckPlate: t.trucks?.plate_number ?? null,
        driverId: t.driver_id,
        driverName: t.driver?.full_name ?? null,
        helperId: t.helper_id,
        helperName: t.helper?.full_name ?? null,
      };
    });

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiPendingCard count={pendingCount ?? 0} weekDelta={weekDelta} />
          <KpiTripsCard activeCount={activeTrips.length} monthlyData={monthlyData} />
          <KpiDriversCard available={availableDrivers} total={totalDrivers} />
          <KpiHelpersCard available={availableHelpers} total={totalHelpers} />
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6 pt-4">
        <KanbanBoard trips={trips} />
      </div>
    </div>
  );
}

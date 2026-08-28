import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { NewRequestDialog } from "@/components/dashboard/forms/NewRequestDialog";
import { RequestsTable } from "@/components/dashboard/resources/RequestsTable";
import type { RequestRow } from "@/components/dashboard/forms/RequestDetailDialog";

export default async function RequestsPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: clientsData }] = await Promise.all([
    supabase
      .from("requests")
      .select("id, cargo_handling_tags, cargo_weight, cargo_length, cargo_width, cargo_height, cargo_measurement_mode, truck_type_requested, scheduled_date, scheduled_time, notes, status, profiles!client_id(full_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "CLIENT")
      .order("full_name"),
  ]);

  if (error) console.error("[requests] fetch error:", error.message);
  const rows = (data as unknown as RequestRow[]) ?? [];
  const clients = (clientsData ?? []) as { id: string; full_name: string }[];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Requests" action={<NewRequestDialog clients={clients} />} />
      <div className="flex-1 overflow-y-auto p-6">
        {rows.length === 0 ? (
          <EmptyState entity="Request" />
        ) : (
          <RequestsTable rows={rows} />
        )}
      </div>
    </div>
  );
}

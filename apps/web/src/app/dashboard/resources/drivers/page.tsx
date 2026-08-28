import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { NewDriverDialog } from "@/components/dashboard/forms/NewDriverDialog";
import { DriversTable } from "@/components/dashboard/resources/DriversTable";
import type { DriverRow } from "@/components/dashboard/forms/DriverDetailDialog";

export default async function DriversPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, license_number, contact_info, created_at")
    .eq("role", "DRIVER")
    .order("full_name");

  if (error) console.error("[drivers] fetch error:", error.message);
  const rows: DriverRow[] = data ?? [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Drivers" action={<NewDriverDialog />} />
      <div className="flex-1 overflow-y-auto p-6">
        {rows.length === 0 ? (
          <EmptyState entity="Driver" />
        ) : (
          <DriversTable rows={rows} />
        )}
      </div>
    </div>
  );
}

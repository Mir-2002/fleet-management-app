import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { NewHelperDialog } from "@/components/dashboard/forms/NewHelperDialog";
import { HelpersTable } from "@/components/dashboard/resources/HelpersTable";
import type { HelperRow } from "@/components/dashboard/forms/HelperDetailDialog";

export default async function HelpersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, contact_info, created_at")
    .eq("role", "HELPER")
    .order("full_name");

  if (error) console.error("[helpers] fetch error:", error.message);
  const rows: HelperRow[] = data ?? [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Helpers" action={<NewHelperDialog />} />
      <div className="flex-1 overflow-y-auto p-6">
        {rows.length === 0 ? (
          <EmptyState entity="Helper" />
        ) : (
          <HelpersTable rows={rows} />
        )}
      </div>
    </div>
  );
}

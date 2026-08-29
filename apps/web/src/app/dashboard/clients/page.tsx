import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { NewClientDialog } from "@/components/dashboard/forms/NewClientDialog";
import { ClientsTable } from "@/components/dashboard/resources/ClientsTable";
import type { ClientRow } from "@/components/dashboard/forms/ClientDetailDialog";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, contact_info, created_at")
    .eq("role", "CLIENT")
    .order("full_name");

  if (error) console.error("[clients] fetch error:", error.message);
  const rows: ClientRow[] = data ?? [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Clients" action={<NewClientDialog />} />
      <div className="flex-1 overflow-y-auto p-6">
        {rows.length === 0 ? (
          <EmptyState entity="Client" />
        ) : (
          <div className="rounded-sm border border-border overflow-hidden">
            <ClientsTable rows={rows} />
          </div>
        )}
      </div>
    </div>
  );
}

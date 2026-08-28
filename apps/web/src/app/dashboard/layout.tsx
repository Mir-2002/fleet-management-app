import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { count: pendingCount }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING"),
  ]);

  const displayName = profile?.full_name ?? user.email ?? "";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader displayName={displayName} email={user.email ?? ""} />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar pendingCount={pendingCount ?? 0} />
        <main className="flex-1 overflow-hidden bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server"
import { PortalHeader } from "@/components/portal/PortalHeader"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.user_role !== 'CLIENT') {
    return <>{children}</>
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name ?? user.email ?? ""

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <PortalHeader displayName={displayName} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

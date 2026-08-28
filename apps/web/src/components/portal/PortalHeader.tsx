"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { portalSignOut } from "@/app/portal/actions"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

const NAV_LINKS = [
  { label: "My Requests", href: "/portal/requests" },
  { label: "Invoices", href: "/portal/invoices" },
]

export function PortalHeader({ displayName }: { displayName: string }) {
  const pathname = usePathname()
  const initials = getInitials(displayName || "?")

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-blue-600">Fleetman</span>
          <span className="text-xs text-slate-400 font-normal">Client Portal</span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">{displayName}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
          {initials}
        </div>
        <form action={portalSignOut}>
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  )
}

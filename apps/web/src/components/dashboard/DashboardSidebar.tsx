"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Truck,
  UserCheck,
  HardHat,
  History,
  FileText,
  CreditCard,
  Banknote,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const resourcesNav = [
  { label: "Trucks", href: "/dashboard/resources/trucks", icon: Truck },
  { label: "Drivers", href: "/dashboard/resources/drivers", icon: UserCheck },
  { label: "Helpers", href: "/dashboard/resources/helpers", icon: HardHat },
];

const financeNav = [
  { label: "Invoices", href: "/dashboard/finance/invoices", icon: FileText },
  { label: "Expenses", href: "/dashboard/finance/expenses", icon: CreditCard },
  { label: "Payroll",  href: "/dashboard/finance/payroll",  icon: Banknote },
];

function NavItem({
  label,
  href,
  icon: Icon,
  active,
  badge,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors border-l-2 ${
        active
          ? "border-slate-900 bg-slate-100 font-medium text-slate-900"
          : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
      {badge != null && badge > 0 && (
        <span className="ml-auto text-[10px] font-semibold bg-amber-500 text-white rounded-full px-1.5 py-0.5 leading-none">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function DashboardSidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const mainNav = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, badge: undefined },
    { label: "Requests", href: "/dashboard/requests", icon: ClipboardList, badge: pendingCount },
    { label: "Clients", href: "/dashboard/clients", icon: Users, badge: undefined },
    { label: "History", href: "/dashboard/history", icon: History, badge: undefined },
  ];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50">
      <nav className="flex flex-col py-4 gap-0.5">
        <div className="px-4 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Operations
          </p>
        </div>

        {mainNav.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        <div className="px-4 pt-4 pb-1">
          <Separator className="mb-3" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Resources
          </p>
        </div>

        {resourcesNav.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        <div className="px-4 pt-4 pb-1">
          <Separator className="mb-3" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Finance
          </p>
        </div>

        {financeNav.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </nav>
    </aside>
  );
}

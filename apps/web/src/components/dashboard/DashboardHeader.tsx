import { Button } from "@/components/ui/button";
import { signOut } from "@/app/dashboard/actions";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface DashboardHeaderProps {
  displayName: string;
  email: string;
}

export function DashboardHeader({ displayName, email }: DashboardHeaderProps) {
  const initials = getInitials(displayName || email);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <span className="text-base font-semibold tracking-tight text-slate-900">
        Fleetman
      </span>

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">{displayName || email}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">
          {initials}
        </div>
        <form action={signOut}>
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
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
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-primary/80 bg-primary px-6">
      <span className="text-base font-semibold tracking-tight text-primary-foreground">
        Fleetman
      </span>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <span className="text-sm text-primary-foreground/80">{displayName || email}</span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20 text-xs font-medium text-primary-foreground"
          aria-label={`${displayName || email} avatar`}
        >
          {initials}
        </div>
        <form action={signOut}>
          <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors duration-150">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}

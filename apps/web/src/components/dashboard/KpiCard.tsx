const colorMap = {
  amber: "border-amber-500",
  indigo: "border-indigo-500",
  green: "border-green-500",
  sky: "border-sky-500",
};

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color: "amber" | "indigo" | "green" | "sky";
}

export function KpiCard({ label, value, subtext, color }: KpiCardProps) {
  return (
    <div
      className={`bg-card border border-border border-l-[3px] ${colorMap[color]} rounded-sm p-4 space-y-1`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold text-foreground tabular-nums">
          {value}
        </span>
        {subtext && (
          <span className="text-sm text-muted-foreground">{subtext}</span>
        )}
      </div>
    </div>
  );
}

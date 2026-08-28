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
      className={`bg-white border border-slate-200 border-l-[3px] ${colorMap[color]} rounded-sm p-4 space-y-1`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold text-slate-900 tabular-nums">
          {value}
        </span>
        {subtext && (
          <span className="text-sm text-slate-400">{subtext}</span>
        )}
      </div>
    </div>
  );
}

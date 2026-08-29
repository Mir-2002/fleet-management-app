export type StatusBadgeStyle = {
  dot: string
  badge: string
  label: string
}

const STATUS_STYLES: Record<string, StatusBadgeStyle> = {
  // Request statuses
  PENDING:       { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",    label: "Pending" },
  ACCEPTED:      { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Accepted" },
  DISPATCHED:    { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200",       label: "Dispatched" },
  COMPLETED:     { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",    label: "Completed" },
  CANCELLED:     { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Cancelled" },
  // Invoice statuses
  DRAFT:         { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",    label: "Draft" },
  SENT:          { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Sent" },
  PAID:          { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",    label: "Paid" },
  OVERDUE:       { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200",          label: "Overdue" },
  VOID:          { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200",   label: "Void" },
  // Trip / Kanban statuses
  ASSIGNED:      { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",    label: "Assigned" },
  IN_PROGRESS:   { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "In Progress" },
  DELIVERED:     { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",    label: "Delivered" },
  // Expense statuses
  APPROVED:      { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",    label: "Approved" },
  REJECTED:      { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200",          label: "Rejected" },
  // Payroll statuses
  FINALIZED:     { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200",       label: "Finalized" },
  PAID_OUT:      { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",    label: "Paid" },
}

const DEFAULT_STYLE: StatusBadgeStyle = {
  dot: "bg-slate-400",
  badge: "bg-slate-100 text-slate-600 border-slate-200",
  label: "Unknown",
}

export function getStatusStyle(status: string): StatusBadgeStyle {
  return STATUS_STYLES[status] ?? DEFAULT_STYLE
}

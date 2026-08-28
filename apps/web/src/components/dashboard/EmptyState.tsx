export function EmptyState({ entity }: { entity: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <p className="text-sm text-slate-500">No {entity.toLowerCase()}s yet.</p>
    </div>
  );
}

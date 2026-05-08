export function LeadSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border bg-card p-4 shadow-line">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-6 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}

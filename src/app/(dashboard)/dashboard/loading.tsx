export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded-full bg-muted" />
        <div className="h-7 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-64 rounded-lg bg-background" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-background p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded-full bg-muted" />
              <div className="h-8 w-8 rounded-lg bg-background" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-muted" />
            <div className="h-2 w-full rounded-full bg-background" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-background p-5 space-y-4">
        <div className="h-5 w-40 rounded-lg bg-muted" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-full rounded bg-background" />
          </div>
        ))}
      </div>
    </div>
  );
}

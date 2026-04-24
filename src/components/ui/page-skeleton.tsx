import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  kpiCount?: number;
  rowCount?: number;
  showCharts?: boolean;
  showSearch?: boolean;
}

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-5"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4">
        <Skeleton className="h-5 w-40" />
      </div>
      {/* Rows */}
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-16 hidden sm:block" />
            <Skeleton className="h-4 w-14 hidden md:block" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <Skeleton className="h-5 w-48 mb-6" />
      <div className="flex items-end gap-2 h-[220px]">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{
              height: `${30 + ((i * 17) % 60)}%`,
              animationDelay: `${i * 40}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="max-w-sm">
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}

export function PageSkeleton({
  kpiCount = 4,
  rowCount = 5,
  showCharts = false,
  showSearch = true,
}: PageSkeletonProps) {
  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* KPIs */}
      <KpiSkeleton count={kpiCount} />

      {/* Charts */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <ChartSkeleton />
        </div>
      )}

      {/* Search */}
      {showSearch && <SearchSkeleton />}

      {/* Table */}
      <TableSkeleton rows={rowCount} />
    </div>
  );
}
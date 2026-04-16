import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function SuppliersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* M\u00E9tricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-full sm:w-[160px] rounded-lg" />
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="border-b border-border p-4">
            <div className="grid grid-cols-7 gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          </div>
          {/* Table Rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="border-b border-border last:border-0 p-4"
            >
              <div className="grid grid-cols-7 gap-4 items-center">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-3.5 w-3.5 rounded-sm" />
                  ))}
                </div>
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-3.5 w-3.5 rounded-sm" />
                  ))}
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
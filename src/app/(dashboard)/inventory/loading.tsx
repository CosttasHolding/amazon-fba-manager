import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>

      {/* M\u00E9tricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="border-b border-border px-4 py-3">
              <div className="grid grid-cols-7 gap-4">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16 mx-auto" />
                <Skeleton className="h-4 w-16 mx-auto" />
                <Skeleton className="h-4 w-16 mx-auto" />
                <Skeleton className="h-4 w-10 mx-auto" />
                <Skeleton className="h-4 w-14 mx-auto" />
              </div>
            </div>
            {/* Table Rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="border-b border-border last:border-0 px-4 py-3.5"
              >
                <div className="grid grid-cols-7 gap-4 items-center">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-8 mx-auto" />
                  <Skeleton className="h-4 w-8 mx-auto" />
                  <Skeleton className="h-4 w-8 mx-auto" />
                  <Skeleton className="h-4 w-8 mx-auto" />
                  <Skeleton className="h-5 w-16 rounded-full mx-auto" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <Skeleton className="h-3 w-14 mx-auto" />
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
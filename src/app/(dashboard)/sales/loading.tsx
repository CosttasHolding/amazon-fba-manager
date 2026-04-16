import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function SalesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-28" />
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
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="border-b border-border px-4 py-3">
              <div className="grid grid-cols-6 gap-4">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16 mx-auto" />
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-4 w-20 ml-auto" />
                <Skeleton className="h-4 w-14 ml-auto" />
              </div>
            </div>
            {/* Table Rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="border-b border-border last:border-0 px-4 py-3.5"
              >
                <div className="grid grid-cols-6 gap-4 items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-8 mx-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-4 w-14 ml-auto" />
                  <Skeleton className="h-4 w-14 ml-auto" />
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
              <div className="flex items-start justify-between mb-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mt-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <Skeleton className="h-3 w-14 mx-auto" />
                    <Skeleton className="h-4 w-12 mx-auto" />
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
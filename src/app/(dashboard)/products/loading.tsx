import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ProductsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Mobile: Cards view */}
      <div className="lg:hidden space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <Skeleton className="h-2.5 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: Table view */}
      <Card className="hidden lg:block">
        <div className="p-5 border-b border-border">
          <Skeleton className="h-10 w-72 rounded-lg" />
        </div>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="border-b border-border px-4 py-3">
            <div className="grid grid-cols-10 gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20 col-span-2" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
          {/* Table Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border-b border-border last:border-0 px-4 py-3.5"
            >
              <div className="grid grid-cols-10 gap-4 items-center">
                <Skeleton className="h-4 w-16" />
                <div className="col-span-2 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14 ml-auto" />
                <Skeleton className="h-4 w-14 ml-auto" />
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-4 w-10 ml-auto" />
                <Skeleton className="h-4 w-8 mx-auto" />
                <Skeleton className="h-5 w-14 rounded-full mx-auto" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
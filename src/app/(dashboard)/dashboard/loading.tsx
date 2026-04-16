import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* KPI Cards - matches grid grid-cols-2 lg:grid-cols-4 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                  <Skeleton className="h-3 w-20 sm:w-28" />
                  <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" />
                  <Skeleton className="h-3 w-24 hidden sm:block" />
                </div>
                <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
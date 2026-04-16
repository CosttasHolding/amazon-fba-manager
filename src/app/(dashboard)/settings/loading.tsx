import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-8 w-44" />
        </div>
        <Skeleton className="h-4 w-72 mt-2" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto pb-px">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Card content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
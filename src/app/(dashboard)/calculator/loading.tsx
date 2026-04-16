import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CalculatorLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-1" />
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader className="pb-4">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full sm:w-28 rounded-lg" />
        </CardContent>
      </Card>

      {/* Results Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className={i === 2 ? "col-span-2 md:col-span-1" : ""}>
            <CardContent className="pt-6 text-center space-y-2">
              <Skeleton className="h-10 w-10 rounded-lg mx-auto" />
              <Skeleton className="h-3 w-20 mx-auto" />
              <Skeleton className="h-8 w-20 mx-auto" />
              {i === 1 && <Skeleton className="h-5 w-32 rounded-full mx-auto" />}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breakdown Card */}
      <Card>
        <CardHeader className="pb-4">
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
          <div className="border-t border-border pt-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
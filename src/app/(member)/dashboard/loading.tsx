import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Card className="border-silver/24 bg-gradient-to-br from-silver/12 via-card/82 to-card/72">
        <CardHeader className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-4 w-[36rem] max-w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`dashboard-badge-${index}`} className="h-7 w-28 rounded-full" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="h-44 w-full rounded-3xl" />
          </div>
          <Skeleton className="h-28 w-full rounded-3xl" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="border-b border-silver/12 pb-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-3 h-8 w-72 max-w-full" />
          <Skeleton className="mt-3 h-4 w-[30rem] max-w-full" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-72 w-full rounded-3xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`dashboard-weekly-${index}`} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`dashboard-step-${index}`} className="h-56 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

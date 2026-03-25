import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardResourcesLoading() {
  return (
    <div className="space-y-6">
      <Card className="border-silver/24 bg-gradient-to-br from-silver/12 via-card/82 to-card/68">
        <CardHeader className="space-y-4">
          <Skeleton className="h-7 w-40 rounded-full" />
          <Skeleton className="h-10 w-80 max-w-full" />
          <Skeleton className="h-4 w-[36rem] max-w-full" />
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <div className="grid gap-4">
          <Skeleton className="h-36 w-full rounded-3xl" />
          <Skeleton className="h-36 w-full rounded-3xl" />
        </div>
      </div>

      <Card className="border-silver/16 bg-card/62">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`resource-filter-${index}`} className="h-11 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={`resource-card-${index}`} className="h-64 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

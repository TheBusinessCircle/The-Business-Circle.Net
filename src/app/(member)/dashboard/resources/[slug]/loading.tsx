import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardResourceDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-36" />

      <Card className="border-silver/24 bg-gradient-to-br from-silver/12 via-card/82 to-card/68">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="h-10 w-[38rem] max-w-full" />
          <Skeleton className="h-4 w-[34rem] max-w-full" />
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`resource-detail-${index}`} className="h-56 w-full rounded-3xl" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-52 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

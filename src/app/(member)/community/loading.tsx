import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommunityLoading() {
  return (
    <div className="space-y-5">
      <Card className="border-silver/24 bg-gradient-to-br from-silver/12 via-card/82 to-card/72">
        <CardHeader className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-[36rem] max-w-full" />
        </CardHeader>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Skeleton className="h-56 w-full rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>

        <Card className="border-border/90 bg-card/75 shadow-panel-soft">
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`community-rail-${index}`} className="h-28 w-full rounded-2xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

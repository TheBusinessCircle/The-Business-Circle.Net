import { Skeleton } from "@/components/ui/skeleton";

export default function BlueprintLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-gold/25 bg-card/72 p-8 shadow-panel backdrop-blur">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-6 h-14 w-full max-w-2xl" />
        <Skeleton className="mt-4 h-5 w-full max-w-3xl" />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-silver/14 bg-background/24 p-5">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="mt-4 h-20 w-full" />
          </div>
        ))}
      </section>
      <section className="rounded-[2rem] border border-silver/14 bg-background/24 p-6">
        <Skeleton className="h-9 w-56" />
        <div className="mt-6 grid gap-4 lg:grid-cols-[220px_1fr]">
          <Skeleton className="h-40 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        </div>
      </section>
    </div>
  );
}

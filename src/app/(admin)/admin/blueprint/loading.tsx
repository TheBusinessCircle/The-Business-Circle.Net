import { Skeleton } from "@/components/ui/skeleton";

export default function AdminBlueprintLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-gold/25 bg-card/72 p-6 shadow-panel backdrop-blur">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-4 h-12 w-full max-w-xl" />
        <Skeleton className="mt-3 h-5 w-full max-w-3xl" />
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(260px,0.32fr)_1fr]">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-[560px] w-full rounded-[2rem]" />
      </section>
    </div>
  );
}

export default function CircleCardLoading() {
  return (
    <div className="circle-card-loading-shell" aria-label="Loading Circle Card page" aria-live="polite">
      <div className="h-4 w-16 animate-pulse rounded-full bg-gold/16" />
      <div className="mt-5 rounded-[1.75rem] border border-silver/12 bg-card/54 p-5 sm:p-7">
        <div className="h-10 w-2/3 max-w-md animate-pulse rounded-xl bg-silver/10" />
        <div className="mt-3 h-4 w-5/6 max-w-xl animate-pulse rounded-lg bg-silver/8" />
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-2xl bg-silver/7" />
          <div className="h-24 animate-pulse rounded-2xl bg-silver/7" />
          <div className="h-24 animate-pulse rounded-2xl bg-silver/7" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

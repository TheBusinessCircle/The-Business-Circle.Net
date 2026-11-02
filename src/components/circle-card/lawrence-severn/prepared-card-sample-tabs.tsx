import Link from "next/link";
import { preparedCardSampleHrefs, type PreparedCardSample } from "./sample-presentation";

/** Replace the prepared route's existing Free/Pro nav with this component. */
export function PreparedCardSampleTabs({ previewHref, activeSample, hasCustomPresentation }: {
  previewHref: string;
  activeSample: PreparedCardSample;
  hasCustomPresentation: boolean;
}) {
  const hrefs = preparedCardSampleHrefs(previewHref);
  const samples: PreparedCardSample[] = hasCustomPresentation ? ["free", "pro", "custom"] : ["free", "pro"];
  return <nav aria-label="Circle Card samples" className="flex flex-wrap gap-2">
    {samples.map(sample => <Link key={sample} href={hrefs[sample]} aria-current={activeSample === sample ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm ${activeSample === sample ? "border-gold bg-gold/15 text-gold" : "border-silver/20 text-silver hover:border-gold/50"}`}>
      {sample === "free" ? "Free" : sample === "pro" ? "Pro · £9.99/month" : "Custom"}
    </Link>)}
  </nav>;
}

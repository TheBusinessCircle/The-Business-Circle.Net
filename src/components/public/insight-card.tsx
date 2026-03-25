import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicInsightSummary } from "@/types/insights";

type InsightCardProps = {
  insight: PublicInsightSummary;
  featured?: boolean;
};

const insightDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

export function InsightCard({ insight, featured = false }: InsightCardProps) {
  return (
    <Link
      href={`/insights/${insight.slug}`}
      className={cn(
        "group block rounded-[2rem] border border-border/80 bg-card/72 p-6 shadow-panel-soft transition-all duration-200 hover:-translate-y-1 hover:border-gold/28 hover:bg-card/82",
        featured
          ? "border-gold/28 bg-gradient-to-br from-gold/10 via-card/78 to-card/72 p-7 sm:p-8"
          : "interactive-card"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-muted">
        <span className="rounded-full border border-border/70 bg-background/30 px-3 py-1">
          Insights
        </span>
        <span className="rounded-full border border-border/70 bg-background/30 px-3 py-1">
          {insight.category}
        </span>
        <span className="rounded-full border border-border/70 bg-background/30 px-3 py-1">
          {insight.typeLabel}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <h2
          className={cn(
            "font-display leading-tight text-foreground transition-colors group-hover:text-silver",
            featured ? "text-3xl sm:text-4xl" : "text-2xl"
          )}
        >
          {insight.title}
        </h2>
        <p className={cn("leading-relaxed text-muted", featured ? "max-w-3xl text-base" : "text-sm")}>
          {insight.summary}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.08em] text-silver">
        <span>{insightDateFormatter.format(insight.publishedAt)}</span>
        <span>{insight.readMinutes} min read</span>
        <span>{insight.tierLabel} depth inside membership</span>
      </div>

      <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
        Read insight
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Lock } from "lucide-react";
import { CTASection, InsightCard, SectionHeading } from "@/components/public";
import { Button } from "@/components/ui/button";
import { INSIGHT_SECTION_COPY } from "@/config/insights";
import { createPageMetadata } from "@/lib/seo";
import {
  listInsightTopicClusters,
  listPublicInsights
} from "@/server/insights/insight.service";

export const metadata: Metadata = createPageMetadata({
  title: "Business Insights",
  description:
    "Public business insight articles from The Business Circle, designed to create clarity, attract organic search traffic, and lead into membership.",
  keywords: [
    "business insights for founders",
    "founder strategy articles",
    "business growth insights",
    "business membership content"
  ],
  path: "/insights"
});

const journeyItems = [
  {
    icon: Compass,
    title: "Public insight",
    description:
      "Each article is written to help a business owner understand the issue clearly without overwhelming the page."
  },
  {
    icon: BookOpen,
    title: "Member structure",
    description:
      "The deeper framework, review prompts, and execution sequence stay inside the Business Circle where they belong."
  },
  {
    icon: Lock,
    title: "Calm conversion",
    description:
      "Locked depth and relevant next steps create curiosity without turning the experience into a noisy gated funnel."
  }
] as const;

export default function InsightsPage() {
  const insights = listPublicInsights();
  const topicClusters = listInsightTopicClusters();
  const [featuredInsight, ...remainingInsights] = insights;

  return (
    <div className="space-y-14 pb-14 sm:space-y-16 lg:space-y-16 lg:pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/58 p-8 shadow-panel sm:p-10 lg:p-12">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute -right-16 top-0 h-72 w-72 rounded-full bg-gold/18 blur-[110px]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-6">
            <p className="premium-kicker">Insights</p>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-display text-4xl leading-tight text-foreground sm:text-5xl">
                {INSIGHT_SECTION_COPY.title}
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-muted">
                {INSIGHT_SECTION_COPY.description}
              </p>
            </div>
            <p className="max-w-3xl text-base leading-relaxed text-muted">
              {INSIGHT_SECTION_COPY.supportLine}
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#latest-insights">
                <Button size="lg">
                  Explore Insights
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </a>
              <Link href="/membership?from=/insights">
                <Button size="lg" variant="outline">
                  Explore Membership
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-[1.75rem] border border-silver/20 bg-background/28 p-5">
              <p className="premium-kicker">Publishing rhythm</p>
              <h2 className="mt-4 font-display text-2xl text-foreground">
                Curated weekly batches, not a daily content dump
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                The public layer is built for 3 to 5 strong articles each week, rewritten from internal resources for discovery, search, and curiosity.
              </p>
            </article>
            <article className="rounded-[1.75rem] border border-border/80 bg-background/22 p-5">
              <p className="premium-kicker">Authority structure</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {topicClusters.length} structured topic clusters connect public clarity to the deeper member layer without turning the site into SEO noise.
              </p>
            </article>
          </div>
        </div>
      </section>

      {featuredInsight ? (
        <section className="space-y-6">
          <SectionHeading
            label="Featured Insight"
            title="The latest public article"
            description="A stronger discovery layer should feel useful on its own before it asks anyone to go further."
          />
          <InsightCard insight={featuredInsight} featured />
        </section>
      ) : null}

      <section className="space-y-6">
        <SectionHeading
          label="Topic Clusters"
          title="Structured topic areas, not disconnected articles"
          description="Each topic cluster is designed to build authority around a real business problem and lead naturally into the deeper member layer."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {topicClusters.map((cluster) => (
            <article key={cluster.slug} className="public-panel interactive-card p-6">
              <p className="premium-kicker">{cluster.title}</p>
              <h2 className="mt-4 font-display text-2xl text-foreground">
                {cluster.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{cluster.description}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{cluster.supportLine}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em] text-silver">
                <span>Pillar page</span>
                <span>{cluster.articleCount} supporting article{cluster.articleCount === 1 ? "" : "s"}</span>
                <span>{cluster.keyword}</span>
              </div>
              <div className="mt-5 space-y-2">
                {cluster.supportingInsights.slice(0, 2).map((insight) => (
                  <Link
                    key={insight.slug}
                    href={`/insights/${insight.slug}`}
                    className="block rounded-xl border border-border/80 bg-background/20 px-3 py-3 text-sm text-muted transition-colors hover:border-silver/24 hover:text-foreground"
                  >
                    {insight.title}
                  </Link>
                ))}
              </div>
              <div className="mt-5">
                <Link href={cluster.href} className="inline-flex items-center gap-2 text-sm text-silver hover:text-foreground">
                  Explore this topic
                  <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          label="How Insights Work"
          title="Clarity first, depth second"
          description="The experience is built to feel valuable in public and more structured inside the Circle."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {journeyItems.map((item) => (
            <article key={item.title} className="public-panel interactive-card p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                <item.icon size={18} />
              </span>
              <h3 className="mt-5 font-display text-2xl text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="latest-insights" className="space-y-6">
        <SectionHeading
          label="Latest Insights"
          title="Search-led articles for business owners"
          description="Each piece is structured for indexability, calm reading, and a natural route into membership."
        />
        <div className="grid gap-5 lg:grid-cols-2">
          {remainingInsights.map((insight) => (
            <InsightCard key={insight.slug} insight={insight} />
          ))}
        </div>
      </section>

      <CTASection
        title="Go from public insight to member structure"
        description="When you want the framework, the clearer sequence, and the practical next steps, continue inside the Business Circle."
        primaryAction={{ href: "/membership?from=/insights", label: "Continue inside the Business Circle" }}
        secondaryAction={{ href: "/founder", label: "Meet The Founder", variant: "outline" }}
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Lock } from "lucide-react";
import {
  AnswerBlock,
  CTASection,
  FAQSection,
  InsightCard,
  JsonLd,
  SectionHeading,
  TwoPathCta
} from "@/components/public";
import { PublicTopVisual } from "@/components/visual-media";
import { Button } from "@/components/ui/button";
import { INSIGHT_SECTION_COPY } from "@/config/insights";
import { createPageMetadata } from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFaqSchema,
  buildWebPageSchema
} from "@/lib/structured-data";
import {
  listInsightTopicClusters,
  listPublicInsights
} from "@/server/insights/insight.service";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const metadata: Metadata = createPageMetadata({
  title: "Business Owner Insights | The Business Circle Network",
  description:
    "Business growth insights for founders covering clarity, strategy, better decisions, and the next step into Business Circle membership.",
  keywords: [
    "business growth insights for founders",
    "founder strategy articles",
    "business growth insights",
    "business decision making for founders"
  ],
  path: "/insights"
});

const INSIGHTS_FAQS = [
  {
    question: "What is BCN Intelligence?",
    answer:
      "BCN Intelligence is the insight layer of The Business Circle Network. It helps business owners understand relevant business news, market shifts and practical issues through a calmer, more useful lens than normal news feeds."
  },
  {
    question: "Why should business owners read BCN Intelligence?",
    answer:
      "It helps owners focus on what changed, why it matters, who it could affect and what to think about next without adding more noise."
  },
  {
    question: "Is the deeper insight layer inside membership?",
    answer:
      "Yes. Public insights are useful on their own, while membership adds the fuller resources, prompts, rooms and practical follow-through."
  }
] as const;

const journeyItems = [
  {
    icon: Compass,
    title: "Start here",
    description:
      "Use the free insights layer to understand the issue clearly before you decide whether to go deeper."
  },
  {
    icon: BookOpen,
    title: "Go deeper inside membership",
    description:
      "Full frameworks, review prompts, and the execution sequence stay inside membership where the deeper structure belongs."
  },
  {
    icon: Lock,
    title: "This is just the surface layer",
    description:
      "The free layer should be useful on its own, while membership makes the next move clearer when you want more depth."
  }
] as const;

export default async function InsightsPage() {
  const insights = listPublicInsights();
  const topicClusters = listInsightTopicClusters();
  const insightsHeroPlacement = await getVisualMediaPlacement("intelligence.hero");
  const startHereInsight =
    insights.find(
      (insight) => insight.slug === "why-your-business-is-not-growing-even-though-you-are-working-hard"
    ) ?? insights[0];
  const remainingInsights = insights.filter((insight) => insight.slug !== startHereInsight?.slug);

  return (
    <div className="public-page-stack">
      <JsonLd
        data={buildCollectionPageSchema({
          title: "Business Owner Insights",
          description:
            "BCN Intelligence helps owners read business issues through a calmer and more useful lens.",
          path: "/insights",
          keywords: [
            "business owner insights",
            "BCN Intelligence",
            "business growth insights",
            "founder strategy articles"
          ],
          itemPaths: insights.map((insight) => `/insights/${insight.slug}`)
        })}
      />
      <JsonLd
        data={buildWebPageSchema({
          title: "BCN Intelligence",
          description:
            "The insight layer of The Business Circle Network for business owners who want clearer context.",
          path: "/insights",
          primaryQuestion: "What is BCN Intelligence?",
          primaryAnswer:
            "BCN Intelligence is the insight layer of The Business Circle Network. It helps business owners understand relevant business news, market shifts and practical issues through a calmer, more useful lens than normal news feeds."
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/home" },
          { name: "Insights", path: "/insights" }
        ])}
      />
      <JsonLd data={buildFaqSchema([...INSIGHTS_FAQS])} />

      <PublicTopVisual
        placement={insightsHeroPlacement}
        eyebrow="BCN Intelligence"
        title="Signal over noise for founders who want clearer decisions."
        description="Start with a clearer editorial layer before you move deeper into the insight content."
        tone="anchored"
        fallbackLabel="Insights top visual"
      />

      <section className="public-hero-spacing relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/58 shadow-panel">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.48)_100%),linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.62)_100%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-5">
            <p className="premium-kicker">You&apos;re In The Insights Layer</p>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-display text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
                {INSIGHT_SECTION_COPY.title}
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-white/80">
                {INSIGHT_SECTION_COPY.description}
              </p>
            </div>
            <p className="max-w-3xl text-base leading-relaxed text-white/75">
              {INSIGHT_SECTION_COPY.supportLine}
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#start-here">
                <Button size="lg">
                  Start Here
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </a>
              <Link href="/membership?from=/insights">
                <Button size="lg" variant="outline">
                  Go Deeper Inside Membership
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-[1.55rem] border border-silver/20 bg-background/28 p-4 sm:p-5">
              <p className="premium-kicker">Browse topics</p>
              <h2 className="mt-4 font-display text-2xl text-foreground">
                Clarity, strategy, and better decisions for founders
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                This layer is organised around real business pressure, so it is easier to scan by
                topic before you read deeper.
              </p>
            </article>
            <article className="rounded-[1.55rem] border border-border/80 bg-background/22 p-4 sm:p-5">
              <p className="premium-kicker">Most relevant right now</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {topicClusters.length} topic paths connect the public insight layer to the deeper
                membership library without turning the site into SEO noise.
              </p>
            </article>
          </div>
        </div>
      </section>

      <AnswerBlock
        question="What is BCN Intelligence?"
        answer="BCN Intelligence is the insight layer of The Business Circle Network. It helps business owners understand relevant business news, market shifts and practical issues through a calmer, more useful lens than normal news feeds."
      />

      <section className="public-section">
        <SectionHeading
          label="Why BCN Intelligence matters"
          title="Business owners do not need more noise. They need useful context."
          description="The important part is not just what happened. It is why it matters, who it affects, what it could change and what a serious owner should think about next."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            "What changed",
            "Why it matters to owners",
            "Who it affects",
            "What to watch next"
          ].map((item) => (
            <article
              key={item}
              className="rounded-[1.4rem] border border-border/80 bg-card/66 p-5 text-sm text-foreground shadow-panel-soft"
            >
              {item}
            </article>
          ))}
        </div>
      </section>

      {startHereInsight ? (
        <section id="start-here" className="space-y-6">
          <SectionHeading
            label="Start Here"
            title="Free business growth insight to begin with"
            description="If you are new to the platform, start with the clearest article first before you browse the wider topic clusters."
          />
          <InsightCard insight={startHereInsight} featured />
        </section>
      ) : null}

      <section className="space-y-6">
        <SectionHeading
          label="Browse Topics"
          title="Business growth topics organised around real business pressure"
          description="Choose the topic that matches the business pressure you are dealing with right now, then follow the supporting articles underneath it."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {topicClusters.map((cluster) => (
            <article key={cluster.slug} className="public-panel interactive-card p-5 sm:p-6">
              <p className="premium-kicker">{cluster.title}</p>
              <h2 className="mt-4 font-display text-2xl text-foreground">
                {cluster.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{cluster.description}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{cluster.supportLine}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em] text-silver">
                <span>Topic guide</span>
                <span>{cluster.articleCount} supporting article{cluster.articleCount === 1 ? "" : "s"}</span>
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
          label="How This Layer Works"
          title="Free insight first. Membership depth next."
          description="The experience is built to feel useful in public, then more structured inside membership when you want the full framework."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {journeyItems.map((item) => (
            <article key={item.title} className="public-panel interactive-card p-5 sm:p-6">
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
          title="Start with what's most relevant right now"
          description="These business growth insights are ordered for calm scanning, current relevance, and a natural move into deeper membership when it fits."
        />
        <div className="grid gap-5 lg:grid-cols-2">
          {remainingInsights.map((insight) => (
            <InsightCard key={insight.slug} insight={insight} />
          ))}
        </div>
      </section>

      <CTASection
        title="This is just the surface layer"
        description="When you want the full frameworks, clearer sequence, and practical next steps, go deeper inside membership."
        primaryAction={{ href: "/membership?from=/insights", label: "Join as a founding member" }}
        secondaryAction={{ href: "/audit", label: "Run the Founder Audit", variant: "outline" }}
        analyticsSource="insights"
      />

      <FAQSection
        label="BCN Intelligence"
        title="Questions about the insight layer"
        description="Short answers on how public insight connects to the private member environment."
        items={[...INSIGHTS_FAQS]}
      />

      <TwoPathCta source="insights" />
    </div>
  );
}

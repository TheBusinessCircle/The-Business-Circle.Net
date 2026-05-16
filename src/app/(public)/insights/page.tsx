import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, MessageSquareText, SearchCheck } from "lucide-react";
import {
  CTASection,
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
  buildWebPageSchema
} from "@/lib/structured-data";
import {
  listInsightTopicClusters,
  listPublicInsights
} from "@/server/insights/insight.service";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = createPageMetadata({
  title: "Founder-Led Business Insights | The Business Circle Network",
  description:
    "Founder-led business insights for owners who want clearer thinking, better conversations, stronger trust signals and a calmer environment to grow inside.",
  keywords: [
    "business owner insights",
    "founder led business thinking",
    "business owner network UK",
    "AI search visibility for business"
  ],
  path: "/insights"
});

const INSIGHT_AREAS = [
  "Owner reality",
  "Founder clarity",
  "Business growth",
  "Trust and visibility",
  "AI search and business visibility",
  "Better conversations",
  "Decision making",
  "The thinking behind The Business Circle Network"
] as const;

const BUSINESS_SIGNALS = [
  {
    icon: SearchCheck,
    title: "Trust is becoming easier to measure and harder to fake.",
    description:
      "Buyers and AI search systems both reward businesses that are clear, structured and supported by real signals."
  },
  {
    icon: MessageSquareText,
    title: "Better decisions usually come from better conversations.",
    description:
      "Owners need rooms where context is understood before advice is offered."
  },
  {
    icon: Compass,
    title: "AI search will reward businesses that are clear and easy to understand.",
    description:
      "Visibility now depends on public clarity, trusted structure and useful answers that do not become thin content."
  }
] as const;

export default async function InsightsPage() {
  const insights = listPublicInsights();
  const topicClusters = listInsightTopicClusters();
  const insightsHeroPlacement = await getVisualMediaPlacement("intelligence.hero");
  const featuredInsight = insights[0] ?? null;
  const latestInsights = insights.filter((insight) => insight.slug !== featuredInsight?.slug).slice(0, 12);

  return (
    <div className="public-page-stack">
      <JsonLd
        data={buildCollectionPageSchema({
          title: "Founder-Led Business Insights",
          description:
            "Public insight previews from The Business Circle Network for owners who want clearer thinking before deeper member resources.",
          path: "/insights",
          keywords: [
            "business owner insights",
            "founder clarity",
            "business growth",
            "AI search visibility"
          ],
          itemPaths: insights.map((insight) => `/insights/${insight.slug}`)
        })}
      />
      <JsonLd
        data={buildWebPageSchema({
          title: "Founder-Led Business Insights",
          description:
            "The public insight layer of The Business Circle Network for serious business owners.",
          path: "/insights",
          primaryQuestion: "What are BCN Insights?",
          primaryAnswer:
            "BCN Insights are public preview notes for business owners who want clearer thinking, better conversations and a calmer route into deeper member resources."
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/home" },
          { name: "Insights", path: "/insights" }
        ])}
      />

      <PublicTopVisual
        placement={insightsHeroPlacement}
        eyebrow="BCN Insights"
        title="Founder-led insight for owners who want clearer thinking."
        description="A public preview layer for serious business owners, with the full breakdowns kept inside membership."
        tone="anchored"
        fallbackLabel="Insights top visual"
      />

      <section className="public-hero-spacing relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/58 shadow-panel">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.48)_100%),linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.62)_100%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-end">
          <div className="space-y-5">
            <p className="premium-kicker">Public preview hub</p>
            <h1 className="max-w-5xl font-display text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
              {INSIGHT_SECTION_COPY.description}
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-white/78 sm:text-lg">
              {INSIGHT_SECTION_COPY.supportLine}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/membership?from=/insights">
                <Button size="lg">
                  Explore Membership
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <Link href="/audit">
                <Button size="lg" variant="outline">
                  Run The Founder Audit
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-gold/24 bg-background/26 p-5">
            <p className="premium-kicker">What BCN Insights covers</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {INSIGHT_AREAS.map((area) => (
                <span
                  key={area}
                  className="rounded-xl border border-border/70 bg-card/42 px-3 py-2 text-sm text-silver"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {featuredInsight ? (
        <section className="space-y-6">
          <SectionHeading
            label="Featured insight"
            title="The latest public preview"
            description="Useful enough to stand on its own, but intentionally incomplete. The deeper resource continues inside the protected member library."
          />
          <InsightCard insight={featuredInsight} featured />
        </section>
      ) : null}

      <section className="space-y-6">
        <SectionHeading
          label="Latest insights"
          title="Published public previews"
          description="Only insights with a published date of today or earlier are visible here. Future insight URLs stay unavailable until release."
        />
        {latestInsights.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {latestInsights.map((insight) => (
              <InsightCard key={insight.slug} insight={insight} />
            ))}
          </div>
        ) : (
          <article className="public-panel p-6">
            <p className="premium-kicker">Daily publishing rhythm</p>
            <h2 className="mt-3 font-display text-2xl text-foreground">
              The next public insight releases on the next scheduled day.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
              Published insights remain live permanently. Future previews and their member
              resources stay hidden until their release date.
            </p>
          </article>
        )}
      </section>

      <section className="space-y-6">
        <SectionHeading
          label="Business owner signals"
          title="Short signals worth holding onto"
          description="The public layer should make the quality of thinking visible without turning BCN into a generic blog."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {BUSINESS_SIGNALS.map((signal) => {
            const Icon = signal.icon;

            return (
              <article key={signal.title} className="public-panel interactive-card p-5 sm:p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <Icon size={18} />
                </span>
                <h2 className="mt-5 font-display text-2xl text-foreground">{signal.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">{signal.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="public-section">
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1fr]">
          <article className="rounded-[1.85rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/76 to-card/68 p-6 shadow-gold-soft">
            <p className="premium-kicker">From the founder</p>
            <h2 className="mt-4 font-display text-3xl text-foreground">
              Trevor Newton | Growth Architect
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              I am building The Business Circle Network because too many business owners are
              trying to make serious decisions in noisy rooms. BCN is being built as a calmer,
              more useful environment for owners who want better conversations, clearer thinking
              and people around them who understand the pressure.
            </p>
          </article>

          <article className="rounded-[1.85rem] border border-border/80 bg-card/66 p-6 shadow-panel-soft">
            <p className="premium-kicker">Useful public routes</p>
            <h2 className="mt-4 font-display text-3xl text-foreground">
              Keep the public journey connected
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { href: "/business-owner-network-uk", label: "Business Owner Network UK" },
                { href: "/founder-community-uk", label: "Founder Community UK" },
                { href: "/private-business-network", label: "Private Business Network" },
                { href: "/business-networking-uk", label: "Business Networking UK" }
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-border/80 bg-background/24 px-4 py-3 text-sm text-silver transition-colors hover:border-gold/28 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>

      {topicClusters.length ? (
        <section className="space-y-6">
          <SectionHeading
            label="Browse by signal"
            title="Topic paths without turning the site into noise"
            description="Each topic contains only insights that have already reached their published date."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topicClusters.slice(0, 9).map((cluster) => (
              <Link key={cluster.slug} href={cluster.href} className="public-panel interactive-card p-5">
                <p className="premium-kicker">{cluster.keyword}</p>
                <h2 className="mt-4 font-display text-2xl text-foreground">{cluster.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">{cluster.supportLine}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.08em] text-silver">
                  {cluster.articleCount} published insight{cluster.articleCount === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <CTASection
        title="Useful public thinking. Deeper member action."
        description="Explore membership when you want the full resources, implementation prompts and protected room around the work. Run the Founder Audit if you want the calmer starting point first."
        primaryAction={{ href: "/membership?from=/insights", label: "Explore Membership" }}
        secondaryAction={{ href: "/audit", label: "Run The Founder Audit", variant: "outline" }}
        analyticsSource="insights"
      />

      <TwoPathCta
        source="insights"
        title="Choose the next step that fits."
        description="Review membership if you already know you want the room. Run the Founder Audit if you want a clearer starting point."
      />
    </div>
  );
}

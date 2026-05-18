import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  MessageSquareText,
  Route,
  SearchCheck,
  ShieldCheck,
  Target
} from "lucide-react";
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
  listPublicInsightsForCluster,
  listPublicInsights
} from "@/server/insights/insight.service";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const dynamic = "force-static";
export const revalidate = 3600;

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

const START_HERE_PATH = [
  {
    label: "If the business feels noisy",
    href: "/insights/topic/founder-clarity",
    description: "Start with founder clarity, decision quality and the signal behind the week."
  },
  {
    label: "If the website is not converting",
    href: "/insights/topic/trust-and-visibility",
    description: "Move into trust signals, conversion support and clearer public pages."
  },
  {
    label: "If visibility is changing",
    href: "/insights/topic/ai-search-and-visibility",
    description: "Use AI search, GEO and AEO topics to make the business easier to understand."
  },
  {
    label: "If you need the right room",
    href: "/business-owner-network-uk",
    description: "Compare the public insight layer with the private business owner environment."
  }
] as const;

function InsightClusterSection({
  label,
  title,
  description,
  insights,
  topicHref
}: {
  label: string;
  title: string;
  description: string;
  insights: ReturnType<typeof listPublicInsights>;
  topicHref: string;
}) {
  if (!insights.length) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading label={label} title={title} description={description} />
        <Link
          href={topicHref}
          className="inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
        >
          Open topic
          <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {insights.slice(0, 3).map((insight) => (
          <InsightCard key={insight.slug} insight={insight} />
        ))}
      </div>
    </section>
  );
}

export default async function InsightsPage() {
  const insights = listPublicInsights();
  const topicClusters = listInsightTopicClusters();
  const insightsHeroPlacement = await getVisualMediaPlacement("intelligence.hero");
  const featuredInsight = insights[0] ?? null;
  const latestInsights = insights.filter((insight) => insight.slug !== featuredInsight?.slug).slice(0, 12);
  const previousSignals = latestInsights.slice(0, 3);
  const founderClarityInsights = listPublicInsightsForCluster("founder-clarity", 3);
  const aiSearchInsights = listPublicInsightsForCluster("ai-search-and-visibility", 3);
  const websiteTrustInsights = [
    ...listPublicInsightsForCluster("trust-and-visibility", 2),
    ...listPublicInsightsForCluster("strategic-visibility", 2)
  ].slice(0, 3);
  const ownerRealityInsights = listPublicInsightsForCluster("owner-reality", 3);
  const mostUsefulInsights = insights
    .filter((insight) =>
      [
        "business-growth",
        "founder-clarity",
        "trust-and-visibility",
        "ai-search-and-visibility",
        "business-networking"
      ].includes(insight.clusterSlug)
    )
    .slice(0, 6);

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
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <article className="rounded-[2rem] border border-gold/26 bg-gradient-to-br from-gold/10 via-card/78 to-card/70 p-6 shadow-gold-soft sm:p-8">
            <p className="premium-kicker inline-flex items-center gap-2">
              <CalendarDays size={14} />
              Today&apos;s Owner Signal
            </p>
            <h2 className="mt-4 max-w-3xl font-display text-3xl leading-tight text-foreground sm:text-4xl">
              {featuredInsight.title}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
              {featuredInsight.excerpt}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/insights/${featuredInsight.slug}`}>
                <Button>
                  Read today&apos;s insight
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </Link>
              <Link href="/dashboard/resources">
                <Button variant="outline">
                  Members get the full breakdown
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              New public insight is scheduled daily. Return tomorrow for the next owner signal,
              then use the private resource area when you want the fuller framework.
            </p>
          </article>

          <article className="public-panel p-6 sm:p-8">
            <p className="premium-kicker">Previous signals</p>
            <h2 className="mt-4 font-display text-3xl text-foreground">
              Keep the thread moving
            </h2>
            <div className="mt-5 space-y-3">
              {previousSignals.map((insight) => (
                <Link
                  key={insight.slug}
                  href={`/insights/${insight.slug}`}
                  className="block rounded-[1.2rem] border border-border/80 bg-background/22 px-4 py-3 transition-colors hover:border-silver/24 hover:bg-background/30"
                >
                  <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                    {insight.category}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">{insight.title}</p>
                </Link>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      <section className="space-y-6">
        <SectionHeading
          label="Start here"
          title="Choose the pressure you are actually dealing with."
          description="The hub is built as a route into clearer owner thinking, not as a flat list of posts. Start with the pressure closest to the business today."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {START_HERE_PATH.map((item) => (
            <Link key={item.href} href={item.href} className="public-panel interactive-card p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-silver/18 bg-background/24 text-silver">
                <Route size={16} />
              </span>
              <h2 className="mt-4 text-xl text-foreground">{item.label}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {mostUsefulInsights.length ? (
        <section className="space-y-6">
          <SectionHeading
            label="Most useful for owners right now"
            title="The current reading queue."
            description="A tighter set of public previews across clarity, trust, AI search, business growth and better rooms."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            {mostUsefulInsights.map((insight) => (
              <InsightCard key={insight.slug} insight={insight} />
            ))}
          </div>
        </section>
      ) : null}

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

      <InsightClusterSection
        label="Founder clarity"
        title="For owners who need a cleaner decision signal."
        description="These insights help reduce blur before the week turns into more activity."
        insights={founderClarityInsights}
        topicHref="/insights/topic/founder-clarity"
      />

      <InsightClusterSection
        label="AI Search / GEO"
        title="For businesses that need to become easier to understand."
        description="AI visibility, answer engine clarity and GEO work best when the business is specific, trusted and well connected."
        insights={aiSearchInsights}
        topicHref="/insights/topic/ai-search-and-visibility"
      />

      <InsightClusterSection
        label="Website trust / CRO"
        title="For public pages that need to turn attention into confidence."
        description="Conversion improves when trust, proof and page sequence support the buyer's decision."
        insights={websiteTrustInsights}
        topicHref="/insights/topic/trust-and-visibility"
      />

      <InsightClusterSection
        label="Business owner reality"
        title="For the pressure most owners carry quietly."
        description="Owner isolation, useful support and better context are business issues, not only emotional ones."
        insights={ownerRealityInsights}
        topicHref="/insights/topic/owner-reality"
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-[2rem] border border-gold/28 bg-gradient-to-br from-gold/10 via-card/78 to-card/70 p-6 shadow-gold-soft sm:p-8">
          <p className="premium-kicker inline-flex items-center gap-2">
            <Target size={14} />
            Founder Audit
          </p>
          <h2 className="mt-4 font-display text-3xl text-foreground">
            Turn the insight into a clearer starting point.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            If a topic has made the pressure clearer, use the Founder Audit to choose the
            room and level of depth that fits the business now.
          </p>
          <Link href="/audit" className="mt-5 inline-flex">
            <Button>
              Run The Founder Audit
              <ArrowRight size={14} className="ml-2" />
            </Button>
          </Link>
        </article>

        <article className="rounded-[2rem] border border-silver/18 bg-card/70 p-6 shadow-panel sm:p-8">
          <p className="premium-kicker inline-flex items-center gap-2">
            <ShieldCheck size={14} />
            Private environment
          </p>
          <h2 className="mt-4 font-display text-3xl text-foreground">
            Public insight first. Protected member depth after.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The public hub builds trust and clarity. Membership adds the full resources,
            member rooms, profile context and better conversations around the work.
          </p>
          <Link href="/membership?from=/insights" className="mt-5 inline-flex">
            <Button variant="outline">
              Join the private environment
              <ArrowRight size={14} className="ml-2" />
            </Button>
          </Link>
        </article>
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

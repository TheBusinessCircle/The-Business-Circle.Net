import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  Crown,
  MessageSquareText,
  Sparkles,
  Users
} from "lucide-react";
import { getMembershipTierPricing, MEMBERSHIP_PLANS } from "@/config/membership";
import { TREV_FOUNDER_CONTENT } from "@/config/founder";
import {
  CTASection,
  FAQSection,
  FoundingOfferCounters,
  HeroSection,
  JsonLd,
  PricingCard,
  SectionHeading
} from "@/components/public";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { getSiteContentSection } from "@/server/site-content";
import { buildFaqSchema } from "@/lib/structured-data";
import { getFoundingOfferSnapshot } from "@/server/founding";
import {
  listInsightTopicClusters,
  listPublicInsights
} from "@/server/insights/insight.service";
import { getPublicTrustSnapshot } from "@/server/public-site";

const heroCallouts = [
  "Founder-led",
  "Private membership",
  "Structured growth",
  "Calm by design"
];

const featuredInsightTopicSlugs = new Set([
  "business-growth-strategy",
  "visibility-and-trust",
  "founder-clarity-and-decision-making"
]);

const insideNetworkItems = [
  {
    icon: MessageSquareText,
    title: "Community",
    description: "Thoughtful discussions for business owners who want substance, not constant chatter.",
    points: [
      "Quality threads over fast-moving noise",
      "Clearer ways to reply, follow, and return"
    ]
  },
  {
    icon: BookOpen,
    title: "Resources",
    description: "Practical material designed to sharpen thinking and support the next move.",
    points: [
      "Filtered by membership and business need",
      "Structured reading with clear next-step guidance"
    ]
  },
  {
    icon: Users,
    title: "Directory",
    description: "Profiles that make introductions, alignment, and trust easier to assess properly.",
    points: [
      "Public profile routes that work cleanly",
      "Stronger identity, focus, and contribution signals"
    ]
  },
  {
    icon: CalendarDays,
    title: "Events",
    description: "Live moments that keep the network moving without making the platform feel busy.",
    points: [
      "Upcoming sessions surfaced at the right moments",
      "A calmer route from discussion into real connection"
    ]
  }
] as const;

const memberThinkingSteps = [
  {
    step: "01",
    title: "Start with one clear move",
    description: "Use the dashboard to decide what matters this week before the platform asks anything else of you."
  },
  {
    step: "02",
    title: "Use the right room",
    description: "Move between discussions, resources, profiles, and events with more intent and less guesswork."
  },
  {
    step: "03",
    title: "Let momentum compound",
    description: "Better context, stronger relationships, and sharper decisions build over time when the environment is steady."
  }
] as const;

const founderReasons = [
  {
    title: "Business owners need clearer rooms",
    description: "Too many founder spaces create activity without structure, introductions without trust, and advice without context."
  },
  {
    title: "Growth works better when the environment is right",
    description: "The right people, the right visibility, and the right signals make better decisions easier to make."
  },
  {
    title: "This was built to be used properly",
    description: "The Business Circle Network is designed as a working environment, not a feed to scroll and forget."
  }
] as const;

const membershipNotes = [
  {
    label: "Foundation",
    title: "A strong place to begin",
    description:
      "Start here when you want the full structure: resources, community, directory, events, and a better business room around you."
  },
  {
    label: "Inner Circle",
    title: "The natural step into more focus",
    description:
      "Choose this when Foundation is already useful and you want stronger signal, more private context, and a room with greater intent."
  },
  {
    label: "Core",
    title: "The closest strategic layer",
    description:
      "Step into Core when proximity, judgement, and the quality of room matter more than wider access alone."
  }
] as const;

function HomeSection({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative space-y-8 pt-10 sm:space-y-10 sm:pt-12",
        "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-silver/18 before:to-transparent",
        className
      )}
    >
      {children}
    </section>
  );
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Founder-Led Business Network And Growth Ecosystem",
  description:
    "The Business Circle Network is a founder-led business network and growth ecosystem for founders who want stronger strategy, trust, collaboration, and daily momentum.",
  keywords: [
    "business network for founders",
    "founder business community",
    "business growth ecosystem",
    "founder networking platform",
    "business strategy membership"
  ],
  path: "/"
});

export default async function HomePage() {
  const [homeContent, membershipContent, foundingOffer, trustSnapshot] = await Promise.all([
    getSiteContentSection("home"),
    getSiteContentSection("membership"),
    getFoundingOfferSnapshot(),
    getPublicTrustSnapshot()
  ]);
  const featuredTopicClusters = listInsightTopicClusters().filter((cluster) =>
    featuredInsightTopicSlugs.has(cluster.slug)
  );
  const latestInsights = listPublicInsights().slice(0, 3);
  const foundationPricing = getMembershipTierPricing("FOUNDATION");
  const innerCirclePricing = getMembershipTierPricing("INNER_CIRCLE");
  const corePricing = getMembershipTierPricing("CORE");

  const snapshotCards = [
    {
      value:
        trustSnapshot.activeDiscussionCount > 0
          ? `${trustSnapshot.activeDiscussionCount}`
          : "Quietly active",
      label: "Recently happening"
    },
    {
      value:
        trustSnapshot.recentResourceCount > 0
          ? `${trustSnapshot.recentResourceCount}`
          : "Fresh",
      label: "Resources recently added"
    },
    {
      value:
        trustSnapshot.connectionWinsCount > 0
          ? `${trustSnapshot.connectionWinsCount}`
          : "Visible",
      label: "Wins members are sharing"
    }
  ];

  return (
    <>
      <JsonLd data={buildFaqSchema(homeContent.faqs)} />

      <div className="space-y-12 pb-14 sm:space-y-14 lg:space-y-16 lg:pb-16">
        <HeroSection
          eyebrow="For Founders Who Need A Better Room Around The Business"
          title={homeContent.heroTitle}
          description={homeContent.heroSubtitle}
          supportLine={homeContent.heroSupportLine}
          callouts={heroCallouts}
          primaryAction={{ href: "/join", label: "Join The Business Circle" }}
          secondaryAction={{ href: "/membership", label: "Explore Membership", variant: "outline" }}
          metrics={[
            { value: "Private", label: "Curated membership" },
            { value: "Founder-led", label: "Strategic direction" },
            { value: "Structured", label: "Clear progression" }
          ]}
          aside={
            <article className="public-panel p-6 sm:p-7">
              <p className="premium-kicker inline-flex items-center gap-2">
                <Sparkles size={14} />
                Inside The Network
              </p>
              <h2 className="mt-5 font-display text-2xl leading-tight text-silver">
                If you want a calmer, stronger room around the business, you are in the right place.
              </h2>
              <div className="mt-5 space-y-3">
                {[
                  "A dashboard that guides the next move without becoming busy",
                  "Focused discussions, member profiles, resources, and events in one place",
                  "Clear progression from Foundation into more focused access layers"
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-muted"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted">
                Built for founders and business owners who have outgrown shallow networking, noisy groups, and environments that make the next move harder to see.
              </p>
            </article>
          }
        />

        <HomeSection className="pt-0 before:hidden">
          <SectionHeading
            label="Inside The Network"
            title="Everything has a clear place"
            description="The platform is designed so members can find the right part of the ecosystem quickly, use it with intention, and return without friction."
          />
          <div className="grid gap-4 xl:grid-cols-4">
            {insideNetworkItems.map((item) => (
              <article key={item.title} className="public-panel interactive-card p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <item.icon size={18} />
                </span>
                <h3 className="mt-5 font-display text-2xl text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                <div className="mt-5 space-y-2">
                  {item.points.map((point) => (
                    <div
                      key={point}
                      className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-muted"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </HomeSection>

        <HomeSection>
          <SectionHeading
            label="How Members Use It"
            title="A cleaner rhythm from entry to momentum"
            description="The platform is built to help business owners choose the next useful move, use the right part of the network, and keep progress compounding."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {memberThinkingSteps.map((item) => (
              <article key={item.step} className="public-panel interactive-card p-6">
                <p className="premium-kicker">{item.step}</p>
                <h3 className="mt-5 font-display text-2xl text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
              </article>
            ))}
          </div>
        </HomeSection>

        <HomeSection>
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="public-panel border-gold/25 bg-gradient-to-br from-gold/8 via-card/72 to-card/68 p-6 sm:p-8">
              <p className="premium-kicker">Why It Exists</p>
              <h2 className="mt-5 font-display text-3xl leading-tight text-foreground sm:text-4xl">
                Built because strong businesses still need a better environment around them.
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
                <p>{TREV_FOUNDER_CONTENT.summary}</p>
                <p>
                  Trev Newton built The Business Circle Network to give business owners a calmer, more useful place to think, connect, and move forward properly.
                </p>
              </div>
              <div className="mt-5 rounded-3xl border border-border/80 bg-background/25 p-5">
                <p className="text-sm leading-relaxed text-muted">
                  &ldquo;{TREV_FOUNDER_CONTENT.quote}&rdquo;
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/founder">
                  <Button>Meet Trev Newton</Button>
                </Link>
                <Link href="/founder#services">
                  <Button variant="outline">Explore Founder Work</Button>
                </Link>
              </div>
            </article>

            <div className="grid gap-4">
              {founderReasons.map((item) => (
                <article key={item.title} className="public-panel p-6">
                  <h3 className="font-display text-2xl text-silver">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                </article>
              ))}
              <article className="public-panel p-6">
                <p className="premium-kicker">Founder Approach</p>
                <div className="mt-5 space-y-3">
                  {TREV_FOUNDER_CONTENT.approach.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3"
                    >
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted">{item.description}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </HomeSection>

        <HomeSection>
          <SectionHeading
            label="Membership"
            title="Start at the level that fits the business now"
            description="Foundation gives the full structure. Inner Circle adds more focus. Core adds the closest strategic layer."
          />
          <FoundingOfferCounters offer={foundingOffer} />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <PricingCard
              tier="FOUNDATION"
              name={MEMBERSHIP_PLANS.FOUNDATION.name}
              positioningLabel="Best place to start"
              billingInterval="monthly"
              monthlyPrice={MEMBERSHIP_PLANS.FOUNDATION.monthlyPrice}
              annualPrice={foundationPricing.standardAnnualPrice}
              description="For business owners who want a stronger room, a clearer base, and the full structure around them."
              features={MEMBERSHIP_PLANS.FOUNDATION.features}
              ctaHref="/join?tier=FOUNDATION"
              ctaLabel="Join Foundation"
              foundingOffer={foundingOffer.foundation}
            />
            <PricingCard
              tier="INNER_CIRCLE"
              name={MEMBERSHIP_PLANS.INNER_CIRCLE.name}
              positioningLabel="The natural upgrade"
              spotlight={{
                label: "Clearer difference",
                text: "Move into Inner Circle when you want stronger signal, more private context, and a more focused room than Foundation alone."
              }}
              billingInterval="monthly"
              monthlyPrice={MEMBERSHIP_PLANS.INNER_CIRCLE.monthlyPrice}
              annualPrice={innerCirclePricing.standardAnnualPrice}
              description="For founders who want a more focused environment, deeper conversation, and better context around the next decision."
              features={MEMBERSHIP_PLANS.INNER_CIRCLE.features}
              ctaHref="/join?tier=INNER_CIRCLE"
              ctaLabel="Enter Inner Circle"
              foundingOffer={foundingOffer.innerCircle}
              featured
              featuredLabel="Most natural step up"
            />
            <PricingCard
              tier="CORE"
              name={MEMBERSHIP_PLANS.CORE.name}
              positioningLabel="Closest strategic layer"
              billingInterval="monthly"
              monthlyPrice={MEMBERSHIP_PLANS.CORE.monthlyPrice}
              annualPrice={corePricing.standardAnnualPrice}
              description="For business owners who want the calmest high-value room and the strongest proximity to founder thinking."
              features={MEMBERSHIP_PLANS.CORE.features}
              ctaHref="/join?tier=CORE"
              ctaLabel="Join Core"
              foundingOffer={foundingOffer.core}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {membershipNotes.map((item) => (
              <article
                key={item.label}
                className={cn(
                  "public-panel p-6",
                  item.label === "Foundation"
                    ? "border-foundation/24 bg-gradient-to-br from-foundation/10 via-card/72 to-card/68"
                    : item.label === "Inner Circle"
                      ? "border-silver/20 bg-gradient-to-br from-silver/12 via-card/72 to-card/68"
                      : "border-gold/28 bg-gradient-to-br from-gold/10 via-card/72 to-card/68"
                )}
              >
                <p className="premium-kicker">
                  {item.label === "Inner Circle" ? <Crown size={12} /> : null}
                  {item.label}
                </p>
                <h3 className="mt-5 font-display text-2xl text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
              </article>
            ))}
          </div>
          <p className="text-sm text-muted">
            {membershipContent.standard.whyChoose}
          </p>
        </HomeSection>

        <HomeSection>
          <SectionHeading
            label="You're In The Insights Layer"
            title="Free insights to help you think clearer and grow your business"
            description="Start here before going deeper into membership. The free layer builds clarity first, then membership adds the deeper frameworks, context, and execution path."
          />
          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4 md:grid-cols-3">
              {featuredTopicClusters.map((cluster) => (
                <article key={cluster.slug} className="public-panel interactive-card p-6">
                  <p className="premium-kicker">{cluster.keyword}</p>
                  <h3 className="mt-4 font-display text-2xl text-foreground">{cluster.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{cluster.description}</p>
                  <div className="mt-4 space-y-2">
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
                  <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                    <Link href={cluster.href} className="text-silver transition-colors hover:text-foreground">
                      Explore topic
                    </Link>
                    <span className="text-muted">
                      {cluster.articleCount} article{cluster.articleCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <article className="public-panel border-gold/25 bg-gradient-to-br from-gold/8 via-card/72 to-card/68 p-6 sm:p-8">
              <p className="premium-kicker">Latest insights</p>
              <h2 className="mt-5 font-display text-3xl leading-tight text-foreground">
                Start with what&apos;s most relevant right now
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Read the free insight layer first. Full frameworks, deeper context, and the practical next steps live inside membership when you want to go further.
              </p>
              <div className="mt-5 space-y-3">
                {latestInsights.map((insight) => (
                  <Link
                    key={insight.slug}
                    href={`/insights/${insight.slug}`}
                    className="block rounded-2xl border border-border/80 bg-background/22 px-4 py-4 transition-colors hover:border-silver/24 hover:bg-background/30"
                  >
                    <p className="text-sm font-medium text-foreground">{insight.title}</p>
                    <p className="mt-2 text-sm text-muted">{insight.summary}</p>
                  </Link>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/insights">
                  <Button>Browse Topics</Button>
                </Link>
                <Link href="/membership?from=/insights">
                  <Button variant="outline">Go Deeper Inside Membership</Button>
                </Link>
              </div>
            </article>
          </div>
        </HomeSection>

        <HomeSection>
          <SectionHeading
            label="Proof & Momentum"
            title={homeContent.proofTitle}
            description={homeContent.proofDescription}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {snapshotCards.map((item) => (
              <article
                key={item.label}
                className="public-panel border-gold/20 bg-gradient-to-br from-gold/8 via-card/72 to-card/70 p-5"
              >
                <p className="font-display text-3xl text-silver">{item.value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.08em] text-muted">
                  {item.label}
                </p>
              </article>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            {homeContent.proofItems.map((item) => (
              <article key={item.title} className="public-panel interactive-card p-6">
                <p className="premium-kicker">{item.eyebrow}</p>
                <h3 className="mt-5 font-display text-2xl text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
              </article>
            ))}
          </div>
        </HomeSection>

        <FAQSection
          id="faq"
          label="FAQ"
          title={homeContent.faqTitle}
          description={homeContent.faqDescription}
          items={homeContent.faqs}
        />

        <CTASection
          title={homeContent.ctaTitle}
          description={homeContent.ctaDescription}
          primaryAction={{ href: "/join", label: "Join The First Wave Of Members" }}
          secondaryAction={{ href: "/membership", label: "Explore Membership", variant: "outline" }}
        />
      </div>
    </>
  );
}

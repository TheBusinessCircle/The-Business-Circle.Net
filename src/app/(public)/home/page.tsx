import type { Metadata } from "next";
import Link from "next/link";
import { TestimonialProofType } from "@prisma/client";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Compass,
  Handshake,
  Layers3,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy
} from "lucide-react";
import {
  CTASection,
  CheckoutReassuranceBlock,
  FAQSection,
  HeroSection,
  JourneyRail,
  JsonLd,
  FirstSevenDaysBlock,
  LaunchTrustProof,
  MemberPreviewLayer,
  AnswerBlock,
  MovementInsideRoomSection,
  NaturalInternalLinks,
  OutcomeStrip,
  PrivacyBoundaryNote,
  SectionHeading,
  TrustTrailSection
} from "@/components/public";
import { TestimonialSection } from "@/components/public/testimonial-section";
import { PublicTopVisual, SectionFeatureImage } from "@/components/visual-media";
import { buttonVariants } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFaqSchema,
  buildWebPageSchema
} from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { buildPublicTrustDisplay, getPublicTrustSnapshot } from "@/server/public-site";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { listPublicInsights } from "@/server/insights/insight.service";
import { getSiteContentSection } from "@/server/site-content";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const metadata: Metadata = createPageMetadata({
  title: "Private Business Network for Owners",
  description:
    "A private founder-led business network for UK owners who want better conversations, clearer thinking, trusted relationships and useful business context.",
  path: "/home",
  keywords: [
    "business network for owners",
    "business owners network UK",
    "private business community UK",
    "private founder-led business environment",
    "business growth network",
    "membership for business owners",
    "entrepreneur community UK",
    "structured business support"
  ]
});

const INSIDE_FEATURE_CARDS = [
  {
    title: "Private Rooms",
    description: "Focused spaces for introductions, business questions, owner updates, and tier-specific conversations.",
    placementKey: "rooms",
    icon: Layers3,
    tone: "human" as const
  },
  {
    title: "Resources",
    description: "Practical material for decisions, positioning, operations, growth, and the work that follows.",
    placementKey: "resources",
    icon: BookOpen,
    tone: "editorial" as const
  },
  {
    title: "1-to-1 Calls",
    description: "Direct owner-to-owner conversations when a connection, question, or next step deserves more context.",
    placementKey: "calls",
    icon: PhoneCall,
    tone: "human" as const
  },
  {
    title: "Group Conversations",
    description: "Live discussions around business pressure, direction, decision-making, and member-led themes.",
    placementKey: "group",
    icon: CalendarDays,
    tone: "platform" as const
  },
  {
    title: "Collaborations",
    description: "A clearer way to spot useful fit, warm opportunities, and practical reasons to connect.",
    placementKey: "collaborations",
    icon: Handshake,
    tone: "founders" as const
  },
  {
    title: "Wins",
    description: "Visible member progress, useful movement, and the signals that show what is working.",
    placementKey: "wins",
    icon: Trophy,
    tone: "editorial" as const
  },
  {
    title: "Member Profiles",
    description: "Business context that makes the right people easier to understand before a conversation starts.",
    placementKey: "profiles",
    icon: ShieldCheck,
    tone: "platform" as const
  },
  {
    title: "Insight Layer",
    description: "Public insight, member resources, and founder-led signals that help the network keep its shape.",
    placementKey: "insight",
    icon: Compass,
    tone: "editorial" as const
  }
] as const;

const IMMEDIATE_VALUE = [
  "Clearer direction",
  "Better conversations",
  "Exposure to how other owners think",
  "A clearer first action"
] as const;

const ONGOING_VALUE = [
  "Better decisions",
  "Stronger network",
  "Collaboration opportunities",
  "Consistent growth-focused input",
  "More confidence in business direction"
] as const;

const ECOSYSTEM_ITEMS = [
  "Member profiles",
  "Private rooms",
  "Resources",
  "1-to-1 calls",
  "Group conversations",
  "Collaborations",
  "Wins",
  "Insights"
] as const;

const HERO_OUTCOMES = [
  "Better conversations",
  "Founder-led standards",
  "Private member rooms",
  "Useful business resources",
  "Profile visibility",
  "Serious owner connections"
] as const;

const PUBLIC_PREVIEW_THEMES = [
  "Business direction and decision quality",
  "Positioning, visibility, and enquiry flow",
  "Operations, capacity, and owner focus"
] as const;

const WHY_OWNERS_STAY = [
  "A clearer next action is easier to find when the week gets noisy.",
  "Private rooms give owner decisions a better level of context.",
  "Public insight connects to protected resources instead of ending as content."
] as const;

const ENVIRONMENT_WORKS = [
  "Public pages clarify fit and trust before joining.",
  "Membership opens the dashboard, rooms, resources and profile context.",
  "The return path keeps pointing back to one useful signal, conversation or resource."
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Step inside",
    description: "Create your account through the membership route and enter a private business owner environment built around standards.",
    icon: Compass
  },
  {
    step: "02",
    title: "Build context",
    description: "Shape your profile, join the right rooms, explore useful resources and start better conversations with other business owners.",
    icon: ShieldCheck
  },
  {
    step: "03",
    title: "Create movement",
    description: "Use the network to find clearer thinking, trusted relationships, useful introductions and practical business momentum.",
    icon: TrendingUp
  }
] as const;

const FOR_AUDIENCE = [
  "Owners carrying decisions",
  "Founders building something serious",
  "Local and UK business owners who want better people around them",
  "Operators who want useful conversations, not empty networking",
  "Business owners who value trust, privacy and standards"
] as const;

const NOT_FOR_AUDIENCE = [
  "People looking for spammy promotion",
  "People wanting a free social feed",
  "People who do not respect the room",
  "People looking for quick hype instead of real relationships"
] as const;

function PreviewMediaCard({
  title,
  description,
  placement,
  icon: Icon,
  tone
}: {
  title: string;
  description: string;
  placement?: VisualMediaRenderablePlacement | null;
  icon: (typeof INSIDE_FEATURE_CARDS)[number]["icon"];
  tone: (typeof INSIDE_FEATURE_CARDS)[number]["tone"];
}) {
  return (
    <article className="overflow-hidden rounded-[1.85rem] border border-border/80 bg-card/72 shadow-panel-soft">
      {placement?.isActive && placement.imageUrl ? (
        <SectionFeatureImage
          placement={placement}
          tone={tone}
          aspectClassName="aspect-[16/10]"
          className="min-h-[13rem] rounded-none border-0 bg-transparent shadow-none before:hidden"
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 45vw, 100vw"
        />
      ) : (
        <div className="relative flex aspect-[16/10] items-end overflow-hidden border-b border-border/70 bg-gradient-to-br from-primary/12 via-card/90 to-background/70 p-5">
          <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-[0.14]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.36)_100%),linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.38)_100%)]" />
          <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/28 bg-gold/10 text-gold">
            <Icon size={18} />
          </span>
        </div>
      )}
      <div className="space-y-3 p-5 sm:p-6">
        <h3 className="font-display text-[1.6rem] leading-tight text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </article>
  );
}

function EcosystemFallbackDiagram() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-border/80 bg-card/76 p-5 shadow-panel sm:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.6rem] border border-gold/24 bg-gradient-to-br from-gold/12 via-card/82 to-card/74 p-5">
          <p className="premium-kicker">Connected system</p>
          <h3 className="mt-4 font-display text-2xl text-foreground">Everything works together</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            BCN is designed so profiles, resources, calls, collaboration, wins, and insights reinforce one another rather than living as isolated features.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ECOSYSTEM_ITEMS.map((item) => (
            <div
              key={item}
              className="rounded-[1.2rem] border border-border/80 bg-background/28 px-4 py-4 text-sm text-foreground"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [
    homeContent,
    publicTrustSnapshot,
    foundingOffer,
    homeHeroPlacement,
    homeConnectionPlacement,
    homeJoinPlacement,
    homePlatformPlacement,
    homeRoomsPlacement,
    homeResourcesPlacement,
    homeCallsPlacement,
    homeCollaborationsPlacement,
    homeWinsPlacement,
    homeEcosystemPlacement
  ] = await Promise.all([
    getSiteContentSection("home"),
    getPublicTrustSnapshot(),
    getFoundingOfferSnapshot(),
    getVisualMediaPlacement("home.hero"),
    getVisualMediaPlacement("home.section.connection"),
    getVisualMediaPlacement("home.section.join"),
    getVisualMediaPlacement("home.section.platform"),
    getVisualMediaPlacement("home.section.roomsPreview"),
    getVisualMediaPlacement("home.section.resourcesPreview"),
    getVisualMediaPlacement("home.section.callsPreview"),
    getVisualMediaPlacement("home.section.collaborationsPreview"),
    getVisualMediaPlacement("home.section.winsPreview"),
    getVisualMediaPlacement("home.section.ecosystemMap")
  ]);

  const trustDisplay = buildPublicTrustDisplay(publicTrustSnapshot);
  const founderRoomsOpen = [
    foundingOffer.foundation,
    foundingOffer.innerCircle,
    foundingOffer.core
  ].filter((item) => item.available);
  const founderPlacesRemaining = founderRoomsOpen.reduce((total, item) => total + item.remaining, 0);
  const founderAccessLine = founderRoomsOpen.length
    ? `Founding member access is open with ${founderPlacesRemaining} place${
        founderPlacesRemaining === 1 ? "" : "s"
      } currently available across ${founderRoomsOpen.length} room${
        founderRoomsOpen.length === 1 ? "" : "s"
      }.`
    : "Founding member access closes room by room as allocations are filled.";
  const discussionPreviewLine = publicTrustSnapshot.activeDiscussionCount
    ? `${publicTrustSnapshot.activeDiscussionCount}+ active discussion signals this week.`
    : "Discussion themes are visible publicly without exposing private member content.";
  const resourcePreviewLine = publicTrustSnapshot.recentResourceCount
    ? `${publicTrustSnapshot.recentResourceCount}+ fresh resources added this week.`
    : "Fresh resources are added as the founder-led library develops.";
  const groupConversationPreviewLine = publicTrustSnapshot.upcomingEventCount
    ? `${publicTrustSnapshot.upcomingEventCount} upcoming group conversation${
        publicTrustSnapshot.upcomingEventCount === 1 ? "" : "s"
      } currently scheduled.`
    : "Upcoming group conversations will appear here when scheduled.";

  const previewPlacements: Record<string, VisualMediaRenderablePlacement | null | undefined> = {
    rooms: homeRoomsPlacement,
    resources: homeResourcesPlacement,
    calls: homeCallsPlacement,
    group: homePlatformPlacement,
    collaborations: homeCollaborationsPlacement,
    wins: homeWinsPlacement,
    profiles: homeEcosystemPlacement,
    insight: homeConnectionPlacement
  };
  const publicInsights = listPublicInsights();
  const latestPublicInsight = publicInsights[0] ?? null;
  const previousPublicInsight = publicInsights[1] ?? null;

  return (
    <div className="public-page-stack">
      <JsonLd
        data={buildCollectionPageSchema({
          title: "The Business Circle Network",
          description:
            "A structured private founder-led business environment for owners moving from first impression to membership fit and confident join.",
          path: "/home",
          keywords: [
            "business network for owners",
            "business owners network UK",
            "private business community UK",
            "private founder-led business environment"
          ],
          itemPaths: ["/about", "/membership", "/audit", "/insights", "/contact"]
        })}
      />
      <JsonLd
        data={buildWebPageSchema({
          title: "The Business Circle Network",
          description:
            "A private founder-led business environment for UK business owners who want clearer thinking, better conversations and trusted relationships.",
          path: "/home",
          primaryQuestion: "What is The Business Circle Network?",
          primaryAnswer:
            "The Business Circle Network is a private founder-led business environment for UK business owners who want clearer thinking, better conversations, stronger relationships and a calmer place to make better business decisions. It is designed as a structured alternative to noisy networking groups, social feeds and loose business communities."
        })}
      />
      <JsonLd data={buildBreadcrumbSchema([{ name: "Home", path: "/home" }])} />
      <JsonLd data={buildFaqSchema(homeContent.faqs)} />

      <PublicTopVisual
        placement={homeHeroPlacement}
        eyebrow="The Business Circle Network"
        title="A private business network for serious owners who want better conversations."
        description="Clearer thinking, trusted relationships, useful resources and a calmer room around the business."
        tone="cinematic"
      />

      <HeroSection
        eyebrow="Private founder-led business network"
        title="A private business network for owners who need better conversations, clearer thinking and the right people around them."
        description="The Business Circle Network gives serious business owners a calmer, structured place to connect, share context, access useful resources and build trusted relationships without the noise of normal networking."
        supportLine="Built for business owners, founders and operators who want signal, trust and useful movement."
        callouts={[
          "Better conversations",
          "Founder-led standards",
          "Useful business context"
        ]}
        primaryAction={{ href: "/membership", label: "Join as a founding member" }}
        secondaryAction={{ href: "/audit", label: "Run the Founder Audit", variant: "outline" }}
        metrics={trustDisplay.items}
        analyticsSource="home"
        aside={
          <div className="flex h-full flex-col gap-5">
            <article className="public-panel p-6 sm:p-7">
              <p className="premium-kicker inline-flex items-center gap-2">
                <Sparkles size={14} />
                What changes after joining
              </p>
              <div className="mt-5 space-y-3">
                {[
                  "Fewer distractions around serious work.",
                  "Better context before people speak.",
                  "A stronger setting for the next decision."
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/80 bg-background/28 px-4 py-3 text-sm leading-relaxed text-muted"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[2rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/78 to-card/72 p-6 shadow-gold-soft sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                Founder access
              </p>
              <p className="mt-4 text-lg leading-relaxed text-foreground">
                {founderAccessLine}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Early members enter while founder allocation remains open.
              </p>
              <Link
                href="/membership"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-5 w-full sm:w-auto")}
              >
                Review Membership
              </Link>
            </article>
          </div>
        }
      />

      <OutcomeStrip items={HERO_OUTCOMES} />

      <AnswerBlock
        question="What is The Business Circle Network?"
        answer="The Business Circle Network is a private founder-led business environment for UK business owners who want clearer thinking, better conversations, stronger relationships and a calmer place to make better business decisions. It is designed as a structured alternative to noisy networking groups, social feeds and loose business communities."
      />

      {latestPublicInsight ? (
        <section className="public-section">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <article className="rounded-[2rem] border border-gold/26 bg-gradient-to-br from-gold/10 via-card/80 to-card/72 p-6 shadow-gold-soft sm:p-8">
              <p className="premium-kicker inline-flex items-center gap-2">
                <Sparkles size={14} />
                Today&apos;s Owner Signal
              </p>
              <h2 className="mt-4 max-w-3xl font-display text-3xl leading-tight text-foreground sm:text-4xl">
                {latestPublicInsight.title}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
                {latestPublicInsight.excerpt}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/insights/${latestPublicInsight.slug}`}
                  className={cn(buttonVariants({ size: "default" }))}
                >
                  Read today&apos;s insight
                  <ArrowRight size={14} className="ml-2" />
                </Link>
                <Link
                  href="/insights"
                  className={cn(buttonVariants({ variant: "outline", size: "default" }))}
                >
                  Open insights hub
                </Link>
              </div>
            </article>

            <article className="rounded-[2rem] border border-border/80 bg-card/66 p-6 shadow-panel sm:p-8">
              <p className="premium-kicker">Return loop</p>
              <h2 className="mt-4 font-display text-3xl text-foreground">
                New insight is added daily.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                The public insight layer gives owners a reason to return without exposing private
                member resources. Members get the full breakdown inside the resource area.
              </p>
              {previousPublicInsight ? (
                <Link
                  href={`/insights/${previousPublicInsight.slug}`}
                  className="mt-5 block rounded-[1.3rem] border border-border/80 bg-background/24 px-4 py-4 transition-colors hover:border-silver/24 hover:bg-background/32"
                >
                  <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                    Previous signal
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {previousPublicInsight.title}
                  </p>
                </Link>
              ) : null}
            </article>
          </div>
        </section>
      ) : null}

      <NaturalInternalLinks />

      <CheckoutReassuranceBlock />

      <MemberPreviewLayer />

      <section className="public-section">
        <SectionHeading
          label="What You Actually Get Inside"
          title="The useful parts of BCN are visible before you join."
          description="Membership opens a practical set of spaces, tools, and connection paths designed to be used from the first week."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {INSIDE_FEATURE_CARDS.map((item) => (
            <PreviewMediaCard
              key={item.title}
              title={item.title}
              description={item.description}
              placement={previewPlacements[item.placementKey]}
              icon={item.icon}
              tone={item.tone}
            />
          ))}
        </div>
      </section>

      <JourneyRail
        currentStep="home"
        note="Understand what is inside, choose the right membership path, then enter with the selected tier and billing period preserved."
        nextAction={{ href: "/membership", label: "Go To Membership" }}
      />

      <section className="public-section">
        <div
          className={cn(
            "gap-6 xl:items-center",
            homePlatformPlacement?.isActive && homePlatformPlacement.imageUrl
              ? "grid xl:grid-cols-[minmax(0,0.98fr)_minmax(320px,0.6fr)]"
              : "space-y-6"
          )}
        >
          <div className="space-y-6">
            <SectionHeading
              label="What The Business Circle Actually Is"
              title="A private network with standards, structure, and enough context to make member interaction useful."
              description="It is not a feed or a directory. It is a controlled place for owners to bring real business context."
            />

            <article className="rounded-[1.8rem] border border-gold/22 bg-gradient-to-br from-gold/10 via-card/82 to-card/72 p-5 shadow-gold-soft sm:p-6">
              <div className="space-y-4 text-base leading-relaxed text-muted sm:text-lg">
                <p>
                  The Business Circle gives members a smaller, better-organised place to ask,
                  respond, learn, connect, and follow through.
                </p>
                <p>
                  The value comes from the standard of the space, the context members provide, and
                  the practical tools around the conversation.
                </p>
              </div>
            </article>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Not a social platform",
                  description: "No content churn, comment-thread theatre, or pressure to stay visible."
                },
                {
                  title: "Not loose networking",
                  description: "Profiles, channels, resources, and calls give members more context before they connect."
                },
                {
                  title: "Built for real business decisions",
                  description: "Members bring actual decisions, blockers, movement, and strategy into a more useful setting."
                }
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.7rem] border border-border/80 bg-card/66 p-5 shadow-panel-soft sm:p-6"
                >
                  <h3 className="text-xl text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                </article>
              ))}
            </div>
          </div>

          {homePlatformPlacement?.isActive && homePlatformPlacement.imageUrl ? (
            <SectionFeatureImage
              placement={homePlatformPlacement}
              tone="platform"
              className="min-h-[15rem]"
              sizes="(min-width: 1280px) 30vw, (min-width: 1024px) 38vw, 100vw"
            />
          ) : null}
        </div>
      </section>

      <section className="public-section">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.9rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/80 to-card/72 p-6 shadow-gold-soft sm:p-8">
            <p className="premium-kicker">Why owners stay</p>
            <h2 className="mt-4 font-display text-3xl text-foreground">
              The environment gives them a useful reason to come back.
            </h2>
            <div className="mt-5 grid gap-3">
              {WHY_OWNERS_STAY.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] border border-border/80 bg-background/22 px-4 py-3 text-sm leading-relaxed text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.9rem] border border-border/80 bg-card/66 p-6 shadow-panel sm:p-8">
            <p className="premium-kicker">How the environment works</p>
            <h2 className="mt-4 font-display text-3xl text-foreground">
              Public clarity leads into protected member depth.
            </h2>
            <div className="mt-5 grid gap-3">
              {ENVIRONMENT_WORKS.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] border border-border/80 bg-background/22 px-4 py-3 text-sm leading-relaxed text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/membership"
                className={cn(buttonVariants({ variant: "outline", size: "default" }))}
              >
                Review membership
              </Link>
              <Link
                href="/founder"
                className={cn(buttonVariants({ variant: "outline", size: "default" }))}
              >
                Read the founder story
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="public-section">
        <div
          className={cn(
            "gap-6 xl:items-start",
            homeJoinPlacement?.isActive && homeJoinPlacement.imageUrl
              ? "grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.52fr)]"
              : "space-y-6"
          )}
        >
          <FirstSevenDaysBlock frame="panel" />

          {homeJoinPlacement?.isActive && homeJoinPlacement.imageUrl ? (
            <SectionFeatureImage
              placement={homeJoinPlacement}
              tone="platform"
              aspectClassName="aspect-[16/10] xl:aspect-[4/5]"
              className="min-h-[15rem]"
              sizes="(min-width: 1280px) 30vw, (min-width: 1024px) 38vw, 100vw"
            />
          ) : null}
        </div>
      </section>

      <section className="public-section">
        <SectionHeading
          label="Public Preview"
          title="A careful signal of what is active, without exposing private member content."
          description="The homepage can show movement in the network while keeping member conversations, profiles, and private context protected."
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <article className="rounded-[1.8rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/80 to-card/72 p-5 shadow-gold-soft sm:p-6">
            <p className="premium-kicker">Active discussion themes</p>
            <div className="mt-5 grid gap-3">
              {PUBLIC_PREVIEW_THEMES.map((theme) => (
                <div
                  key={theme}
                  className="rounded-[1.3rem] border border-border/80 bg-background/22 px-4 py-3 text-sm text-foreground"
                >
                  {theme}
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              {discussionPreviewLine}
            </p>
          </article>

          <div className="grid gap-4">
            {[
              {
                label: "Fresh resources",
                value: publicTrustSnapshot.recentResourceCount
                  ? `${publicTrustSnapshot.recentResourceCount}+`
                  : "Building",
                description: resourcePreviewLine
              },
              {
                label: "Group conversations",
                value: publicTrustSnapshot.upcomingEventCount
                  ? publicTrustSnapshot.upcomingEventCount.toString()
                  : "Next",
                description: groupConversationPreviewLine
              },
              {
                label: "Founder allocation",
                value: founderRoomsOpen.length ? "Open" : "Managed",
                description: founderAccessLine
              }
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-[1.7rem] border border-border/80 bg-card/66 p-5 shadow-panel-soft sm:p-6"
              >
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{item.label}</p>
                <p className="mt-3 font-display text-3xl text-foreground">{item.value}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LaunchTrustProof
        proofItems={homeContent.proofItems}
        activeDiscussionCount={publicTrustSnapshot.activeDiscussionCount}
        connectionWinsCount={publicTrustSnapshot.connectionWinsCount}
        recentResourceCount={publicTrustSnapshot.recentResourceCount}
        upcomingEventCount={publicTrustSnapshot.upcomingEventCount}
        founderPlacesRemaining={founderPlacesRemaining}
        founderRoomCount={founderRoomsOpen.length}
      />

      <MovementInsideRoomSection />

      <PrivacyBoundaryNote />

      <TestimonialSection
        proofType={TestimonialProofType.BCN_MEMBER}
        eyebrow="MEMBER PROOF"
        title="What owners are saying inside The Business Circle"
        intro="Real feedback from business owners using BCN to find clearer conversations, stronger direction, and better rooms."
        limit={6}
      />

      <section className="public-section">
        <SectionHeading
          label="What You Actually Gain"
          title="Immediate value now. Ongoing value as the network compounds."
          description="The first win is a clearer next move. The longer-term win is stronger context around the business."
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.8rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/80 to-card/72 p-5 shadow-gold-soft sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Immediate Value</p>
            <div className="mt-5 grid gap-3">
              {IMMEDIATE_VALUE.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.3rem] border border-border/80 bg-background/22 px-4 py-3 text-sm text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-border/80 bg-card/66 p-5 shadow-panel sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Ongoing Value</p>
            <div className="mt-5 grid gap-3">
              {ONGOING_VALUE.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.3rem] border border-border/80 bg-background/22 px-4 py-3 text-sm text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="public-section">
        <SectionHeading
          label="Connected Environment"
          title="The pieces are designed to support each other."
          description="Profiles, rooms, resources, calls, collaborations, wins, and insights do more when they are connected by shared standards."
        />

        {homeEcosystemPlacement?.isActive && homeEcosystemPlacement.imageUrl ? (
          <SectionFeatureImage
            placement={homeEcosystemPlacement}
            tone="platform"
            aspectClassName="aspect-[16/10]"
            className="min-h-[15rem]"
            sizes="100vw"
          />
        ) : (
          <EcosystemFallbackDiagram />
        )}
      </section>

      <section id="how-it-works" className="public-section">
        <SectionHeading
          label="How It Works"
          title="Three calm steps into the right place."
          description="The path is simple on purpose so the next move feels obvious."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <article
              key={item.step}
              className="rounded-[1.7rem] border border-border/80 bg-card/66 p-5 shadow-panel sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gold">{item.step}</p>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-background/24 text-silver">
                  <item.icon size={18} />
                </span>
              </div>
              <h3 className="mt-5 text-2xl text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section">
        <SectionHeading
          label="Who It's For"
          title="Built for people who are serious about the business and the standard around it."
          description="Fit matters because the network only stays useful when the standards stay clear."
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.8rem] border border-gold/24 bg-card/70 p-5 shadow-panel-soft sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">For</p>
            <div className="mt-5 grid gap-3">
              {FOR_AUDIENCE.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.3rem] border border-border/80 bg-background/22 px-4 py-3 text-sm text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-border/80 bg-card/66 p-5 shadow-panel sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Not For</p>
            <div className="mt-5 grid gap-3">
              {NOT_FOR_AUDIENCE.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.3rem] border border-border/80 bg-background/22 px-4 py-3 text-sm text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="public-section">
        <div
          className={cn(
            "gap-6 xl:items-start",
            homeConnectionPlacement?.isActive && homeConnectionPlacement.imageUrl
              ? "grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.54fr)]"
              : "space-y-6"
          )}
        >
          <article className="rounded-[1.8rem] border border-border/80 bg-card/66 p-5 shadow-panel sm:p-6">
            <p className="premium-kicker inline-flex items-center gap-2">
              <Handshake size={14} />
              Why This Exists
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl leading-tight text-foreground sm:text-4xl">
              Most platforms create noise. The Business Circle removes it.
            </h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-muted sm:text-lg">
              <p>
                Built for people who take business seriously and want to be around others who do
                the same.
              </p>
              <p>
                Founder-led does not mean founder-centred. The job is to protect the room, keep the
                standard high, and make the environment more useful for the owners building inside it.
              </p>
              <p>
                That is what keeps BCN calm, credible, and commercially useful over time.
              </p>
            </div>
          </article>

          {homeConnectionPlacement?.isActive && homeConnectionPlacement.imageUrl ? (
            <SectionFeatureImage
              placement={homeConnectionPlacement}
              tone="founders"
              className="min-h-[15rem]"
            />
          ) : null}
        </div>
      </section>

      <TrustTrailSection />

      <FAQSection
        id="faq"
        label="Questions"
        title={homeContent.faqTitle}
        description={homeContent.faqDescription}
        items={homeContent.faqs}
      />

      <CTASection
        title="Ready to choose the room that fits?"
        description="Join as a founding member if you are ready. Run the Founder Audit first if you want a calmer way to check your fit."
        primaryAction={{ href: "/membership", label: "Join as a founding member" }}
        secondaryAction={{ href: "/audit", label: "Run the Founder Audit", variant: "outline" }}
        analyticsSource="home"
      />

      <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
        <Link
          href="/membership"
          className={cn(
            buttonVariants({ size: "lg" }),
            "w-full rounded-[1.35rem] border border-gold/28 shadow-[0_18px_40px_rgba(2,6,23,0.32)] backdrop-blur"
          )}
        >
          Join as a founding member
          <ArrowRight size={16} className="ml-2" />
        </Link>
      </div>
    </div>
  );
}

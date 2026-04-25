import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Compass,
  Handshake,
  Layers3,
  MessagesSquare,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy
} from "lucide-react";
import {
  CTASection,
  FAQSection,
  HeroSection,
  JourneyRail,
  JsonLd,
  SectionHeading
} from "@/components/public";
import { PublicTopVisual, SectionFeatureImage } from "@/components/visual-media";
import { buttonVariants } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema, buildCollectionPageSchema } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import type { VisualMediaRenderablePlacement } from "@/lib/visual-media/types";
import { buildPublicTrustDisplay, getPublicTrustSnapshot } from "@/server/public-site";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { getSiteContentSection } from "@/server/site-content";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const metadata: Metadata = createPageMetadata({
  title: "Private Business Environment For Owners In The UK",
  description:
    "The Business Circle Network is a private business environment for UK business owners who want clearer thinking, better conversations, and more controlled business progress.",
  path: "/",
  keywords: [
    "business network for owners",
    "business owners network UK",
    "private business community UK",
    "founder-led business network",
    "business growth network",
    "membership for business owners",
    "entrepreneur community UK",
    "structured business support"
  ]
});

const JOIN_JOURNEY_CARDS = [
  {
    title: "Access structured discussion rooms",
    description: "Enter focused spaces where context already exists and conversation starts at a higher level.",
    icon: Layers3
  },
  {
    title: "Join focused business conversations",
    description: "Talk through decisions, pressure, and next moves with owners who understand the weight of the work.",
    icon: MessagesSquare
  },
  {
    title: "Use business resources",
    description: "Work from practical prompts, frameworks, and member resources designed to support progress.",
    icon: BookOpen
  },
  {
    title: "Book 1-to-1 member calls",
    description: "Move into direct owner-to-owner conversation when sharper context or faster movement matters.",
    icon: PhoneCall
  },
  {
    title: "Join group conversations",
    description: "Take part in live discussions built around business pressure, direction, and better judgement.",
    icon: CalendarDays
  },
  {
    title: "Collaborate with aligned owners",
    description: "Find people, conversations, and opportunities that make commercial sense inside a better room.",
    icon: Handshake
  },
  {
    title: "Share wins, problems, and strategies",
    description: "Bring real progress and real pressure into an environment designed for substance.",
    icon: Trophy
  },
  {
    title: "Gain clarity through real input",
    description: "Use the room to think better, decide better, and keep the business moving well.",
    icon: Compass
  }
] as const;

const IMMEDIATE_VALUE = [
  "Clearer direction",
  "Better conversations",
  "Exposure to how other owners think",
  "A structured environment that removes noise"
] as const;

const ONGOING_VALUE = [
  "Better decisions",
  "Stronger network",
  "Collaboration opportunities",
  "Consistent growth-focused input",
  "More confidence in business direction"
] as const;

const NETWORK_PREVIEW_CARDS = [
  {
    title: "Private Rooms",
    description: "Focused spaces for real business conversations without public noise.",
    placementKey: "rooms",
    icon: Layers3,
    tone: "human" as const
  },
  {
    title: "Resources",
    description: "Practical business resources designed to help you think clearly and move faster.",
    placementKey: "resources",
    icon: BookOpen,
    tone: "editorial" as const
  },
  {
    title: "1-to-1 Calls",
    description: "Connect directly with other owners when the fit and timing are right.",
    placementKey: "calls",
    icon: PhoneCall,
    tone: "human" as const
  },
  {
    title: "Group Conversations",
    description: "Join focused discussions around business pressure, decisions, growth, and direction.",
    placementKey: "group",
    icon: CalendarDays,
    tone: "platform" as const
  },
  {
    title: "Collaborations",
    description: "Find aligned people, useful conversations, and potential opportunities.",
    placementKey: "collaborations",
    icon: Handshake,
    tone: "founders" as const
  },
  {
    title: "Wins",
    description: "Share progress, build momentum, and see what is working for others.",
    placementKey: "wins",
    icon: TrendingUp,
    tone: "editorial" as const
  }
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

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Join or apply for access",
    description: "Choose the room that fits now and move into the right membership path with clarity.",
    icon: Compass
  },
  {
    step: "02",
    title: "Enter the private environment",
    description: "Once inside, the rooms, resources, conversations, and next steps are ready to use properly.",
    icon: ShieldCheck
  },
  {
    step: "03",
    title: "Start connecting, learning, and progressing",
    description: "Use the room to improve judgement, find the right people, and keep the business moving well.",
    icon: TrendingUp
  }
] as const;

const FOR_AUDIENCE = [
  "Business owners",
  "Founders",
  "Operators",
  "People responsible for growth"
] as const;

const NOT_FOR_AUDIENCE = [
  "Casual browsers",
  "Shortcut seekers",
  "Passive content consumers"
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
  icon: (typeof NETWORK_PREVIEW_CARDS)[number]["icon"];
  tone: (typeof NETWORK_PREVIEW_CARDS)[number]["tone"];
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
          <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-gold/16 blur-[70px]" />
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
          <p className="premium-kicker">Connected environment</p>
          <h3 className="mt-4 font-display text-2xl text-foreground">Everything works together</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            BCN is designed so profiles, rooms, resources, calls, collaboration, wins, and insights reinforce one another rather than living as isolated features.
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

  const previewPlacements: Record<string, VisualMediaRenderablePlacement | null | undefined> = {
    rooms: homeRoomsPlacement,
    resources: homeResourcesPlacement,
    calls: homeCallsPlacement,
    group: homePlatformPlacement,
    collaborations: homeCollaborationsPlacement,
    wins: homeWinsPlacement
  };

  return (
    <div className="w-full min-w-0 space-y-14 pb-28 sm:space-y-16 sm:pb-32 lg:space-y-20 lg:pb-20">
      <JsonLd
        data={buildCollectionPageSchema({
          title: "The Business Circle Network",
          description:
            "A structured founder-led private business environment for owners moving from first impression to membership fit and confident join.",
          path: "/",
          keywords: [
            "business network for owners",
            "business owners network UK",
            "private business community UK",
            "founder-led business network"
          ],
          itemPaths: ["/about", "/membership", "/join", "/contact"]
        })}
      />
      <JsonLd data={buildBreadcrumbSchema([{ name: "Home", path: "/" }])} />

      <PublicTopVisual
        placement={homeHeroPlacement}
        eyebrow="The Business Circle Network"
        title="Private. Structured. Built for owners who want signal over noise."
        description="A calm first impression of the environment before the homepage story begins."
        tone="cinematic"
      />

      <HeroSection
        eyebrow="Private business environment"
        title="A Private Network for Business Owners Who Want Clarity, Not Noise"
        description="A structured environment for real conversations, better decisions, and measurable business progress."
        supportLine="For founders, operators, and business owners who are done building alone."
        callouts={[
          "Structured business conversations",
          "Real insight, not content noise",
          "Private, quality-controlled environment"
        ]}
        primaryAction={{ href: "/membership", label: "Join The Business Circle" }}
        secondaryAction={{ href: "#how-it-works", label: "See How It Works", variant: "outline" }}
        metrics={trustDisplay.items}
        aside={
          <div className="flex h-full flex-col gap-5">
            <article className="public-panel p-6 sm:p-7">
              <p className="premium-kicker inline-flex items-center gap-2">
                <Sparkles size={14} />
                What changes inside the room
              </p>
              <div className="mt-5 space-y-3">
                {[
                  "Less noise around serious work.",
                  "Better context before people speak.",
                  "A stronger room around the next decision."
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
                Early members enter while founder allocation remains open in the current rooms.
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

      <JourneyRail
        currentStep="home"
        note="Start with clarity, understand the environment, then move into the right room with confidence."
        nextAction={{ href: "/membership", label: "Go To Membership" }}
      />

      <section className="space-y-8">
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
              title="A private, structured environment where business owners connect, think clearly, and move forward with better decisions."
              description="This is not a social platform. This is where real business conversations happen."
            />

            <article className="rounded-[2rem] border border-gold/22 bg-gradient-to-br from-gold/10 via-card/82 to-card/72 p-6 shadow-gold-soft sm:p-8">
              <div className="space-y-4 text-base leading-relaxed text-muted sm:text-lg">
                <p>
                  The Business Circle is a private, structured environment where business owners can
                  get better input, better conversations, and a stronger room around real decisions.
                </p>
                <p>
                  It is designed for owners who want signal, judgement, and useful connection, not a
                  feed, an audience, or another loose networking space.
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
                  description: "The room is structured so context improves before the conversation begins."
                },
                {
                  title: "Built for real business decisions",
                  description: "Owners bring actual pressure, progress, and strategy into a more serious environment."
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
              className="min-h-[18rem]"
              sizes="(min-width: 1280px) 30vw, (min-width: 1024px) 38vw, 100vw"
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-8">
        <div
          className={cn(
            "gap-6 xl:items-start",
            homeJoinPlacement?.isActive && homeJoinPlacement.imageUrl
              ? "grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.62fr)]"
              : "space-y-6"
          )}
        >
          <div className="space-y-6">
            <SectionHeading
              label="What Happens When You Join"
              title="Membership turns the environment into something you can actually use."
              description="Structured rooms, useful resources, direct access, and a better layer of conversation."
            />

            <div className="grid gap-4 md:grid-cols-2">
              {JOIN_JOURNEY_CARDS.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.7rem] border border-border/80 bg-card/66 p-5 shadow-panel-soft sm:p-6"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/28 bg-gold/10 text-gold">
                    <item.icon size={18} />
                  </span>
                  <h3 className="mt-4 text-xl text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                </article>
              ))}
            </div>
          </div>

          {homeJoinPlacement?.isActive && homeJoinPlacement.imageUrl ? (
            <SectionFeatureImage
              placement={homeJoinPlacement}
              tone="platform"
              aspectClassName="aspect-[16/10] xl:aspect-[4/5]"
              className="min-h-[18rem]"
              sizes="(min-width: 1280px) 30vw, (min-width: 1024px) 38vw, 100vw"
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          label="What You Actually Gain"
          title="Immediate value now. Ongoing value as the room compounds."
          description="The first win is clearer direction. The longer-term win is a stronger environment around the business."
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/80 to-card/72 p-6 shadow-gold-soft sm:p-8">
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

          <article className="rounded-[2rem] border border-border/80 bg-card/66 p-6 shadow-panel sm:p-8">
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

      <section className="space-y-8">
        <SectionHeading
          label="See What Happens Inside"
          title="The Business Circle is built around the things owners actually need."
          description="Better conversations, useful resources, focused calls, collaboration, and visible progress all sit inside one premium operating environment."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {NETWORK_PREVIEW_CARDS.map((item) => (
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

      <section className="space-y-8">
        <SectionHeading
          label="Connected Environment"
          title="The Business Circle Works As One Connected Environment"
          description="Profiles, rooms, resources, calls, collaborations, wins, and insights are designed to support each other rather than sit as isolated features."
        />

        {homeEcosystemPlacement?.isActive && homeEcosystemPlacement.imageUrl ? (
          <SectionFeatureImage
            placement={homeEcosystemPlacement}
            tone="platform"
            aspectClassName="aspect-[16/10]"
            className="min-h-[18rem]"
            sizes="100vw"
          />
        ) : (
          <EcosystemFallbackDiagram />
        )}
      </section>

      <section id="how-it-works" className="space-y-8">
        <SectionHeading
          label="How It Works"
          title="Three calm steps into the right environment."
          description="The path is simple on purpose so the next move feels obvious."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <article
              key={item.step}
              className="rounded-[1.9rem] border border-border/80 bg-card/66 p-6 shadow-panel sm:p-7"
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

      <section className="space-y-8">
        <SectionHeading
          label="Who It's For"
          title="Built for people who are serious about the business and the room around it."
          description="The fit matters because the environment only stays useful when the standards stay clear."
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-gold/24 bg-card/70 p-6 shadow-panel-soft sm:p-8">
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

          <article className="rounded-[2rem] border border-border/80 bg-card/66 p-6 shadow-panel sm:p-8">
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

      <section className="space-y-8">
        <div
          className={cn(
            "gap-6 xl:items-start",
            homeConnectionPlacement?.isActive && homeConnectionPlacement.imageUrl
              ? "grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.54fr)]"
              : "space-y-6"
          )}
        >
          <article className="rounded-[2rem] border border-border/80 bg-card/66 p-6 shadow-panel sm:p-8">
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
              className="min-h-[18rem]"
            />
          ) : null}
        </div>
      </section>

      <FAQSection
        id="faq"
        label="Questions"
        title={homeContent.faqTitle}
        description={homeContent.faqDescription}
        items={homeContent.faqs}
      />

      <CTASection
        title="If You're Serious About Your Business, This Is Where You Should Be"
        description="Founding member access is open for early members."
        primaryAction={{ href: "/membership", label: "Join The Business Circle" }}
        secondaryAction={{ href: "/about", label: "Read Why It Exists", variant: "outline" }}
      />

      <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
        <Link
          href="/membership"
          className={cn(
            buttonVariants({ size: "lg" }),
            "w-full rounded-[1.35rem] border border-gold/28 shadow-[0_18px_40px_rgba(2,6,23,0.32)] backdrop-blur"
          )}
        >
          Join The Business Circle
          <ArrowRight size={16} className="ml-2" />
        </Link>
      </div>
    </div>
  );
}

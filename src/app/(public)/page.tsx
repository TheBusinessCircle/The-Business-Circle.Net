import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Compass,
  Handshake,
  Layers3,
  MessagesSquare,
  MoveRight,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { MEMBERSHIP_TIER_ORDER, getMembershipTierDefinition } from "@/config/membership";
import {
  CTASection,
  FAQSection,
  type FeatureGridItem,
  FeatureGrid,
  HeroSection,
  JourneyRail,
  JsonLd,
  SectionHeading
} from "@/components/public";
import { PageHeroImage, SectionFeatureImage } from "@/components/visual-media";
import { buttonVariants } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema, buildCollectionPageSchema } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { buildPublicTrustDisplay, getPublicTrustSnapshot } from "@/server/public-site";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { getSiteContentSection } from "@/server/site-content";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const metadata: Metadata = createPageMetadata({
  title: "Private Business Environment For Owners In The UK",
  description:
    "The Business Circle Network is a private business environment for UK business owners who want clearer thinking, better conversations, and more controlled momentum.",
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

const heroImageBlendStyle: CSSProperties = {
  WebkitMaskImage:
    "radial-gradient(ellipse at center, rgba(0,0,0,1) 28%, rgba(0,0,0,0.96) 46%, rgba(0,0,0,0.82) 60%, rgba(0,0,0,0.42) 76%, transparent 94%)",
  maskImage:
    "radial-gradient(ellipse at center, rgba(0,0,0,1) 28%, rgba(0,0,0,0.96) 46%, rgba(0,0,0,0.82) 60%, rgba(0,0,0,0.42) 76%, transparent 94%)"
};

const whatThisIsNot = [
  {
    title: "Not a passive content library",
    description:
      "Useful material matters, but the point is not passive consumption or disconnected advice."
  },
  {
    title: "Not a loose networking group",
    description:
      "Introductions matter more when the room has context, standards, and better placement."
  },
  {
    title: "Not a noisy chat community",
    description:
      "The point is not constant activity. The point is better judgement and better movement."
  }
] as const;

const whatThisIs = [
  {
    title: "Structured placement",
    description:
      "Different stages of business need different rooms, so owners can place themselves properly instead of drifting."
  },
  {
    title: "Higher-quality conversation",
    description:
      "The room improves context before people speak, which raises conversation quality quickly."
  },
  {
    title: "Controlled momentum",
    description:
      "Everything is built to support clearer decisions, stronger relationships, and steadier momentum."
  }
] as const;

const howItWorksSteps = [
  {
    step: "01",
    title: "Place the business properly",
    description:
      "Look honestly at the stage the business is in and the level of context it needs now."
  },
  {
    step: "02",
    title: "Enter the right room",
    description:
      "Choose the membership level that matches the pace, depth, and proximity the business needs."
  },
  {
    step: "03",
    title: "Move with better structure",
    description:
      "Use the room to think more clearly, connect with better people, and keep momentum moving."
  }
] as const;

const environmentItems: FeatureGridItem[] = [
  {
    title: "Less noise",
    description:
      "You are not fighting through chatter, posturing, or filler before you get to what matters.",
    icon: MessagesSquare
  },
  {
    title: "Better context",
    description:
      "Owners step into conversations with more placement, which makes the room more commercially useful.",
    icon: Compass
  },
  {
    title: "More relevant connections",
    description:
      "Relationships land better when the environment attracts people who are building and operating for real.",
    icon: Users
  },
  {
    title: "Stronger momentum",
    description:
      "The right environment helps decisions move, conversations compound, and the business keep its direction.",
    icon: TrendingUp
  }
];

const membershipPathwayContent = {
  FOUNDATION: {
    stageLabel: "Earlier stage",
    positioning: "A steady room for owners building the structure properly.",
    bestFit: "Best when you need clearer foundations, better context, and a dependable place to grow from."
  },
  INNER_CIRCLE: {
    stageLabel: "Growing business",
    positioning: "A tighter room for businesses already carrying momentum.",
    bestFit: "Best when stronger signal, deeper conversation, and more relevant context will help the business move better."
  },
  CORE: {
    stageLabel: "Established operator",
    positioning: "A quieter room for operators carrying heavier decisions.",
    bestFit: "Best when proximity, judgement, and the quality of the room matter more than wider access alone."
  }
} as const;

export default async function HomePage() {
  const [
    homeContent,
    publicTrustSnapshot,
    foundingOffer,
    homeHeroPlacement,
    homeConnectionPlacement,
    homePlatformPlacement
  ] = await Promise.all([
    getSiteContentSection("home"),
    getPublicTrustSnapshot(),
    getFoundingOfferSnapshot(),
    getVisualMediaPlacement("home.hero"),
    getVisualMediaPlacement("home.section.connection"),
    getVisualMediaPlacement("home.section.platform")
  ]);

  const trustDisplay = buildPublicTrustDisplay(publicTrustSnapshot);
  const founderRoomsOpen = [
    foundingOffer.foundation,
    foundingOffer.innerCircle,
    foundingOffer.core
  ].filter((item) => item.available);
  const founderPlacesRemaining = founderRoomsOpen.reduce((total, item) => total + item.remaining, 0);
  const membershipPreview = MEMBERSHIP_TIER_ORDER.map((tier) => {
    const definition = getMembershipTierDefinition(tier);
    const content = membershipPathwayContent[tier];

    return {
      tier,
      name: definition.name,
      stageLabel: content.stageLabel,
      positioning: content.positioning,
      bestFit: content.bestFit,
      href: `/membership?tier=${definition.slug}`
    };
  });

  return (
    <div className="w-full min-w-0 space-y-14 pb-16 sm:space-y-16 lg:space-y-20">
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

      <HeroSection
        eyebrow="Private business environment for owners"
        title="A more serious room for business owners who want clearer thinking, stronger relationships, and more controlled momentum."
        description="The Business Circle Network is built for business owners building with intent who have outgrown loose networking, surface-level advice, and generic social spaces. It gives the business a calmer environment, stronger commercial context, and a more deliberate path forward."
        supportLine="Start with the environment. Place the business properly. Then move into the right room with confidence."
        callouts={["For business owners", "Founder-led", "Structured rooms"]}
        primaryAction={{ href: "/membership", label: "Find Your Room" }}
        secondaryAction={{ href: "/about", label: "Read Why It Exists", variant: "outline" }}
        metrics={trustDisplay.items}
        aside={
          <div className="flex h-full flex-col gap-5 lg:min-h-[34rem]">
            <article className="public-panel p-6 sm:p-7">
              <p className="premium-kicker inline-flex items-center gap-2">
                <Sparkles size={14} />
                What the room changes
              </p>
              <div className="mt-5 space-y-3">
                {[
                  "Less noise around serious work.",
                  "Better context before people speak.",
                  "A stronger room around the next decision."
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm leading-relaxed text-muted"
                  >
                    {item}
                  </div>
                ))}
              </div>
              {founderRoomsOpen.length ? (
                <div className="mt-4 rounded-2xl border border-gold/24 bg-gold/10 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                    Founder entry currently open
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {founderPlacesRemaining} founder place
                    {founderPlacesRemaining === 1 ? "" : "s"} currently remain across{" "}
                    {founderRoomsOpen.length} room{founderRoomsOpen.length === 1 ? "" : "s"}.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Pricing steps up room by room as each founder allocation is filled.
                  </p>
                </div>
              ) : null}
            </article>

            {homeHeroPlacement?.isActive && homeHeroPlacement.imageUrl ? (
              <PageHeroImage
                placement={homeHeroPlacement}
                className="bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_62%)]"
              />
            ) : (
              <figure className="relative flex min-h-[20rem] flex-1 overflow-hidden rounded-[2.6rem] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_62%)] sm:min-h-[23rem] lg:min-h-[28rem]">
                <div className="pointer-events-none absolute inset-x-[2%] bottom-[2%] top-[4%] rounded-[2.8rem] bg-[radial-gradient(circle_at_center,rgba(214,180,103,0.18),transparent_46%)] blur-3xl" />
                <div className="pointer-events-none absolute inset-x-[6%] bottom-[-4%] top-[14%] rounded-[3rem] bg-[radial-gradient(circle_at_center,rgba(82,146,255,0.12),transparent_58%)] blur-[100px]" />
                <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(8,16,36,0.08),rgba(8,16,36,0.04)_30%,rgba(8,16,36,0.22)_100%)]" />
                <Image
                  src="/branding/home-hero-network-portrait.png"
                  alt="Business owners in a focused premium meeting environment"
                  fill
                  priority
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  className="object-cover object-[center_44%] scale-[1.08] opacity-[0.95] sm:scale-[1.12] lg:scale-[1.16]"
                  style={heroImageBlendStyle}
                />
              </figure>
            )}
          </div>
        }
      />

      <JourneyRail
        currentStep="home"
        note="The public site moves from orientation to trust, then into placement and join."
        nextAction={{ href: "/membership", label: "Go To Membership" }}
      />

      <section className="space-y-8">
        <SectionHeading
          label="What This Is"
          title="Not another content platform, networking group, or chat feed."
          description="This is a structured private business environment for owners. The point is better conditions for decisions, conversations, and momentum."
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <article className="rounded-[2rem] border border-border/80 bg-card/60 p-6 shadow-panel sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">What it is not</p>
            <div className="mt-5 space-y-4">
              {whatThisIsNot.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.4rem] border border-white/8 bg-background/22 px-4 py-4"
                >
                  <h3 className="text-lg text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-gold/20 bg-gradient-to-br from-gold/10 via-card/74 to-card/68 p-6 shadow-gold-soft sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">What it actually is</p>
            <div className="mt-5 space-y-4">
              {whatThisIs.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.4rem] border border-white/10 bg-background/18 px-4 py-4"
                >
                  <h3 className="text-lg text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          label="How It Works"
          title="A controlled path into the right room."
          description="The public site should make the next step obvious. Understand the environment, place the business properly, then move forward cleanly."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {howItWorksSteps.map((item) => (
            <article
              key={item.step}
              className="rounded-[1.9rem] border border-border/80 bg-card/60 p-6 shadow-panel sm:p-7"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-gold">{item.step}</p>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-background/24 text-silver">
                  {item.step === "01" ? (
                    <Compass size={18} />
                  ) : item.step === "02" ? (
                    <Layers3 size={18} />
                  ) : (
                    <MoveRight size={18} />
                  )}
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
          label="The Environment"
          title="The value comes from the room itself."
          description="The environment changes the quality of context, conversation, and movement around the business."
        />

        <FeatureGrid columns={4} items={environmentItems} />

        <article className="rounded-[1.9rem] border border-white/10 bg-card/52 px-6 py-6 shadow-panel-soft sm:px-8">
          <div
            className={cn(
              "grid gap-6 lg:items-start",
              homeConnectionPlacement?.isActive && homeConnectionPlacement.imageUrl
                ? "xl:grid-cols-[minmax(0,0.92fr)_minmax(280px,0.48fr)]"
                : "lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]"
            )}
          >
            <div className="space-y-2">
              <p className="premium-kicker inline-flex items-center gap-2">
                <Handshake size={14} />
                Why that matters
              </p>
              <h2 className="max-w-md text-3xl leading-tight text-foreground">
                Better rooms create better movement.
              </h2>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-muted">
              <p>
                When owners are placed properly and the room is shaped with more care, the quality
                of everything around the business improves. Questions land better. Relationships are
                more relevant. Decisions feel less crowded.
              </p>
              <p>
                That is what gives a serious business environment value over time. Not more noise.
                Better conditions for movement.
              </p>
            </div>
            {homeConnectionPlacement?.isActive && homeConnectionPlacement.imageUrl ? (
              <SectionFeatureImage
                placement={homeConnectionPlacement}
                aspectClassName="aspect-[16/11] lg:aspect-[4/5]"
                className="h-full min-h-[17rem]"
              />
            ) : null}
          </div>
        </article>
      </section>

      <section className="space-y-8">
        <div
          className={cn(
            homePlatformPlacement?.isActive && homePlatformPlacement.imageUrl
              ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.56fr)] xl:items-end"
              : ""
          )}
        >
          <SectionHeading
            label="Membership Pathway"
            title="Different stages of business need different rooms."
            description="Foundation, Inner Circle, and Core create progression inside the ecosystem. The membership page helps you see where the business fits now and what to do next."
            action={
              <Link
                href="/membership"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Review Membership
              </Link>
            }
          />
          {homePlatformPlacement?.isActive && homePlatformPlacement.imageUrl ? (
            <SectionFeatureImage
              placement={homePlatformPlacement}
              aspectClassName="aspect-[16/10] xl:aspect-[16/11]"
              className="min-h-[17rem]"
              sizes="(min-width: 1280px) 26vw, (min-width: 1024px) 32vw, 100vw"
            />
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3 lg:[grid-auto-rows:1fr]">
          {membershipPreview.map((item) => (
            <article
              key={item.tier}
              className="flex h-full flex-col rounded-[2rem] border border-border/80 bg-card/60 p-6 shadow-panel"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                  {item.name}
                </span>
                <span className="rounded-full border border-border/80 bg-background/35 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                  {item.stageLabel}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-base leading-relaxed text-foreground">{item.positioning}</p>
                <p className="text-sm leading-relaxed text-muted">{item.bestFit}</p>
              </div>

              <Link
                href={item.href}
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "mt-6 w-full")}
              >
                Review {item.name}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <FAQSection
        id="faq"
        label="Questions"
        title="Questions business owners building with intent ask before stepping inside."
        description="Clear answers on fit, rooms, pricing, and access."
        items={homeContent.faqs}
      />

      <CTASection
        title="When the fit feels clear, choose the room that fits now."
        description="Review the rooms, compare current pricing clearly, and move into the join path when the decision feels straightforward. Early entry matters most while founder allocation remains open."
        primaryAction={{ href: "/membership", label: "Find Your Room" }}
        secondaryAction={{ href: "/join", label: "Go To Join", variant: "outline" }}
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Crown,
  Handshake,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import { MEMBERSHIP_TIER_ORDER, getMembershipTierDefinition } from "@/config/membership";
import {
  CTASection,
  FAQSection,
  type FeatureGridItem,
  FeatureGrid,
  FoundingOfferCounters,
  HeroSection,
  SectionHeading
} from "@/components/public";
import { buttonVariants } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { getSiteContentSection } from "@/server/site-content";

export const metadata: Metadata = createPageMetadata({
  title: "The Business Circle",
  description:
    "A founder-led business growth ecosystem where business owners build with stronger strategy, better relationships, and clearer momentum.",
  path: "/",
  keywords: [
    "The Business Circle",
    "business network",
    "founder community",
    "business membership",
    "founder ecosystem",
    "business growth network"
  ]
});

const publicRoutes = [
  {
    icon: Compass,
    title: "About The Circle",
    description:
      "Understand what The Business Circle is, why it exists, and the standards shaping the network.",
    href: "/about"
  },
  {
    icon: BookOpen,
    title: "Read The Insights",
    description:
      "Start with the public thinking, articles, and practical guidance built for business owners.",
    href: "/insights"
  },
  {
    icon: Crown,
    title: "Meet The Founder",
    description:
      "See the strategic lens, work, and founder direction behind the wider ecosystem.",
    href: "/founder"
  },
  {
    icon: MessagesSquare,
    title: "Get In Touch",
    description:
      "Reach out for partnerships, questions, founder enquiries, or a more direct conversation.",
    href: "/contact"
  }
] as const;

const ecosystemPillars: FeatureGridItem[] = [
  {
    title: "Better strategy",
    description:
      "Less noise, more direction. The network is built to help business owners think properly and act with more certainty.",
    icon: Target
  },
  {
    title: "Stronger relationships",
    description:
      "Trusted conversations, meaningful introductions, and a room that supports genuine momentum.",
    icon: Handshake
  },
  {
    title: "Useful structure",
    description:
      "Resources, events, membership progression, and founder-led context held inside one coherent environment.",
    icon: ShieldCheck
  }
] as const;

export default async function HomePage() {
  const [homeContent, foundingOffer] = await Promise.all([
    getSiteContentSection("home"),
    getFoundingOfferSnapshot()
  ]);

  const membershipPreview = MEMBERSHIP_TIER_ORDER.map((tier) => {
    const definition = getMembershipTierDefinition(tier);

    return {
      tier,
      name: definition.name,
      badge: definition.content.homePositioningLabel,
      description: definition.content.homeDescription,
      ctaLabel: definition.content.ctaLabel,
      href: `/membership?tier=${definition.slug}`,
      emphasis: definition.content.homeFeaturedLabel ?? definition.content.accessNote ?? null
    };
  });

  return (
    <div className="space-y-14 pb-16 lg:space-y-16">
      <HeroSection
        eyebrow="Founder-led business ecosystem"
        title={homeContent.heroTitle}
        description={homeContent.heroSubtitle}
        supportLine={homeContent.heroSupportLine}
        callouts={["Private membership", "Public insight layer", "Founder-led standards", "Business-first"]}
        primaryAction={{ href: "/membership", label: "Explore Membership" }}
        secondaryAction={{ href: "/join", label: "Go Straight To Join", variant: "outline" }}
        metrics={[
          { value: "Public", label: "Insight layer" },
          { value: "Private", label: "Membership rooms" },
          { value: "Calm", label: "By design" }
        ]}
        aside={
          <article className="public-panel p-6 sm:p-7">
            <p className="premium-kicker inline-flex items-center gap-2">
              <Sparkles size={14} />
              Start Here
            </p>
            <h2 className="mt-5 font-display text-2xl leading-tight text-silver">
              Built for business owners who want a better room around the business.
            </h2>
            <div className="mt-5 space-y-3">
              {[
                "Read the public insight layer and understand the thinking.",
                "Explore the founder, the standards, and the wider ecosystem.",
                "Move into membership when you know the room that fits."
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm leading-relaxed text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        }
      />

      <section className="space-y-6">
        <SectionHeading
          label="Public Site"
          title="Everything non-member starts here"
          description="The homepage is the main public route into The Business Circle. Explore the wider site, understand the environment, then step into membership when the timing is right."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {publicRoutes.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="public-panel interactive-card flex h-full flex-col p-6"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                <item.icon size={18} />
              </span>
              <h3 className="mt-5 font-display text-2xl text-foreground">{item.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{item.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground">
                Open section
                <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          label="Why It Exists"
          title={homeContent.whyTitle}
          description={homeContent.whyDescription}
        />

        <FeatureGrid
          columns={3}
          items={[
            {
              title: homeContent.vibeTitle,
              description: homeContent.vibeDescription,
              icon: Sparkles
            },
            {
              title: homeContent.audienceTitle,
              description: homeContent.audienceDescription,
              icon: Users
            },
            {
              title: homeContent.benefitsTitle,
              description: homeContent.benefitsDescription,
              icon: ShieldCheck
            }
          ]}
        />

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[2rem] border border-gold/20 bg-gradient-to-br from-gold/10 via-card/80 to-card/72 p-6 shadow-gold-soft sm:p-8">
            <p className="premium-kicker">What Makes It Different</p>
            <h2 className="mt-4 font-display text-3xl leading-tight text-foreground sm:text-4xl">
              {homeContent.differenceTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
              {homeContent.differenceDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Built for business owners, not browsers.",
                "No noise, just real conversations and growth.",
                "Move at your own pace, or step into something bigger."
              ].map((line) => (
                <span
                  key={line}
                  className="rounded-full border border-border/80 bg-background/35 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver"
                >
                  {line}
                </span>
              ))}
            </div>
          </article>

          <article className="public-panel p-6 sm:p-7">
            <p className="premium-kicker">Inside The Environment</p>
            <FeatureGrid className="mt-5" columns={3} items={ecosystemPillars} />
          </article>
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          label="Proof And Momentum"
          title={homeContent.proofTitle}
          description={homeContent.proofDescription}
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {homeContent.proofItems.map((item) => (
            <article
              key={item.title}
              className="interactive-card rounded-3xl border border-border/80 bg-card/65 p-6"
            >
              <p className="premium-kicker">{item.eyebrow}</p>
              <h3 className="mt-4 font-display text-2xl leading-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          label="Membership"
          title="Choose the room that fits your next phase"
          description="The homepage gives the full public picture. Membership is where you choose your level of access, context, and proximity."
          action={
            <Link
              href="/membership"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Compare Membership
            </Link>
          }
        />

        <FoundingOfferCounters offer={foundingOffer} />

        <div className="grid gap-4 lg:grid-cols-3">
          {membershipPreview.map((item) => (
            <article
              key={item.tier}
              className="rounded-3xl border border-border/80 bg-card/60 p-6 shadow-panel"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-gold">
                  {item.name}
                </span>
                <span className="rounded-full border border-border/80 bg-background/35 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                  {item.badge}
                </span>
              </div>

              <h3 className="mt-5 font-display text-3xl text-foreground">{item.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>

              {item.emphasis ? (
                <p className="mt-4 text-sm text-silver">{item.emphasis}</p>
              ) : null}

              <Link
                href={item.href}
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "mt-6 w-full")}
              >
                {item.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <FAQSection
        label="FAQ"
        title={homeContent.faqTitle}
        description={homeContent.faqDescription}
        items={homeContent.faqs}
      />

      <CTASection
        title={homeContent.ctaTitle}
        description={homeContent.ctaDescription}
        primaryAction={{ href: "/membership", label: "Explore Membership" }}
        secondaryAction={{ href: "/join", label: "Go Straight To Join", variant: "outline" }}
      />
    </div>
  );
}

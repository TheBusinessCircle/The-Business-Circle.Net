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
  Target
} from "lucide-react";
import { MEMBERSHIP_TIER_ORDER, getMembershipTierDefinition } from "@/config/membership";
import {
  CTASection,
  FAQSection,
  type FeatureGridItem,
  FeatureGrid,
  HeroSection,
  SectionHeading
} from "@/components/public";
import { buttonVariants } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { buildPublicTrustDisplay, getPublicTrustSnapshot } from "@/server/public-site";
import { getSiteContentSection } from "@/server/site-content";

export const metadata: Metadata = createPageMetadata({
  title: "The Business Circle",
  description:
    "A premium business growth network for owners who want better clarity, stronger connections, and real momentum.",
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
      "Understand the standards, the intent behind the network, and the type of business environment being built.",
    href: "/about"
  },
  {
    icon: BookOpen,
    title: "Read The Insights",
    description:
      "Start with the public thinking and practical guidance shaping the way the network approaches growth.",
    href: "/insights"
  },
  {
    icon: Crown,
    title: "Meet The Founder",
    description:
      "See the founder perspective behind the room, the standards, and the wider business ecosystem.",
    href: "/founder"
  },
  {
    icon: MessagesSquare,
    title: "Get In Touch",
    description:
      "Reach out for partnerships, enquiries, introductions, or a more direct conversation.",
    href: "/contact"
  }
] as const;

const clarityItems: FeatureGridItem[] = [
  {
    title: "Better clarity",
    description:
      "Use the network to sharpen thinking, see the next move more clearly, and avoid building momentum inside confusion.",
    icon: Target
  },
  {
    title: "Stronger connections",
    description:
      "Meet more aligned people in a calmer setting built for useful introductions, better conversations, and real business relationships.",
    icon: Handshake
  },
  {
    title: "Real momentum",
    description:
      "Stay close to the mix of member conversation, events, and practical resources that keeps progress moving.",
    icon: ShieldCheck
  }
] as const;

const tierStageLabels = {
  FOUNDATION: "Early stage",
  INNER_CIRCLE: "Growing business",
  CORE: "Established operator"
} as const;

export default async function HomePage() {
  const [homeContent, publicTrustSnapshot] = await Promise.all([
    getSiteContentSection("home"),
    getPublicTrustSnapshot()
  ]);

  const trustDisplay = buildPublicTrustDisplay(publicTrustSnapshot);
  const membershipPreview = MEMBERSHIP_TIER_ORDER.map((tier) => {
    const definition = getMembershipTierDefinition(tier);

    return {
      tier,
      name: definition.name,
      stageLabel: tierStageLabels[tier],
      description: definition.content.homeDescription,
      emphasis: definition.content.homeFeaturedLabel ?? definition.content.accessNote ?? null,
      href: `/membership?tier=${definition.slug}`
    };
  });

  return (
    <div className="space-y-14 pb-16 lg:space-y-16">
      <HeroSection
        eyebrow="Premium business growth network"
        title="A premium business growth network for owners who want better clarity, stronger connections, and real momentum."
        description="The Business Circle Network gives owners a calmer environment to sharpen positioning, build stronger business relationships, and move with more structure through member conversations, curated events, and practical resources."
        supportLine="Start on the public side, understand the room properly, then move into the membership level that fits the stage of the business."
        callouts={["Founder-led", "Private membership", "Built for owners"]}
        primaryAction={{ href: "/membership", label: "Explore Membership" }}
        secondaryAction={{ href: "/about", label: "About The Circle", variant: "outline" }}
        aside={
          <article className="public-panel p-6 sm:p-7">
            <p className="premium-kicker inline-flex items-center gap-2">
              <Sparkles size={14} />
              Inside the network
            </p>
            <div className="mt-5 space-y-3">
              {[
                "Get clearer on what the business needs next.",
                "Build stronger relationships around the work.",
                "Keep momentum moving in a calmer room."
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

      <section className="space-y-8">
        <SectionHeading
          label="What It Does"
          title="A better business environment, not a noisy membership site."
          description="The platform is designed to help owners think more clearly, meet better people, and keep the business moving with more structure."
        />

        <FeatureGrid columns={3} items={clarityItems} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <article className="rounded-[2rem] border border-gold/20 bg-gradient-to-br from-gold/10 via-card/78 to-card/70 p-6 shadow-gold-soft sm:p-8">
          <p className="premium-kicker">Trust snapshot</p>
          <h2 className="mt-4 font-display text-3xl leading-tight text-foreground sm:text-4xl">
            {trustDisplay.kind === "live"
              ? "Current public signal from inside the network"
              : "Public trust is shown with restraint"}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
            {trustDisplay.kind === "live"
              ? "Only useful public movement is shown here. Empty or weak numbers stay private until there is enough signal to show properly."
              : "The public side stays clean until there is enough real movement to show. The standards come first, and the numbers follow when they are worth showing."}
          </p>
        </article>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          {trustDisplay.items.map((item) => (
            <article
              key={item.label}
              className="rounded-3xl border border-border/80 bg-card/60 p-6 shadow-panel"
            >
              <p className="font-display text-3xl text-silver">{item.value}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          label="Public site"
          title="Understand the room before you decide."
          description="The homepage gives you instant context. The wider public site fills in the standards, perspective, and founder-led thinking behind the network."
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
          label="Membership"
          title="Membership follows the stage of the business."
          description="The next step is not about choosing the deepest tier. It is about choosing the room that fits where the business is now."
          action={
            <Link
              href="/membership"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Compare Membership
            </Link>
          }
        />

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
                  {item.stageLabel}
                </span>
              </div>

              <h3 className="mt-5 font-display text-3xl text-foreground">{item.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>

              {item.emphasis ? (
                <p className="mt-4 text-xs uppercase tracking-[0.08em] text-silver">
                  {item.emphasis}
                </p>
              ) : null}

              <Link
                href={item.href}
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "mt-6 w-full")}
              >
                See Where It Fits
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
        secondaryAction={{ href: "/contact", label: "Contact", variant: "outline" }}
      />
    </div>
  );
}

import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Eye,
  Handshake,
  Lightbulb,
  MessagesSquare,
  Sparkles,
  Users
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

const insideItems: FeatureGridItem[] = [
  {
    title: "Structured business discussions",
    description:
      "Conversations are shaped for useful business thinking, not endless noise or low-signal posting.",
    icon: MessagesSquare
  },
  {
    title: "Private network of active owners",
    description:
      "You step into a room of people who are actually building, operating, and making decisions.",
    icon: Users
  },
  {
    title: "Ongoing growth conversations",
    description:
      "The environment stays active around positioning, growth, delivery, relationships, and momentum.",
    icon: Handshake
  },
  {
    title: "Real strategies, not recycled content",
    description:
      "Resources and discussion prompts are built to help owners think more clearly and act more cleanly.",
    icon: Lightbulb
  },
  {
    title: "Visibility into how businesses are growing",
    description:
      "You gain exposure to how other owners are moving, what is working, and where momentum is really coming from.",
    icon: Eye
  },
  {
    title: "Events, collaboration, and deeper support",
    description:
      "The network includes events, collaboration opportunities, and optional closer strategic access when needed.",
    icon: CalendarDays
  }
] as const;

const joinSteps = [
  {
    step: "01",
    title: "Create your profile",
    description:
      "Set up your member profile so people can understand the business properly."
  },
  {
    step: "02",
    title: "Enter the community",
    description:
      "Move straight into the member environment with the right level of access already in place."
  },
  {
    step: "03",
    title: "See active discussions",
    description:
      "You can immediately see the conversations, prompts, and business activity happening inside your room."
  },
  {
    step: "04",
    title: "Introduce your business",
    description:
      "Start with a clear introduction so the network has real context around what you do."
  },
  {
    step: "05",
    title: "Join or start conversations",
    description:
      "Respond where you can add value, ask sharper questions, or open discussions around real business movement."
  },
  {
    step: "06",
    title: "Explore resources by level",
    description:
      "Use the materials, spaces, and opportunities that match the tier you joined at."
  }
] as const;

const forList = [
  "Business owners and active builders",
  "People who want better clarity around the next move",
  "Owners who value stronger relationships and real momentum"
] as const;

const notForList = [
  "Passive learners looking to observe from the edges",
  "Freebie seekers looking for easy extraction",
  "People who are not currently building or operating"
] as const;

const tierStageLabels = {
  FOUNDATION: "Early stage",
  INNER_CIRCLE: "Growing business",
  CORE: "Established operator"
} as const;

const heroImageBlendStyle: CSSProperties = {
  WebkitMaskImage:
    "radial-gradient(ellipse at center, rgba(0,0,0,1) 28%, rgba(0,0,0,0.96) 46%, rgba(0,0,0,0.82) 60%, rgba(0,0,0,0.42) 76%, transparent 94%)",
  maskImage:
    "radial-gradient(ellipse at center, rgba(0,0,0,1) 28%, rgba(0,0,0,0.96) 46%, rgba(0,0,0,0.82) 60%, rgba(0,0,0,0.42) 76%, transparent 94%)"
};

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
        description="The Business Circle Network is a private business environment for owners who want a better room around the work. It helps you think more clearly, build stronger relationships, and keep momentum moving through focused discussion, practical strategy, and the right level of access."
        supportLine="This is for owners who are actively building and want a calmer, more useful place to grow."
        callouts={["Founder-led", "Private membership", "Built for active owners"]}
        primaryAction={{ href: "/membership", label: "Explore Membership" }}
        secondaryAction={{ href: "/join", label: "Go Straight To Join", variant: "outline" }}
        metrics={trustDisplay.items}
        aside={
          <div className="flex h-full flex-col gap-5 lg:min-h-[34rem]">
            <article className="public-panel p-6 sm:p-7">
              <p className="premium-kicker inline-flex items-center gap-2">
                <Sparkles size={14} />
                What this is
              </p>
              <div className="mt-5 space-y-3">
                {[
                  "A calmer place to sharpen the business.",
                  "A more useful network of active owners.",
                  "A structured environment for real momentum."
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

            <figure className="relative flex flex-1 overflow-hidden rounded-[2.6rem] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_62%)] min-h-[20rem] sm:min-h-[23rem] lg:min-h-[28rem]">
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
          </div>
        }
      />

      <section className="space-y-8">
        <SectionHeading
          label="What You Get Inside"
          title="Concrete value, held in one premium environment."
          description="The point is not just access. It is access to a room that helps the business move better."
        />

        <FeatureGrid columns={3} items={insideItems} />
      </section>

      <section className="space-y-8">
        <SectionHeading
          label="What Happens When You Join"
          title="The first experience is clear from day one."
          description="There is no mystery about what happens next. You join, enter the room, and start using it properly."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {joinSteps.map((item) => (
            <article
              key={item.step}
              className="rounded-[1.8rem] border border-border/80 bg-card/60 p-6 shadow-panel"
            >
              <p className="text-[11px] uppercase tracking-[0.12em] text-gold">{item.step}</p>
              <h3 className="mt-4 font-display text-2xl text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          label="Fit"
          title="A clearer sense of who this environment is for."
          description="The Business Circle is designed for people who are building. That clarity helps the room stay useful."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-gold/20 bg-gradient-to-br from-gold/10 via-card/78 to-card/70 p-6 shadow-gold-soft sm:p-8">
            <p className="premium-kicker">This is for</p>
            <div className="mt-5 space-y-4">
              {forList.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm leading-relaxed text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-border/80 bg-card/60 p-6 shadow-panel sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">This is not for</p>
            <div className="mt-5 space-y-4">
              {notForList.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm leading-relaxed text-muted"
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
          label="Membership"
          title="Choose the room that fits the stage of the business."
          description="Foundation, Inner Circle, and Core are designed for different levels of need, depth, and proximity."
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

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Shield, TrendingUp, Users } from "lucide-react";
import { JourneyRail, JsonLd } from "@/components/public";
import { PublicTopVisual, SectionFeatureImage } from "@/components/visual-media";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TREV_FOUNDER_CONTENT } from "@/config/founder";
import { createPageMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema, buildCollectionPageSchema } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { getSiteContentSection } from "@/server/site-content";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const dynamic = "force-dynamic";

const ABOUT_KEYWORDS = [
  "business network for owners",
  "business owners network UK",
  "private business community UK",
  "private founder-led business environment",
  "business growth network",
  "entrepreneur community UK",
  "structured business support",
  "connect with business owners"
] as const;

export const metadata: Metadata = createPageMetadata({
  title: "About The Business Circle Network",
  description:
    "Why The Business Circle Network exists, what problem it solves, and how it creates a calmer, more structured private business environment for owners in the UK.",
  keywords: [...ABOUT_KEYWORDS],
  path: "/about"
});

const problemAreas = [
  {
    title: "Noise",
    description: "Too much activity, not enough clarity."
  },
  {
    title: "Surface-level conversation",
    description: "People can be visible without ever getting to what matters."
  },
  {
    title: "Poor structure",
    description: "Access without placement usually creates loose, low-signal environments."
  },
  {
    title: "Information without momentum",
    description: "Useful ideas mean very little when the room does not support action."
  },
  {
    title: "The wrong context",
    description: "Different stages of business need different kinds of support and proximity."
  }
] as const;

const environmentPillars = [
  {
    title: "Clarity",
    description:
      "A calmer room to think properly about the business and the next move that matters most.",
    icon: Compass
  },
  {
    title: "Structure",
    description:
      "A more intentional environment where placement, standards, and conversation quality are protected.",
    icon: Shield
  },
  {
    title: "Relevant people",
    description:
      "A better way to connect with business owners who are active, thoughtful, and building for real.",
    icon: Users
  },
  {
    title: "Momentum",
    description:
      "Ongoing context that helps the business keep moving without drifting back into noise or confusion.",
    icon: TrendingUp
  }
] as const;

const forAudience = [
  "Active business owners, founders, and operators who want a stronger environment around the work",
  "People who value clearer placement, better context, and conversations with substance",
  "Business owners building with intent who want the room around the work to feel calmer, sharper, and more commercially useful"
] as const;

const notForAudience = [
  "Passive browsers looking for something to dip in and out of",
  "People chasing access without intent, contribution, or clarity",
  "Anyone looking for hype, performance, or surface-level networking"
] as const;

export default async function AboutPage() {
  const [aboutContent, aboutHeroPlacement, aboutStoryPlacement] = await Promise.all([
    getSiteContentSection("about"),
    getVisualMediaPlacement("about.hero"),
    getVisualMediaPlacement("about.section.story")
  ]);

  return (
    <div className="public-page-stack">
      <JsonLd
        data={buildCollectionPageSchema({
          title: "About The Business Circle Network",
          description:
            "Founder-led context on why The Business Circle Network exists and how it creates a calmer, more structured private business environment for business owners.",
          path: "/about",
          keywords: [...ABOUT_KEYWORDS],
          itemPaths: ["/membership", "/founder", "/contact"]
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" }
        ])}
      />

      <PublicTopVisual
        placement={aboutHeroPlacement}
        eyebrow="About The Business Circle Network"
        title="Built for owners who want a calmer, sharper room around real business decisions."
        description="The story behind why BCN exists, how it is led, and what it is designed to change for serious business owners."
        tone="anchored"
        fallbackLabel="About top visual"
      />

      <section className="public-hero-spacing relative overflow-hidden rounded-[2.05rem] border border-border/80 bg-card/55 shadow-panel">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.48)_100%),linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.62)_100%)]" />

        <div className="relative max-w-5xl space-y-6">
          <p className="premium-kicker">About The Business Circle Network</p>
          <div className="space-y-5">
            <h1 className="max-w-4xl font-display text-4xl leading-[0.98] tracking-tight text-foreground sm:text-5xl lg:text-7xl">
              Built for owners who are tired of being visible everywhere and properly supported nowhere.
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-white/80 sm:text-xl">
              The Business Circle Network is a private founder-led business environment for owners
              who want a calmer, more structured room around growth. It was built for people who
              want better conversations, clearer placement, and stronger momentum in a room they
              can actually use.
            </p>
          </div>
        </div>
      </section>

      <JourneyRail
        currentStep="about"
        note="This page explains the thinking behind the room. The Membership page helps you place yourself properly."
        nextAction={{ href: "/membership", label: "Continue To Membership" }}
      />

      <section
        className={cn(
          "mx-auto gap-6 px-1 xl:items-start",
          aboutStoryPlacement?.isActive && aboutStoryPlacement.imageUrl
            ? "grid max-w-5xl xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.46fr)]"
            : "max-w-3xl space-y-6"
        )}
      >
        <div className="space-y-6">
          <p className="premium-kicker">Founder reality</p>
          <div className="space-y-5 text-lg leading-relaxed text-muted">
            <p>
              I built this because I know what it feels like to carry a business in real life. The
              work sits alongside clients, pressure, family, time, responsibility, and the constant
              need to make clear decisions while still moving things forward.
            </p>
            <p>
              Most business spaces do not feel short on activity. They feel short on substance. You
              can be surrounded by updates, events, advice, and people, yet still have very little
              room to think properly or work through what actually matters.
            </p>
            <p>
              That gap kept standing out to me. Owners were often surrounded by visibility and still
              short on the kind of environment that helps real progress happen.
            </p>
          </div>
        </div>
        {aboutStoryPlacement?.isActive && aboutStoryPlacement.imageUrl ? (
          <SectionFeatureImage
            placement={aboutStoryPlacement}
            tone="story"
            className="min-h-[15rem]"
          />
        ) : null}
      </section>

      <section className="public-section">
        <div className="max-w-3xl space-y-4">
          <p className="premium-kicker">The problem</p>
          <h2 className="text-3xl leading-tight text-foreground sm:text-4xl">
            Too many business spaces look active without being genuinely useful.
          </h2>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            A lot of spaces promise access, support, and growth. In practice, they often become
            noisy rooms with loose standards, surface-level conversations, and very little help
            around the real work of building a business.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {problemAreas.map((item) => (
            <Card key={item.title} className="border-border/90 bg-card/68 shadow-panel-soft">
              <CardContent className="space-y-3 p-5 sm:p-6">
                <h3 className="text-xl text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="public-hero-spacing-tight relative overflow-hidden rounded-[1.9rem] border border-gold/25 bg-gradient-to-br from-gold/10 via-card/75 to-card/70 shadow-gold-soft">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.34)_100%),linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.38)_100%)]" />
        <div className="relative max-w-4xl space-y-5">
          <p className="premium-kicker">The shift</p>
          <h2 className="font-display text-4xl leading-tight tracking-tight text-foreground lg:text-5xl">
            So this had to be built differently.
          </h2>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            Not louder. Not broader. Not another room built on performance. The aim was to create a
            more intentional private business environment where owners could think clearly, meet the
            right people, and build with better structure before the conversation even started.
          </p>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            That is why this exists. It was built to feel calmer, more useful, and more honest
            about what serious business owners actually need around the work.
          </p>
        </div>
      </section>

      <section className="public-section">
        <div className="max-w-4xl space-y-4">
          <p className="premium-kicker">What this actually is</p>
          <h2 className="text-3xl leading-tight text-foreground sm:text-4xl">
            A structured business environment shaped around clarity, better conversations, relevant
            people, and forward movement.
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-muted sm:text-lg">
            <p>{aboutContent.intro}</p>
            <p>
              In practice, it is a private business environment for owners who want the room around
              the work to feel better. It is closer to a serious business environment than a feed,
              and the point is simple: better context, better judgement, and better momentum.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {environmentPillars.map((item) => (
            <Card key={item.title} className="border-border/90 bg-card/68 shadow-panel-soft">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <item.icon size={18} />
                </span>
                <div className="space-y-3">
                  <h3 className="text-2xl text-foreground">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="public-section">
        <div className="max-w-4xl space-y-4">
          <p className="premium-kicker">Built For Better Rooms</p>
          <h2 className="text-3xl leading-tight text-foreground sm:text-4xl">
            Built for business owners who need better rooms.
          </h2>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            The Business Circle was built around a simple belief: business owners do not need more
            noise. They need better rooms, better input, and better conversations with people who
            understand the weight of running something.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            "Founder-led",
            "Business-owner focused",
            "Private environment",
            "Structured access",
            "Standards and moderation",
            "No spam and no noise"
          ].map((item) => (
            <Card key={item} className="border-border/90 bg-card/70 shadow-panel-soft">
              <CardContent className="p-5 sm:p-6">
                <p className="text-sm leading-relaxed text-foreground">{item}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)]">
        <Card className="border-border/90 bg-card/72 shadow-panel-soft">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <p className="premium-kicker">How it is led</p>
            <h2 className="max-w-2xl text-3xl leading-tight text-foreground sm:text-4xl">
              Founder-led does not mean founder-centred.
            </h2>
            <p className="text-base leading-relaxed text-muted sm:text-lg">
              {TREV_FOUNDER_CONTENT.summary}
            </p>
            <p className="text-base leading-relaxed text-muted">
              My job is to shape the environment, protect the standard, and keep the room useful. I
              am not trying to become the centre of attention. I am trying to make sure the space
              stays calm, trusted, and genuinely valuable for the people building inside it.
            </p>
          </CardContent>
        </Card>

        <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/82 to-card/74 shadow-gold-soft">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <p className="text-sm leading-relaxed text-silver">
              &ldquo;{TREV_FOUNDER_CONTENT.quote}&rdquo;
            </p>
            <div className="space-y-3">
              {TREV_FOUNDER_CONTENT.philosophy.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-background/20 px-4 py-3 text-sm text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="public-section">
        <div className="max-w-3xl space-y-4">
          <p className="premium-kicker">Who it is for</p>
          <h2 className="text-3xl leading-tight text-foreground sm:text-4xl">
            The room works better when the fit is clear.
          </h2>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            This is for business owners building with intent who want a stronger environment around
            the business. That clarity helps the room stay useful without turning it into a closed
            or performative space.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-gold/25 bg-card/70 shadow-panel-soft">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">This is for</p>
              <div className="space-y-3">
                {forAudience.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-background/20 px-4 py-3 text-sm text-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/90 bg-card/70 shadow-panel-soft">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">This is not for</p>
              <div className="space-y-3">
                {notForAudience.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-background/20 px-4 py-3 text-sm text-muted"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-6 text-center">
        <p className="premium-kicker mx-auto">Quiet close</p>
        <h2 className="text-3xl leading-tight text-foreground sm:text-4xl">
          If you have been looking for a better room around the business, that is the point of
          this.
        </h2>
        <p className="text-base leading-relaxed text-muted sm:text-lg">
          No hard sell. Just a more intentional environment for business owners building with
          intent who want structure, better context, and steadier momentum around the work.
        </p>
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/membership"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "group w-full sm:w-auto")}
          >
            See The Membership Rooms
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/contact"
            className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
          >
            Start A Conversation
          </Link>
        </div>
      </section>
    </div>
  );
}

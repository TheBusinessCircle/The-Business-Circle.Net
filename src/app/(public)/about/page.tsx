import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Shield,
  TrendingUp,
  Users
} from "lucide-react";
import { JsonLd } from "@/components/public";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TREV_FOUNDER_CONTENT } from "@/config/founder";
import { createPageMetadata } from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema
} from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { getSiteContentSection } from "@/server/site-content";

export const dynamic = "force-dynamic";

const ABOUT_KEYWORDS = [
  "business network for owners",
  "business growth network",
  "private business community UK",
  "business owners network",
  "entrepreneur community",
  "business support network",
  "connect with business owners",
  "structured business growth"
] as const;

export const metadata: Metadata = createPageMetadata({
  title: "About The Business Circle Network",
  description:
    "The Business Circle Network is a founder-led business network for owners who want clarity, stronger connections, and real momentum inside a private UK business community.",
  keywords: [...ABOUT_KEYWORDS],
  path: "/about"
});

const problemLines = [
  "Too much noise.",
  "Not enough structure.",
  "Too much surface interaction.",
  "Not enough real momentum."
] as const;

const experiencePillars = [
  {
    title: "Clarity",
    description:
      "A calmer room to think properly about the business, make better decisions, and see what matters next.",
    icon: Compass
  },
  {
    title: "Structure",
    description:
      "A more intentional environment where discussion, contribution, and standards support better judgement over time.",
    icon: Shield
  },
  {
    title: "Meaningful connections",
    description:
      "A better way to connect with business owners who are active, thoughtful, and serious about what they are building.",
    icon: Users
  },
  {
    title: "Momentum",
    description:
      "Ongoing conversation and context that help the business keep moving without drifting back into noise.",
    icon: TrendingUp
  }
] as const;

const forAudience = [
  "Business owners and entrepreneurs who are actively building",
  "People who want better clarity, stronger connections, and steadier momentum",
  "Founders who want to connect with business owners in a more useful environment",
  "Businesses that value standards, structure, and practical conversation"
] as const;

const notForAudience = [
  "Passive learners looking for something to browse",
  "Freebie seekers chasing access without commitment",
  "People who are not currently building or contributing in a real way",
  "Anyone looking for hype, noise, or surface-level networking"
] as const;

export default async function AboutPage() {
  const aboutContent = await getSiteContentSection("about");

  return (
    <div className="space-y-20 pb-20 sm:space-y-24 lg:space-y-28">
      <JsonLd
        data={buildCollectionPageSchema({
          title: "About The Business Circle Network",
          description:
            "Founder-led context on why The Business Circle Network exists and how it creates a calmer, more structured environment for business owners.",
          path: "/about",
          keywords: [...ABOUT_KEYWORDS],
          itemPaths: ["/membership", "/founder", "/insights"]
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" }
        ])}
      />

      <section className="relative overflow-hidden rounded-[2.2rem] border border-border/80 bg-card/55 px-6 py-10 shadow-panel sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute -left-20 top-12 h-56 w-56 rounded-full bg-silver/10 blur-[90px]" />
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-gold/18 blur-[110px]" />

        <div className="relative max-w-5xl space-y-6">
          <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
            About The Business Circle Network
          </Badge>
          <div className="space-y-5">
            <h1 className="max-w-4xl font-display text-4xl leading-[0.98] text-foreground sm:text-5xl lg:text-7xl">
              Built for owners who need a better room around the business.
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-muted sm:text-xl">
              The Business Circle Network is a business network for owners who want
              clearer thinking, stronger relationships, and real momentum. It is
              the kind of private business community UK founders often struggle to
              find when they want a calmer business growth network with more
              structure and less noise.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-6 px-1">
        <p className="premium-kicker">Founder reality</p>
        <div className="space-y-5 text-lg leading-relaxed text-muted">
          <p>
            I built this because I know what it feels like to carry a business in
            real life. The work does not sit in isolation. It sits alongside
            clients, pressure, family, time, and the constant need to make clear
            decisions while still moving things forward.
          </p>
          <p>
            Most business environments do not feel short on activity. They feel
            short on substance. You can be surrounded by updates, advice, events,
            and people, yet still have very little space to think properly or work
            through what actually matters.
          </p>
          <p>
            That gap stayed with me. It made me pay attention to how often owners
            are visible everywhere and properly supported nowhere.
          </p>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <div className="space-y-4">
          <p className="premium-kicker">The problem</p>
          <h2 className="max-w-xl font-display text-3xl leading-tight text-foreground sm:text-4xl">
            Too many business communities look active without being useful.
          </h2>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            {problemLines.map((line) => (
              <p
                key={line}
                className="font-display text-2xl leading-tight text-silver sm:text-[2rem]"
              >
                {line}
              </p>
            ))}
          </div>
          <div className="space-y-4 text-base leading-relaxed text-muted">
            <p>
              A lot of spaces call themselves an entrepreneur community or a
              business support network, but the experience often becomes a stream
              of surface-level interaction. People show up, post, disappear, and
              leave with very little to build on.
            </p>
            <p>
              You can technically connect with business owners in those spaces, but
              that is not the same as building trusted relationships, sharper
              thinking, or the kind of environment that genuinely supports the next
              stage of the business.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2.1rem] border border-gold/25 bg-gradient-to-br from-gold/10 via-card/75 to-card/70 px-6 py-8 shadow-gold-soft sm:px-10 sm:py-12 lg:px-12 lg:py-14">
        <div className="pointer-events-none absolute -right-16 top-0 h-60 w-60 rounded-full bg-gold/16 blur-[90px]" />
        <div className="relative max-w-4xl space-y-5">
          <p className="premium-kicker">The shift</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            So I decided to build the kind of environment I would actually want to
            walk into.
          </h2>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            Not louder. Not broader. Not another room built on performance. The
            aim was to create a more intentional space where owners could think
            clearly, meet the right people, and build structured business growth
            without having to fight through noise first.
          </p>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            That is why this exists. It was built to feel more grounded, more
            useful, and more honest about what serious business owners actually
            need.
          </p>
        </div>
      </section>

      <section className="space-y-8">
        <div className="max-w-4xl space-y-4">
          <p className="premium-kicker">What this actually is</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            A business growth network shaped around clarity, structure, meaningful
            connection, and momentum.
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-muted sm:text-lg">
            <p>{aboutContent.intro}</p>
            <p>
              In practice, it is a private business community built for owners who
              want the room around the work to feel better. It is closer to a
              serious business support network than a content feed, and the point
              is simple: better conversations, better context, and better movement.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {experiencePillars.map((item) => (
            <Card
              key={item.title}
              className="border-border/90 bg-card/68 shadow-panel-soft"
            >
              <CardContent className="space-y-4 p-6 sm:p-7">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <item.icon size={18} />
                </span>
                <div className="space-y-3">
                  <h3 className="font-display text-2xl text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    {item.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)]">
        <Card className="border-border/90 bg-card/72 shadow-panel-soft">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <p className="premium-kicker">Founder positioning</p>
            <h2 className="max-w-2xl font-display text-3xl leading-tight text-foreground sm:text-4xl">
              Founder-led does not mean founder-centred.
            </h2>
            <p className="text-base leading-relaxed text-muted sm:text-lg">
              {TREV_FOUNDER_CONTENT.summary}
            </p>
            <p className="text-base leading-relaxed text-muted">
              My role here is to shape the environment, protect the standard, and
              keep the room useful. I am not trying to become the centre of
              attention. I am trying to make sure the space stays calm, trusted,
              and genuinely valuable for the people building inside it.
            </p>
            <p className="text-base leading-relaxed text-muted">
              A strong business owners network should help people think better, not
              simply give them somewhere to appear. That is the standard I want
              this place to hold.
            </p>
          </CardContent>
        </Card>

        <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/82 to-card/74 shadow-gold-soft">
          <CardContent className="space-y-5 p-6 sm:p-8">
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

      <section className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <p className="premium-kicker">Who it&rsquo;s for / not for</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            The room works best when the fit is clear.
          </h2>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            This is for business owners, entrepreneurs, and people building
            actively. It is not designed to be for everyone, and that is part of
            what keeps the environment useful.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-gold/25 bg-card/70 shadow-panel-soft">
            <CardContent className="space-y-5 p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                This is for
              </p>
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
            <CardContent className="space-y-5 p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
                This is not for
              </p>
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
        <p className="premium-kicker mx-auto">Closing</p>
        <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
          If you have been looking for a calmer, more useful business environment,
          this is why it exists.
        </h2>
        <p className="text-base leading-relaxed text-muted sm:text-lg">
          No pressure. No performance. Just a more intentional place for owners who
          want clarity, stronger relationships, and real momentum around the work
          they are building.
        </p>
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/membership"
            className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}
          >
            Explore Membership
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/founder"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
          >
            Meet Trev
          </Link>
        </div>
      </section>
    </div>
  );
}

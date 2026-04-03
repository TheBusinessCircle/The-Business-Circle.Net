import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Handshake, Lightbulb, Rocket, ShieldCheck, Users } from "lucide-react";
import { TREV_FOUNDER_CONTENT } from "@/config/founder";
import { CTASection, FeatureGrid, SectionHeading } from "@/components/public";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import { getSiteContentSection } from "@/server/site-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "About",
  description:
    "Learn why The Business Circle Network exists, what it believes about growth, and how the live founder-led ecosystem is structured.",
  path: "/about"
});

const aboutFoundationItems = [
  {
    icon: Rocket,
    title: "Why it was built",
    description:
      "Because too many business communities are shallow, noisy, and transactional when founders need something more useful."
  },
  {
    icon: ShieldCheck,
    title: "What it values",
    description:
      "Trust, strategy, collaboration, accountability, and a better environment for long-term business growth."
  },
  {
    icon: Lightbulb,
    title: "What it is not",
    description:
      "Not a hype funnel, not a cheap networking group, and not a noisy online community pretending to be a business ecosystem."
  },
  {
    icon: Handshake,
    title: "What it aims to create",
    description:
      "A more intentional place where ambitious people can connect, build, and grow around real opportunity."
  }
];

const builtForItems = [
  {
    icon: Users,
    title: "Business owners and founders",
    description:
      "People who want clearer strategy, better relationships, and more serious support around growth."
  },
  {
    icon: Compass,
    title: "Startups, local businesses, and modern firms",
    description:
      "Ambitious builders who need stronger trust, better positioning, and a better ecosystem around their next phase."
  }
];

export default async function AboutPage() {
  const aboutContent = await getSiteContentSection("about");

  return (
    <div className="space-y-16 pb-16">
      <section className="space-y-8">
        <SectionHeading
          label="About"
          title="You're In The Business Circle Network"
          description={aboutContent.intro}
        />
        <FeatureGrid columns={4} items={aboutFoundationItems} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="public-panel p-6 sm:p-8">
          <p className="premium-kicker">Founder Philosophy</p>
          <h2 className="mt-5 font-display text-3xl text-foreground">
            Growth needs the right environment, not just more information
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
            <p>
              The Business Circle Network exists because Trevor Newton saw a gap. Business owners needed a better place to connect, collaborate, and grow without being pushed into shallow networking or low-trust noise.
            </p>
            <p>
              The belief behind the platform is simple: ambitious business owners need a better environment for growth to happen properly.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/founder">
              <Button>Meet Trevor Newton</Button>
            </Link>
            <Link href="/membership">
              <Button variant="outline">Explore Membership</Button>
            </Link>
          </div>
        </article>

        <article className="public-panel border-gold/25 bg-gradient-to-br from-gold/8 via-card/72 to-card/70 p-6 sm:p-8">
          <p className="premium-kicker">Strategic Lens</p>
          <h2 className="mt-5 font-display text-3xl text-foreground">
            The strategic lens behind the platform
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {TREV_FOUNDER_CONTENT.summary}
          </p>
          <div className="mt-5 space-y-3">
            {TREV_FOUNDER_CONTENT.vibeMethod.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3"
              >
                <p className="font-display text-xl text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="space-y-8">
        <SectionHeading
          label="Built For"
          title="The kind of people this network is being built for"
          description="This platform is for people who want a more thoughtful, ambitious, and trust-rich place to grow a serious business."
        />
        <FeatureGrid columns={2} items={builtForItems} />
      </section>

      <section className="public-panel p-6 sm:p-8">
        <p className="premium-kicker">Live Ecosystem</p>
        <h2 className="mt-5 font-display text-3xl text-foreground">
          This is now live and built to stay structured as it grows
        </h2>
        <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            The Business Circle Network is live, founder-led, and designed to feel premium, useful, and calm from the first visit.
          </p>
          <p>
            The goal is to keep the right culture, quality, and momentum visible as the network grows with substance rather than noise.
          </p>
        </div>
      </section>

      <CTASection
        title="Join the first wave of builders entering The Business Circle Network"
        description="If the vision feels aligned, join the first wave of members now or explore the membership structure in more detail."
        primaryAction={{ href: "/join", label: "Join The Business Circle" }}
        secondaryAction={{ href: "/membership", label: "View Membership", variant: "outline" }}
      />
    </div>
  );
}

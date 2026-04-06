import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Compass,
  Crown,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { auth } from "@/auth";
import { JoinExperience } from "@/components/auth/join-experience";
import { BrandMark } from "@/components/branding/brand-mark";
import { SectionHeading } from "@/components/public";
import { Button } from "@/components/ui/button";
import { getMembershipTierLabel, MEMBERSHIP_PLANS } from "@/config/membership";
import { roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { getPublicTrustSnapshot } from "@/server/public-site";

type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type LandingSectionProps = {
  id?: string;
  label: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  align?: "left" | "center";
};

type ProblemShift = {
  problem: string;
  solution: string;
  description: string;
};

type StoryCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function withQuery(pathname: string, params: Record<string, string | undefined>) {
  const url = new URL(pathname, "http://localhost");

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  const query = url.searchParams.toString();
  return query.length ? `${url.pathname}?${query}` : url.pathname;
}

function resolveTier(value: string | undefined): "FOUNDATION" | "INNER_CIRCLE" | "CORE" {
  if (value === "CORE") {
    return "CORE";
  }

  if (value === "INNER_CIRCLE") {
    return "INNER_CIRCLE";
  }

  return "FOUNDATION";
}

function formatSnapshotValue(value: number, emptyLabel: string) {
  return value > 0 ? value.toLocaleString("en-GB") : emptyLabel;
}

function JoinLandingSection({
  id,
  label,
  title,
  description,
  children,
  className,
  align = "left"
}: LandingSectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-24 space-y-8 sm:space-y-10", className)}>
      <SectionHeading
        label={label}
        title={title}
        description={description}
        align={align}
        className={align === "center" ? "mx-auto" : undefined}
      />
      {children}
    </section>
  );
}

const heroSupportPoints = [
  "Private member ecosystem",
  "Founder-led growth environment",
  "Real conversations and built-in calls"
] as const;

const whyItExistsShifts: readonly ProblemShift[] = [
  {
    problem: "Too much noise",
    solution: "Clearer direction",
    description: "A calmer room makes it easier to see what matters and what does not."
  },
  {
    problem: "Building alone",
    solution: "Real business environment",
    description: "This is designed for owners and founders who are actually carrying something."
  },
  {
    problem: "Surface-level advice",
    solution: "Better conversations",
    description: "More substance, more context, and fewer opinions from the sidelines."
  },
  {
    problem: "Stalled progress",
    solution: "Structured momentum",
    description: "The right environment helps decisions move instead of sitting in your head."
  }
] as const;

const valueCards: readonly StoryCard[] = [
  {
    icon: Compass,
    title: "Clarity",
    description:
      "Stop guessing what matters most. Get a clearer sense of direction, priorities, and next moves."
  },
  {
    icon: Building2,
    title: "Environment",
    description:
      "Be around people who are actually building. Not just watching, liking, and talking."
  },
  {
    icon: ShieldCheck,
    title: "Accountability",
    description:
      "Momentum gets stronger when the right people are around you and progress stays visible."
  },
  {
    icon: MessageSquareText,
    title: "Real conversations",
    description:
      "Less noise. More substance. Speak to people who understand business, movement, and growth."
  },
  {
    icon: LockKeyhole,
    title: "Private access",
    description:
      "A more intentional space than public platforms, scattered groups, and performative networking."
  },
  {
    icon: Crown,
    title: "Founder-led direction",
    description:
      "Built with structure, purpose, and actual intent behind it, not generic community theatre."
  },
  {
    icon: PhoneCall,
    title: "Built-in calls and rooms",
    description:
      "Not just chat. Real connection inside the ecosystem when a better conversation needs to happen properly."
  }
] as const;

const ecosystemCards: readonly StoryCard[] = [
  {
    icon: Users,
    title: "Private member directory",
    description: "Know who is in the room, what they do, and why a conversation might be worth having."
  },
  {
    icon: MessageSquareText,
    title: "Structured business discussions",
    description: "Conversation is organised to create signal, not to produce endless scrolling."
  },
  {
    icon: BookOpen,
    title: "Premium resources",
    description: "Useful material that sharpens thinking and gives the next move more structure."
  },
  {
    icon: PhoneCall,
    title: "Live rooms and calls",
    description: "From direct member calls to private rooms, connection is part of the ecosystem itself."
  },
  {
    icon: CalendarDays,
    title: "Events and strategic sessions",
    description: "Live moments that keep the network moving without turning the platform into noise."
  },
  {
    icon: Crown,
    title: "Inner Circle and Core progression",
    description: "A clearer path into more focused rooms, stronger context, and closer access."
  }
] as const;

const fitCards: readonly StoryCard[] = [
  {
    icon: BriefcaseBusiness,
    title: "Business owners",
    description: "People making real commercial decisions and carrying real responsibility."
  },
  {
    icon: Sparkles,
    title: "Founders",
    description: "Builders who want a better room around the business than public platforms can offer."
  },
  {
    icon: Building2,
    title: "Operators",
    description: "People close to execution who value clarity, structure, and stronger context."
  },
  {
    icon: ShieldCheck,
    title: "Serious builders",
    description: "People ready for better conversations, not another place to drift."
  }
] as const;

const connectionPoints = [
  "1 to 1 member calls",
  "Premium group rooms",
  "Founder-led sessions",
  "Conversations that move beyond comments"
] as const;

const trustCards: readonly StoryCard[] = [
  {
    icon: Crown,
    title: "Founder-led ecosystem",
    description: "The room has a point of view, a standard, and a clear reason for existing."
  },
  {
    icon: Layers3,
    title: "Structured member environment",
    description: "Access is tiered with intent so the experience stays valuable as members grow."
  },
  {
    icon: LockKeyhole,
    title: "Secure registration and private access",
    description: "The sign-up path, member access, and billing flow are built to feel clear and trustworthy."
  },
  {
    icon: ShieldCheck,
    title: "Business-first positioning",
    description: "This is designed for owners who want substance, privacy, and stronger decision-making."
  }
] as const;

const joinDecisionSteps = [
  {
    step: "01",
    title: "Choose the room that fits now",
    description:
      "Foundation is the clearest place to begin. Inner Circle deepens the signal. Core is the closest strategic layer."
  },
  {
    step: "02",
    title: "Create your account once",
    description:
      "Your tier selection, invite flow, and secure checkout stay connected so there is no messy handoff."
  },
  {
    step: "03",
    title: "Enter with intention",
    description:
      "The point is not to collect access. It is to enter the right environment and actually use it properly."
  }
] as const;

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Enter a premium founder-led growth environment for business owners who want clearer direction, stronger conversations, and a better room to grow inside.",
  keywords: [
    "join business membership",
    "founder community signup",
    "business circle membership",
    "private founder ecosystem",
    "join founder network"
  ],
  path: "/join"
});

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const session = await auth();
  const params = await searchParams;
  const [foundingOffer, trustSnapshot] = await Promise.all([
    getFoundingOfferSnapshot(),
    getPublicTrustSnapshot()
  ]);
  const from = firstValue(params.from);
  const error = firstValue(params.error);
  const mode = firstValue(params.mode);
  const billing = firstValue(params.billing);
  const selectedTier = resolveTier(firstValue(params.tier));
  const inviteCode = (firstValue(params.invite) ?? "").trim().toUpperCase();
  const isAuthenticated = Boolean(session?.user);
  const hasActiveSubscription = session?.user?.hasActiveSubscription ?? false;
  const currentTier = session?.user
    ? roleToTier(session.user.role, session.user.membershipTier)
    : "FOUNDATION";

  if (mode === "signin") {
    const search = new URLSearchParams();

    if (from) {
      search.set("from", from);
    }

    if (error) {
      search.set("error", error);
    }

    const loginUrl = search.size ? `/login?${search.toString()}` : "/login";
    redirect(loginUrl);
  }

  const commonJoinParams = {
    from,
    invite: inviteCode || undefined
  };

  const foundationJoinBase = withQuery("/join", {
    tier: "FOUNDATION",
    ...commonJoinParams
  });
  const innerCircleJoinBase = withQuery("/join", {
    tier: "INNER_CIRCLE",
    ...commonJoinParams
  });
  const coreJoinBase = withQuery("/join", {
    tier: "CORE",
    ...commonJoinParams
  });
  const selectedTierJoinBase = withQuery("/join", {
    tier: selectedTier,
    ...commonJoinParams
  });
  const foundationLoginHref = withQuery("/login", {
    from: from ?? "/membership?tier=FOUNDATION"
  });
  const innerCircleLoginHref = withQuery("/login", {
    from: from ?? "/membership?tier=INNER_CIRCLE"
  });
  const coreLoginHref = withQuery("/login", {
    from: from ?? "/membership?tier=CORE"
  });
  const heroPrimaryHref = isAuthenticated ? "#join-entry" : `${selectedTierJoinBase}#join-entry`;
  const heroSecondaryHref = "#what-you-get";
  const roomsHref = "#rooms-and-tiers";
  const joinEntryHref = "#join-entry";
  const foundationEntryHref = `${foundationJoinBase}#join-entry`;
  const foundingSignal = foundingOffer.foundation.available
    ? `${foundingOffer.foundation.remaining} Foundation founding place${foundingOffer.foundation.remaining === 1 ? "" : "s"} currently open.`
    : "Foundation is live and ready at the standard monthly rate.";

  const heroMetrics = [
    {
      value: formatSnapshotValue(trustSnapshot.publicMemberCount, "Private"),
      label: "Visible member profiles"
    },
    {
      value: formatSnapshotValue(trustSnapshot.activeDiscussionCount, "Active"),
      label: "Discussions moving this week"
    },
    {
      value: formatSnapshotValue(trustSnapshot.connectionWinsCount, "Growing"),
      label: "Connection wins being shared"
    }
  ] as const;

  const roomCards = [
    {
      tier: "FOUNDATION" as const,
      kicker: "The clearest place to begin",
      title: "Foundation",
      description:
        "Best for business owners who want stronger direction, better structure, and the right entry point into the ecosystem.",
      price: foundingOffer.foundation.available
        ? `GBP ${foundingOffer.foundation.foundingPrice}/month founding`
        : `GBP ${MEMBERSHIP_PLANS.FOUNDATION.monthlyPrice}/month`,
      href: foundationJoinBase,
      ctaLabel: "Start With Foundation",
      buttonVariant: "foundation" as const,
      panelClassName:
        "border-foundation/35 bg-gradient-to-br from-foundation/14 via-card/78 to-background/74"
    },
    {
      tier: "INNER_CIRCLE" as const,
      kicker: "The next level of focus",
      title: "Inner Circle",
      description:
        "Best for founders who want deeper conversations, stronger intent, and a more committed environment.",
      price: foundingOffer.innerCircle.available
        ? `GBP ${foundingOffer.innerCircle.foundingPrice}/month founding`
        : `GBP ${MEMBERSHIP_PLANS.INNER_CIRCLE.monthlyPrice}/month`,
      href: innerCircleJoinBase,
      ctaLabel: "Explore Inner Circle",
      buttonVariant: "innerCircle" as const,
      panelClassName:
        "border-silver/24 bg-gradient-to-br from-silver/12 via-card/78 to-background/72"
    },
    {
      tier: "CORE" as const,
      kicker: "The highest-value room",
      title: "Core",
      description:
        "Built for people who want closer founder proximity, stronger strategic context, and the calmest premium space.",
      price: foundingOffer.core.available
        ? `GBP ${foundingOffer.core.foundingPrice}/month founding`
        : `GBP ${MEMBERSHIP_PLANS.CORE.monthlyPrice}/month`,
      href: coreJoinBase,
      ctaLabel: "See Core",
      buttonVariant: "core" as const,
      panelClassName:
        "border-gold/30 bg-gradient-to-br from-gold/12 via-card/78 to-background/72"
    }
  ] as const;

  return (
    <div className="relative overflow-x-clip pb-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,_rgba(76,130,255,0.2),_transparent_46%),radial-gradient(circle_at_18%_12%,_rgba(214,180,103,0.16),_transparent_28%)]" />

      <div className="space-y-24 sm:space-y-28 lg:space-y-32">
        <section className="join-cinematic-shell relative isolate overflow-hidden rounded-[2.25rem] border border-white/10 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 xl:px-12 xl:py-12">
          <div className="join-network-grid pointer-events-none absolute inset-0 opacity-45" />
          <div className="pointer-events-none absolute -left-20 top-12 h-56 w-56 rounded-full bg-gold/20 blur-[96px]" />
          <div className="pointer-events-none absolute -right-24 top-8 h-64 w-64 rounded-full bg-blue-500/20 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-[78%] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[110px]" />

          <div className="relative grid items-center gap-10 xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] xl:gap-12">
            <div className="space-y-8">
              <div className="space-y-5">
                <p className="premium-kicker">Private Growth Environment For Business Owners</p>
                <div className="space-y-5">
                  <h1 className="max-w-4xl font-display text-4xl leading-[1.02] text-foreground sm:text-5xl lg:text-6xl xl:text-[4.9rem]">
                    Stop building in the wrong environment.
                    <span className="block text-silver">
                      Enter the room where clarity, connection, and real progress come together.
                    </span>
                  </h1>
                  <p className="max-w-3xl text-base leading-relaxed text-silver sm:text-lg">
                    The Business Circle is a premium founder-led ecosystem for business owners who
                    want better conversations, stronger direction, and a serious environment to
                    grow inside.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={heroPrimaryHref}>
                  <Button size="lg" className="group min-w-[15rem] justify-center">
                    Join The Business Circle
                    <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href={heroSecondaryHref}>
                  <Button size="lg" variant="outline" className="min-w-[12rem] justify-center">
                    See What You Get
                  </Button>
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {heroSupportPoints.map((point) => (
                  <div
                    key={point}
                    className="join-floating-panel flex items-start gap-3 px-4 py-4 text-sm text-muted"
                  >
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {heroMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[1.35rem] border border-white/10 bg-background/18 px-4 py-4 backdrop-blur"
                  >
                    <p className="font-display text-3xl text-foreground">{metric.value}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.08em] text-silver/80">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                <span>{foundingSignal}</span>
                {!isAuthenticated ? (
                  <Link href="/login" className="inline-flex items-center gap-2 text-silver hover:text-foreground">
                    Already a member? Sign in
                    <ArrowRight size={14} />
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="relative">
              <div className="join-stage-panel relative min-h-[25rem] overflow-hidden rounded-[2rem] border border-white/10 p-5 sm:min-h-[29rem] sm:p-6">
                <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-15" />
                <div className="join-pulse pointer-events-none absolute left-1/2 top-1/2 h-[17rem] w-[17rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/20 bg-gold/10 blur-[2px] sm:h-[20rem] sm:w-[20rem]" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[13rem] w-[13rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/20 sm:h-[16rem] sm:w-[16rem]" />
                <div className="join-hero-beam pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-full blur-3xl" />

                <div className="join-floating-panel join-float absolute left-4 top-4 hidden max-w-[12rem] px-4 py-3 sm:block">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Founder-led</p>
                  <p className="mt-2 text-sm text-silver">
                    Built with intention for business owners who are serious.
                  </p>
                </div>

                <div className="join-floating-panel join-float-delayed absolute right-4 top-8 hidden max-w-[12rem] px-4 py-3 sm:block">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Private room</p>
                  <p className="mt-2 text-sm text-silver">
                    A calmer environment than public feeds and scattered groups.
                  </p>
                </div>

                <div className="relative flex h-full items-center justify-center">
                  <BrandMark
                    placement="hero"
                    priority
                    shine
                    className="join-float border-gold/55 bg-slate-950/90 shadow-[0_24px_60px_rgba(2,6,23,0.4)]"
                  />
                </div>

                <div className="join-floating-panel absolute inset-x-4 bottom-4 p-5 sm:inset-x-6 sm:bottom-6">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                    The premium front door
                  </p>
                  <h2 className="mt-3 font-display text-2xl text-foreground">
                    Serious business growth needs a better room around it.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm text-muted">
                    This page is built for warm traffic with intent. Emotion first, then proof,
                    then a clear path into the existing join and checkout flow.
                  </p>
                </div>
              </div>

              <div className="join-scroll-cue mt-4 hidden items-center gap-2 text-xs uppercase tracking-[0.08em] text-silver/70 lg:inline-flex">
                <span>Scroll for the rooms, proof, and entry point</span>
                <ArrowRight size={12} className="rotate-90" />
              </div>
            </div>
          </div>
        </section>

        <JoinLandingSection
          id="why-this-exists"
          label="Why This Exists"
          title="Too many business owners are trying to grow in the wrong environment."
          description="They are surrounded by noise, surface-level advice, and people who do not understand what it actually takes to build something real. The Business Circle was built to change that."
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)]">
            <article className="public-panel border-gold/25 bg-gradient-to-br from-gold/8 via-card/78 to-card/72 p-6 sm:p-8">
              <p className="text-base leading-relaxed text-silver">
                This is a private growth environment for business owners who want clearer
                direction, better decisions, stronger conversations, and a place that helps them
                move instead of drift.
              </p>
              <div className="gold-divider my-6" />
              <div className="space-y-4 text-sm text-muted">
                <p>
                  Most people do not need more content. They need a better environment around the
                  business.
                </p>
                <p>
                  The point of The Business Circle is not to create more noise. It is to create the
                  kind of room where decisions improve, conversations sharpen, and momentum becomes
                  easier to hold onto.
                </p>
              </div>
            </article>

            <div className="grid gap-4 sm:grid-cols-2">
              {whyItExistsShifts.map((item) => (
                <article key={item.problem} className="public-panel interactive-card p-5">
                  <p className="text-xs uppercase tracking-[0.08em] text-silver/80">{item.problem}</p>
                  <div className="mt-3 flex items-center gap-2 text-gold">
                    <ArrowRight size={15} />
                    <span className="text-xs uppercase tracking-[0.08em]">{item.solution}</span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </JoinLandingSection>

        <JoinLandingSection
          id="what-you-get"
          label="What You Actually Get"
          title="This is not just access to a website."
          description="It is access to a better environment, better decisions, and a better standard of business conversation."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {valueCards.map((item, index) => (
              <article
                key={item.title}
                className={cn(
                  "public-panel interactive-card p-6",
                  index === 0 ? "border-gold/25 bg-gradient-to-br from-gold/10 via-card/74 to-card/68" : ""
                )}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <item.icon size={19} />
                </span>
                <h3 className="mt-5 font-display text-2xl text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={roomsHref}>
              <Button variant="outline" size="lg">
                See The Rooms
              </Button>
            </Link>
            <Link href={joinEntryHref}>
              <Button size="lg">
                Move Toward Your Entry Point
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </JoinLandingSection>

        <JoinLandingSection
          id="inside-ecosystem"
          label="Inside The Ecosystem"
          title="Everything is built to keep business owners connected, moving, and operating inside the right environment."
          description="This should feel like stepping into an actual business environment, not browsing another website."
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(380px,0.98fr)]">
            <article className="join-cinematic-shell relative overflow-hidden rounded-[2rem] border border-white/10 p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
              <div className="pointer-events-none absolute inset-x-10 top-10 h-40 rounded-full bg-blue-500/10 blur-[90px]" />
              <div className="relative space-y-6">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <BrandMark placement="navbar" shine className="border-gold/50 bg-slate-950/90" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Inside the room</p>
                    <h3 className="font-display text-3xl text-foreground">A real business environment</h3>
                  </div>
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-silver">
                  The ecosystem is designed to keep useful people close, useful conversations
                  active, and the next move easier to see. That is the point of the room.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="join-floating-panel p-5">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Movement</p>
                    <p className="mt-3 text-sm text-muted">
                      Directory, discussions, resources, calls, and events work together instead of
                      living as separate disconnected features.
                    </p>
                  </div>
                  <div className="join-floating-panel p-5">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Proximity</p>
                    <p className="mt-3 text-sm text-muted">
                      Foundation gets you in properly. Inner Circle and Core move you into more
                      focused rooms with stronger context.
                    </p>
                  </div>
                </div>
                <div className="join-floating-panel p-5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Built with intention</p>
                  <p className="mt-3 text-sm text-muted">
                    The room is for people who want better decisions and better conversations, not
                    passive browsing and empty access.
                  </p>
                </div>
              </div>
            </article>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              {ecosystemCards.map((item) => (
                <article key={item.title} className="public-panel interactive-card p-5">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                      <item.icon size={18} />
                    </span>
                    <div>
                      <h3 className="font-display text-2xl text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </JoinLandingSection>

        <JoinLandingSection
          id="rooms-and-tiers"
          label="Choose The Room That Fits Where You Are Now"
          title="Each room is designed to meet a different stage of growth, intent, and proximity."
          description="Foundation should feel like the smart entry point. Inner Circle and Core should feel like clear progression, not inflated upsells."
        >
          <div className="grid gap-5 xl:grid-cols-3">
            {roomCards.map((item) => (
              <article
                key={item.tier}
                className={cn(
                  "public-panel relative flex h-full flex-col overflow-hidden p-6 sm:p-7",
                  item.panelClassName,
                  item.tier === "FOUNDATION" ? "shadow-gold-soft ring-1 ring-gold/25" : ""
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="premium-kicker">{item.kicker}</p>
                  <span className="text-[11px] uppercase tracking-[0.08em] text-silver/75">
                    {item.price}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-[2.2rem] text-foreground">{item.title}</h3>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{item.description}</p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-background/24 px-4 py-4 text-sm text-silver">
                  {item.tier === "FOUNDATION"
                    ? "Best for business owners who want the strongest starting point into the ecosystem."
                    : item.tier === "INNER_CIRCLE"
                      ? "Built for founders who want a more committed room and better business signal."
                      : "Built for those who want the calmest premium room with the closest strategic access."}
                </div>
                <div className="mt-6">
                  <Link href={`${item.href}#join-entry`}>
                    <Button variant={item.buttonVariant} size="lg" className="w-full justify-center">
                      {item.ctaLabel}
                    </Button>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </JoinLandingSection>

        <section className="grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]" id="who-this-is-for">
          <div className="space-y-8">
            <SectionHeading
              label="Who This Is For"
              title="People who want movement, not just motivation."
              description="This is built for business owners, founders, operators, and serious builders who are ready for better conversations and a better room."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {fitCards.map((item) => (
                <article key={item.title} className="public-panel interactive-card p-5">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                      <item.icon size={18} />
                    </span>
                    <div>
                      <h3 className="font-display text-2xl text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <article className="public-panel border-gold/25 bg-gradient-to-br from-background/70 via-card/76 to-gold/10 p-6 sm:p-7">
            <p className="premium-kicker">Not For Everyone</p>
            <h2 className="mt-5 font-display text-3xl text-foreground">That is the point.</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              This is not built for passive browsing, freebie collecting, or people looking for
              another place to sit still.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              It is built for business owners who want the right environment and are ready to use
              it.
            </p>
            <div className="gold-divider my-6" />
            <Link href={foundationEntryHref}>
              <Button size="lg" className="w-full justify-center">
                Start With Foundation
              </Button>
            </Link>
          </article>
        </section>

        <section className="grid scroll-mt-24 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]" id="real-connection">
          <article className="join-cinematic-shell relative overflow-hidden rounded-[2rem] border border-white/10 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
            <div className="relative">
              <p className="premium-kicker">Real Connection, Built In</p>
              <h2 className="mt-5 max-w-3xl font-display text-3xl leading-tight text-foreground sm:text-4xl">
                The Business Circle is not just a place to read and scroll. It is a place to
                connect properly.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-silver">
                From 1 to 1 member calls to premium rooms and deeper conversations, the ecosystem
                is designed to bring real people together inside the platform.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {connectionPoints.map((item) => (
                  <div
                    key={item}
                    className="join-floating-panel flex items-start gap-3 px-4 py-4 text-sm text-muted"
                  >
                    <PhoneCall size={16} className="mt-0.5 shrink-0 text-gold" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <div className="space-y-4">
            <article className="public-panel p-5">
              <p className="premium-kicker">Inside the platform</p>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Conversations can move from profile discovery and discussion into a real call
                without leaving the ecosystem.
              </p>
            </article>
            <article className="public-panel p-5">
              <p className="premium-kicker">For serious use</p>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                The point is not to look busy. It is to make real connection easier when the right
                conversation matters.
              </p>
            </article>
          </div>
        </section>

        <JoinLandingSection
          id="trust-and-structure"
          label="Built On Trust, Structure, And Intention"
          title="A premium room only works when trust, access, and standards are taken seriously."
          description="Founder-led, structured, private, and designed to feel high-trust from first click to member access."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {trustCards.map((item) => (
              <article key={item.title} className="public-panel interactive-card p-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <item.icon size={18} />
                </span>
                <h3 className="mt-4 font-display text-2xl text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <p className="text-sm leading-relaxed text-muted">
              Privacy, billing, and member access are already part of the wider platform. The join
              page now frames that same system in a stronger, more intentional way for high-intent
              traffic.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/privacy-policy">
                <Button variant="outline">Privacy</Button>
              </Link>
              <Link href="/terms-of-service">
                <Button variant="outline">Terms</Button>
              </Link>
            </div>
          </div>
        </JoinLandingSection>

        <section className="scroll-mt-24" id="final-cta">
          <div className="join-cinematic-shell relative overflow-hidden rounded-[2rem] border border-white/10 px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="premium-kicker">Your Next Move</p>
                <h2 className="mt-5 font-display text-3xl leading-tight text-foreground sm:text-4xl">
                  Join the room built for business owners who are ready to move properly.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-silver">
                  If you want clarity, stronger conversations, and a better environment to grow
                  inside, this is where it starts.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={foundationEntryHref}>
                  <Button size="lg" className="min-w-[15rem] justify-center">
                    Start With Foundation
                  </Button>
                </Link>
                <Link href={joinEntryHref}>
                  <Button variant="outline" size="lg" className="min-w-[15rem] justify-center">
                    Enter The Ecosystem
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="join-entry" className="scroll-mt-24">
          <div className="public-panel overflow-hidden rounded-[2.25rem] border-gold/20 bg-gradient-to-br from-background/78 via-card/82 to-background/72 p-5 sm:p-7 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.98fr)_minmax(280px,0.82fr)] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <BrandMark placement="navbar" shine className="border-gold/50 bg-slate-950/90" />
                  <div>
                    <p className="premium-kicker">Your Entry Point</p>
                    <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
                      Create your account and choose your room
                    </h2>
                  </div>
                </div>
                <p className="max-w-3xl text-sm leading-relaxed text-muted">
                  Start with the membership level that fits where your business is now, then move
                  into the ecosystem with a clear path forward. The existing join, invite, auth,
                  and checkout flow is still the engine underneath this page.
                </p>
              </div>

              <div className="join-floating-panel p-5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Current route behaviour</p>
                <p className="mt-3 text-sm text-muted">
                  Tier selection stays synced, invite handling remains intact, auth works the same,
                  and checkout continues from the same production flow.
                </p>
              </div>
            </div>

            <div className="gold-divider my-6" />

            <div className="space-y-4">
              {error === "suspended" ? (
                <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
                  Your account is currently suspended. Contact support to reactivate access.
                </p>
              ) : null}

              {billing === "cancelled" ? (
                <p className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted">
                  Stripe checkout was cancelled. You can restart plan selection at any time.
                </p>
              ) : null}

              {billing === "required" ? (
                <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
                  Your account needs an active membership subscription to unlock member access.
                </p>
              ) : null}

              {inviteCode ? (
                <p className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
                  You&apos;re joining through a member invite. Create your account below to keep the
                  referral attached.
                </p>
              ) : null}

              {isAuthenticated ? (
                <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-4 text-sm text-muted">
                  Signed in as{" "}
                  <span className="font-medium text-foreground">{session?.user?.email}</span>.
                  Current tier:{" "}
                  <span className="font-medium text-foreground">
                    {getMembershipTierLabel(currentTier)}
                  </span>
                  .{" "}
                  {hasActiveSubscription
                    ? "You can upgrade, downgrade, or manage billing directly from this section."
                    : "Complete checkout below to activate your membership and enter the member platform."}
                </div>
              ) : null}
            </div>

            <div className="mt-8">
              <JoinExperience
                foundingOffer={foundingOffer}
                initialSelectedTier={selectedTier}
                from={from}
                inviteCode={inviteCode}
                isAuthenticated={isAuthenticated}
                hasActiveSubscription={hasActiveSubscription}
                joinDecisionSteps={joinDecisionSteps}
                tierOptions={[
                  {
                    value: "FOUNDATION",
                    label: foundingOffer.foundation.available
                      ? `Foundation - GBP ${foundingOffer.foundation.foundingPrice}/month founding*`
                      : "Foundation - GBP 30/month"
                  },
                  {
                    value: "INNER_CIRCLE",
                    label: foundingOffer.innerCircle.available
                      ? `Inner Circle - GBP ${foundingOffer.innerCircle.foundingPrice}/month founding*`
                      : "Inner Circle - GBP 60/month"
                  },
                  {
                    value: "CORE",
                    label: foundingOffer.core.available
                      ? `Core - GBP ${foundingOffer.core.foundingPrice}/month founding*`
                      : "Core - GBP 120/month"
                  }
                ]}
                pricingCards={[
                  {
                    tier: "FOUNDATION",
                    name: MEMBERSHIP_PLANS.FOUNDATION.name,
                    positioningLabel: "Best place to start",
                    monthlyPrice: MEMBERSHIP_PLANS.FOUNDATION.monthlyPrice,
                    description:
                      "Best for business owners who want a clearer base, a stronger room, and the right place to start inside the ecosystem.",
                    features: MEMBERSHIP_PLANS.FOUNDATION.features,
                    foundingOffer: foundingOffer.foundation,
                    joinHref: `${foundationJoinBase}#create-account`,
                    loginHref: foundationLoginHref,
                    buttonVariant: "foundation",
                    authenticatedLabel:
                      currentTier === "FOUNDATION"
                        ? "Current Foundation Plan"
                        : "Start With Foundation",
                    unauthenticatedLabel: "Start With Foundation",
                    isCurrentPlan: currentTier === "FOUNDATION"
                  },
                  {
                    tier: "INNER_CIRCLE",
                    name: MEMBERSHIP_PLANS.INNER_CIRCLE.name,
                    positioningLabel: "Smartest next step",
                    spotlight: {
                      label: "Natural progression",
                      text:
                        "Often the right move when you want stronger signal, more focused discussion, and a better level of business context."
                    },
                    monthlyPrice: MEMBERSHIP_PLANS.INNER_CIRCLE.monthlyPrice,
                    description:
                      "Best for founders who want a more focused environment, stronger intent, and better business conversation around what comes next.",
                    features: MEMBERSHIP_PLANS.INNER_CIRCLE.features,
                    foundingOffer: foundingOffer.innerCircle,
                    featured: true,
                    featuredLabel: "Smartest next step",
                    joinHref: `${innerCircleJoinBase}#create-account`,
                    loginHref: innerCircleLoginHref,
                    buttonVariant: "innerCircle",
                    authenticatedLabel:
                      currentTier === "INNER_CIRCLE"
                        ? "Current Inner Circle Plan"
                        : "Step Into Inner Circle",
                    unauthenticatedLabel: "Step Into Inner Circle",
                    isCurrentPlan: currentTier === "INNER_CIRCLE"
                  },
                  {
                    tier: "CORE",
                    name: MEMBERSHIP_PLANS.CORE.name,
                    positioningLabel: "Highest-value room",
                    monthlyPrice: MEMBERSHIP_PLANS.CORE.monthlyPrice,
                    description:
                      "Best for business owners who want the calmest high-value room, closer founder proximity, and stronger strategic context.",
                    features: MEMBERSHIP_PLANS.CORE.features,
                    foundingOffer: foundingOffer.core,
                    joinHref: `${coreJoinBase}#create-account`,
                    loginHref: coreLoginHref,
                    buttonVariant: "core",
                    authenticatedLabel:
                      currentTier === "CORE" ? "Current Core Plan" : "Choose Core",
                    unauthenticatedLabel: "Choose Core",
                    isCurrentPlan: currentTier === "CORE"
                  }
                ]}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

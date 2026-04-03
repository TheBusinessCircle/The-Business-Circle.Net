import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JoinExperience } from "@/components/auth/join-experience";
import { SectionHeading } from "@/components/public";
import { Button } from "@/components/ui/button";
import {
  getMembershipTierLabel,
  MEMBERSHIP_PLANS
} from "@/config/membership";
import { roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { getFoundingOfferSnapshot } from "@/server/founding";
import { getPublicTrustSnapshot } from "@/server/public-site";

type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Choose the Business Circle membership level that fits your business, create your account, and enter the platform with more structure and clarity.",
  keywords: [
    "join business membership",
    "founder community signup",
    "business circle membership",
    "join founder network"
  ],
  path: "/join"
});

const joinDecisionSteps = [
  {
    step: "01",
    title: "Choose the level that fits now",
    description:
      "Foundation is a serious place to start. Inner Circle is the most balanced step up. Core is the closest strategic layer."
  },
  {
    step: "02",
    title: "Complete setup and enter properly",
    description:
      "Create your account, move through secure checkout, and enter a member dashboard with one clear place to begin."
  },
  {
    step: "03",
    title: "Use the platform with intent",
    description:
      "You can move between tiers later. The goal is to choose the right room for this stage of the business, not the deepest room by default."
  }
] as const;

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
  const trustSignals = [
    {
      label: "Active discussions this week",
      value: trustSnapshot.activeDiscussionCount.toLocaleString("en-GB"),
      description: "Real movement across the Circle without turning the platform into noise."
    },
    {
      label: "Resources recently added",
      value: trustSnapshot.recentResourceCount.toLocaleString("en-GB"),
      description: "Fresh material keeps the member library current and useful."
    },
    {
      label: "Connection wins visible",
      value: trustSnapshot.connectionWinsCount.toLocaleString("en-GB"),
      description: "Useful conversations are turning into visible outcomes inside the network."
    }
  ] as const;

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

  const foundationJoinBase = withQuery("/join", {
    tier: "FOUNDATION",
    from
  });
  const innerCircleJoinBase = withQuery("/join", {
    tier: "INNER_CIRCLE",
    from
  });
  const coreJoinBase = withQuery("/join", {
    tier: "CORE",
    from
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

  return (
    <div className="space-y-10 pb-8">
      <SectionHeading
        label="Join The Circle"
        title={
          isAuthenticated
            ? "Select your plan and continue through secure checkout"
            : "Choose the level that fits your business and step into the right room"
        }
        description={
          isAuthenticated
            ? "You are signed in. Choose the level you want and continue directly into billing."
            : "Create your account, tell us enough about your business to place you properly, and choose the membership level that fits your stage. This is live, and if you want a calmer, stronger environment around the business, you are in the right place."
        }
      />

      <div className="flex flex-wrap gap-2">
        {[
          "Structured founder environment",
          "Limited founding places available",
          "Business-first membership"
        ].map((item) => (
          <span
            key={item}
            className="rounded-full border border-border/80 bg-background/35 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver"
          >
            {item}
          </span>
          ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {trustSignals.map((item) => (
          <article key={item.label} className="public-panel border-silver/18 bg-background/30 p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{item.label}</p>
            <p className="mt-2 font-display text-3xl text-foreground">{item.value}</p>
            <p className="mt-2 text-sm text-muted">{item.description}</p>
          </article>
        ))}
      </div>

      {!isAuthenticated ? (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="public-panel border-gold/25 bg-gradient-to-br from-gold/8 via-card/72 to-card/70 p-6">
            <p className="premium-kicker">Ready To Join</p>
            <h2 className="mt-5 font-display text-3xl text-foreground">
              Create your account and enter a more focused business environment
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              This route is for founders and business owners who are ready to choose a level, complete setup, and move straight into the platform with a clear place to begin.
            </p>
          </article>

          <article className="public-panel p-6">
            <p className="premium-kicker">This Is Live</p>
            <h2 className="mt-5 font-display text-3xl text-foreground">
              Join the first wave of members or start with free insights
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              The platform is now live. If you want more context before choosing a tier, start with the free insights layer and come back when you are ready to join.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/insights">
                <Button variant="outline">Start With Insights</Button>
              </Link>
              <Link href="/membership">
                <Button>View Membership</Button>
              </Link>
            </div>
          </article>
        </div>
      ) : null}

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
          You&apos;re joining through a member invite. Create your account below to keep the referral attached.
        </p>
      ) : null}

      {isAuthenticated ? (
        <div className="public-panel p-5">
          <p className="text-sm text-muted">
            Signed in as <span className="font-medium text-foreground">{session?.user?.email}</span>. Current tier:{" "}
            <span className="font-medium text-foreground">{getMembershipTierLabel(currentTier)}</span>.
          </p>
          <p className="mt-2 text-sm text-muted">
            {hasActiveSubscription
              ? "You can upgrade, downgrade, or manage billing directly from this page."
              : "Complete checkout below to activate your membership and enter the member platform."}
          </p>
          <div className="mt-3">
            <Link href="/dashboard" className="text-sm text-primary hover:underline">
              Return to dashboard
            </Link>
          </div>
        </div>
      ) : null}

      <JoinExperience
        foundingOffer={foundingOffer}
        initialSelectedTier={selectedTier}
        from={from}
        inviteCode={inviteCode}
        isAuthenticated={isAuthenticated}
        hasActiveSubscription={hasActiveSubscription}
        currentTier={currentTier}
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
              currentTier === "FOUNDATION" ? "Current Foundation Plan" : "Start With Foundation",
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
              currentTier === "INNER_CIRCLE" ? "Current Inner Circle Plan" : "Step Into Inner Circle",
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
            authenticatedLabel: currentTier === "CORE" ? "Current Core Plan" : "Choose Core",
            unauthenticatedLabel: "Choose Core",
            isCurrentPlan: currentTier === "CORE"
          }
        ]}
      />
    </div>
  );
}

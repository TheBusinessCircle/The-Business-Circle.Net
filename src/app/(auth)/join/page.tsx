import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  JoinCinematicEntry,
  type JoinPathwayConfig,
  type JoinTierOption
} from "@/components/auth/join-cinematic-entry";
import { getMembershipTierLabel, MEMBERSHIP_PLANS } from "@/config/membership";
import { roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { getFoundingOfferSnapshot } from "@/server/founding";

type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";

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

function resolveTier(value: string | undefined): MembershipTier {
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
    "Step inside The Business Circle, a premium founder-led business ecosystem for serious owners who want a calmer, stronger room to grow inside.",
  keywords: [
    "join business circle",
    "private business network",
    "founder led business ecosystem",
    "business owner membership",
    "inner circle membership"
  ],
  path: "/join"
});

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const session = await auth();
  const params = await searchParams;
  const foundingOffer = await getFoundingOfferSnapshot();
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
  const tierOffers = {
    FOUNDATION: foundingOffer.foundation,
    INNER_CIRCLE: foundingOffer.innerCircle,
    CORE: foundingOffer.core
  } as const;

  const priceLabel = (tier: MembershipTier) => {
    const offer = tierOffers[tier];

    if (offer.available) {
      return `GBP ${offer.foundingPrice}/month founding`;
    }

    return `GBP ${MEMBERSHIP_PLANS[tier].monthlyPrice}/month`;
  };

  const tierOptions: JoinTierOption[] = [
    {
      value: "FOUNDATION",
      label: foundingOffer.foundation.available
        ? `Foundation - GBP ${foundingOffer.foundation.foundingPrice}/month founding`
        : "Foundation - GBP 30/month"
    },
    {
      value: "INNER_CIRCLE",
      label: foundingOffer.innerCircle.available
        ? `Inner Circle - GBP ${foundingOffer.innerCircle.foundingPrice}/month founding`
        : "Inner Circle - GBP 60/month"
    },
    {
      value: "CORE",
      label: foundingOffer.core.available
        ? `Core - GBP ${foundingOffer.core.foundingPrice}/month founding`
        : "Core - GBP 120/month"
    }
  ];

  const pathways: JoinPathwayConfig[] = [
    {
      tier: "FOUNDATION",
      sequence: "01",
      title: "Join the Network",
      tierLabel: "Foundation",
      description:
        "The cleanest way into the room. Built for business owners who want signal, structure, and a serious place to begin.",
      intent: "Begin here",
      priceLabel: priceLabel("FOUNDATION"),
      authenticatedLabel: "Open Foundation checkout",
      unauthenticatedLabel: "Prepare this entry",
      loginHref: withQuery("/login", {
        from: from ?? `${foundationJoinBase}#create-account`
      }),
      isCurrentPlan: currentTier === "FOUNDATION"
    },
    {
      tier: "INNER_CIRCLE",
      sequence: "02",
      title: "Enter the Inner Circle",
      tierLabel: "Inner Circle",
      description:
        "For founders ready for a more focused layer of context, better conversations, and a higher-signal business environment.",
      intent: "Move deeper",
      priceLabel: priceLabel("INNER_CIRCLE"),
      authenticatedLabel: "Open Inner Circle checkout",
      unauthenticatedLabel: "Prepare this entry",
      loginHref: withQuery("/login", {
        from: from ?? `${innerCircleJoinBase}#create-account`
      }),
      isCurrentPlan: currentTier === "INNER_CIRCLE"
    },
    {
      tier: "CORE",
      sequence: "03",
      title: "Move Closer to Core",
      tierLabel: "Core",
      description:
        "The calmest premium route for owners who want closer founder proximity, stronger strategic context, and a more private layer.",
      intent: "Closest access",
      priceLabel: priceLabel("CORE"),
      authenticatedLabel: "Open Core checkout",
      unauthenticatedLabel: "Prepare this entry",
      loginHref: withQuery("/login", {
        from: from ?? `${coreJoinBase}#create-account`
      }),
      isCurrentPlan: currentTier === "CORE"
    }
  ];

  return (
    <JoinCinematicEntry
      pathways={pathways}
      tierOptions={tierOptions}
      initialSelectedTier={selectedTier}
      from={from}
      inviteCode={inviteCode || undefined}
      isAuthenticated={isAuthenticated}
      hasActiveSubscription={hasActiveSubscription}
      accountEmail={session?.user?.email ?? undefined}
      currentTierLabel={getMembershipTierLabel(currentTier)}
      error={error}
      billing={billing}
    />
  );
}

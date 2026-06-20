import type { CircleCardAccountType } from "@prisma/client";

export const CIRCLE_CARD_PLANS = ["FREE", "PRO", "TEAMS"] as const;

export type CircleCardPlanKey = (typeof CIRCLE_CARD_PLANS)[number];

export type CircleCardPlanFeatureStatus =
  | "included"
  | "early-access"
  | "pro-later"
  | "coming-soon";

export type CircleCardPlanFeature = {
  id: string;
  label: string;
  description: string;
  status: CircleCardPlanFeatureStatus;
};

export type CircleCardPlanLimits = {
  circleCards: number;
  activeFeaturedLinks: number | "more" | "team";
  profileLayouts: "classic-business-creator";
  qr: "basic" | "advanced";
  wallet: "basic" | "company";
  analytics: "basic" | "advanced" | "team";
  teamSeats: number | "planned";
};

export type CircleCardPlanDefinition = {
  key: CircleCardPlanKey;
  label: string;
  shortLabel: string;
  description: string;
  goodFor: string;
  limits: CircleCardPlanLimits;
  enabledFeatures: CircleCardPlanFeature[];
  lockedFeatures: CircleCardPlanFeature[];
  notFor?: string[];
  upgradeMessaging: {
    headline: string;
    body: string;
    nextUnlock: string;
    actionLabel: string;
  };
};

export const CIRCLE_CARD_PRO_FEATURE_PREVIEWS: CircleCardPlanFeature[] = [
  {
    id: "advanced-analytics",
    label: "Advanced analytics",
    description: "Deeper visibility trends, source performance and conversion signals.",
    status: "pro-later"
  },
  {
    id: "more-featured-links",
    label: "More featured links",
    description: "More active public action blocks for offers, booking, reviews and content.",
    status: "pro-later"
  },
  {
    id: "file-backed-links",
    label: "File-backed links",
    description: "Downloads and private file links attached to featured actions.",
    status: "early-access"
  },
  {
    id: "custom-profile-colours",
    label: "Custom profile colours",
    description: "Brand-aware public card colour controls.",
    status: "early-access"
  },
  {
    id: "enhanced-layout-sections",
    label: "Creator/business enhanced sections",
    description: "Richer layout sections for creators, founders and business profiles.",
    status: "early-access"
  },
  {
    id: "lead-capture",
    label: "Lead capture from public card",
    description: "Capture and qualify public-card interest directly from the card.",
    status: "pro-later"
  },
  {
    id: "priority-profile-visibility",
    label: "Priority profile visibility",
    description: "More visibility in discovery and relationship surfaces.",
    status: "pro-later"
  },
  {
    id: "verified-founder-business-badge",
    label: "Verified founder/business badge preparation",
    description: "Preparation for verified founder and business trust signals.",
    status: "pro-later"
  }
];

export const CIRCLE_CARD_TEAMS_FEATURE_PREVIEWS: CircleCardPlanFeature[] = [
  {
    id: "company-wallet",
    label: "Company wallet",
    description: "A shared company relationship wallet.",
    status: "coming-soon"
  },
  {
    id: "employee-cards",
    label: "Employee cards",
    description: "Staff cards connected to a company workspace.",
    status: "coming-soon"
  },
  {
    id: "shared-contacts",
    label: "Shared contacts",
    description: "Company-level contacts that can be shared across staff.",
    status: "coming-soon"
  },
  {
    id: "team-analytics",
    label: "Team analytics",
    description: "Shared analytics across company cards and contact activity.",
    status: "coming-soon"
  },
  {
    id: "owner-verification",
    label: "Owner verification",
    description: "Verification flow for company owners and admins.",
    status: "coming-soon"
  },
  {
    id: "staff-verification",
    label: "Staff verification",
    description: "Verified staff identity attached to a company.",
    status: "coming-soon"
  },
  {
    id: "company-profile",
    label: "Company profile",
    description: "A company profile connected to staff cards and shared contacts.",
    status: "coming-soon"
  },
  {
    id: "team-permissions",
    label: "Team permissions",
    description: "Owner and admin controls for company card access.",
    status: "coming-soon"
  }
];

export const CIRCLE_CARD_PLAN_DEFINITIONS: Record<CircleCardPlanKey, CircleCardPlanDefinition> = {
  FREE: {
    key: "FREE",
    label: "Circle Card Free",
    shortLabel: "Free",
    description: "For individuals, simple networking, a basic public card and a basic wallet.",
    goodFor: "Personal networking and simple sharing",
    limits: {
      circleCards: 1,
      activeFeaturedLinks: 5,
      profileLayouts: "classic-business-creator",
      qr: "basic",
      wallet: "basic",
      analytics: "basic",
      teamSeats: 1
    },
    enabledFeatures: [
      {
        id: "one-card",
        label: "1 Circle Card",
        description: "One personal public Circle Card.",
        status: "included"
      },
      {
        id: "basic-profile",
        label: "Basic profile",
        description: "Name, role, business, image, contact details and social links.",
        status: "included"
      },
      {
        id: "layout-choice",
        label: "Classic, Business and Creator layouts",
        description: "All current profile layouts remain available during early access.",
        status: "early-access"
      },
      {
        id: "limited-featured-links",
        label: "Limited featured links",
        description: "Up to 5 active featured links, with paused links saved for later.",
        status: "included"
      },
      {
        id: "basic-qr",
        label: "Basic QR",
        description: "QR sharing for the public card.",
        status: "included"
      },
      {
        id: "basic-wallet",
        label: "Basic wallet",
        description: "Save contacts and keep personal relationship context.",
        status: "included"
      },
      {
        id: "share-card",
        label: "Share card",
        description: "Copy, share and save public card details.",
        status: "included"
      }
    ],
    lockedFeatures: [...CIRCLE_CARD_PRO_FEATURE_PREVIEWS, ...CIRCLE_CARD_TEAMS_FEATURE_PREVIEWS],
    notFor: [
      "Company/team rollout",
      "Staff cards",
      "Shared company wallet",
      "Team analytics",
      "Company verification"
    ],
    upgradeMessaging: {
      headline: "Start free. Upgrade when your card becomes part of your business growth system.",
      body: "Free is personal. Pro adds visibility tools, analytics depth and lead capture. Teams is designed for companies, staff and shared contacts.",
      nextUnlock: "Pro visibility tools / Teams company tools",
      actionLabel: "Coming soon"
    }
  },
  PRO: {
    key: "PRO",
    label: "Circle Card Pro",
    shortLabel: "Pro",
    description:
      "For founders, creators, consultants, tradespeople and personal brands who want better visibility, analytics and lead capture.",
    goodFor: "Founders, creators, consultants, tradespeople and personal brands",
    limits: {
      circleCards: 1,
      activeFeaturedLinks: "more",
      profileLayouts: "classic-business-creator",
      qr: "advanced",
      wallet: "basic",
      analytics: "advanced",
      teamSeats: 1
    },
    enabledFeatures: CIRCLE_CARD_PRO_FEATURE_PREVIEWS,
    lockedFeatures: CIRCLE_CARD_TEAMS_FEATURE_PREVIEWS,
    upgradeMessaging: {
      headline: "Unlock more visibility and lead capture.",
      body: "Pro is the personal business layer for people using Circle Card to drive trust, enquiries and follow-up.",
      nextUnlock: "Teams company tools",
      actionLabel: "Register interest"
    }
  },
  TEAMS: {
    key: "TEAMS",
    label: "Circle Card Teams",
    shortLabel: "Teams",
    description:
      "For companies, organisations, staff cards, shared contacts, team analytics and owner/admin control.",
    goodFor: "Companies, organisations, staff cards and shared contacts",
    limits: {
      circleCards: 1,
      activeFeaturedLinks: "team",
      profileLayouts: "classic-business-creator",
      qr: "advanced",
      wallet: "company",
      analytics: "team",
      teamSeats: "planned"
    },
    enabledFeatures: [...CIRCLE_CARD_PRO_FEATURE_PREVIEWS, ...CIRCLE_CARD_TEAMS_FEATURE_PREVIEWS],
    lockedFeatures: [],
    upgradeMessaging: {
      headline: "Designed for companies, staff and shared contacts.",
      body: "Teams separates company rollout from personal Free cards with company wallet, employee cards and owner/admin control.",
      nextUnlock: "Owner/admin company controls",
      actionLabel: "Register interest"
    }
  }
};

export const CIRCLE_CARD_FREE_CARD_LIMIT = CIRCLE_CARD_PLAN_DEFINITIONS.FREE.limits.circleCards;
export const CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT =
  CIRCLE_CARD_PLAN_DEFINITIONS.FREE.limits.activeFeaturedLinks as number;

export const CIRCLE_CARD_FEATURE_STATUS_LABELS: Record<CircleCardPlanFeatureStatus, string> = {
  included: "Included",
  "early-access": "Available during early access",
  "pro-later": "Coming soon / early access",
  "coming-soon": "Coming soon / early access"
};

export const CIRCLE_CARD_ONBOARDING_PLAN_GUIDANCE: Record<
  CircleCardAccountType,
  {
    suggestedPlan: CircleCardPlanKey;
    suggestedLabel: string;
    description: string;
    guidance: string;
    warning?: string;
  }
> = {
  INDIVIDUAL: {
    suggestedPlan: "FREE",
    suggestedLabel: "Free or Pro Personal",
    description: "Start with Free for personal networking. Pro Personal fits when visibility and lead capture matter.",
    guidance: "Start free. Upgrade when your card becomes part of your business growth system."
  },
  FOUNDER: {
    suggestedPlan: "PRO",
    suggestedLabel: "Pro",
    description: "Pro is the planned path for founders, business owners and personal brands.",
    guidance: "Start free. Upgrade when your card becomes part of your business growth system."
  },
  TEAM: {
    suggestedPlan: "TEAMS",
    suggestedLabel: "Teams",
    description: "Teams is the planned path for companies, organisations and staff card rollout.",
    guidance: "Start free. Upgrade when your card becomes part of your business growth system.",
    warning: "Free is for personal use. Teams is designed for companies, staff and shared contacts."
  }
};

export function getCircleCardPlanDefinition(plan: CircleCardPlanKey) {
  return CIRCLE_CARD_PLAN_DEFINITIONS[plan];
}

export function resolveCircleCardPlanKey(value: string | null | undefined): CircleCardPlanKey {
  const normalized = value?.trim().toUpperCase();

  return CIRCLE_CARD_PLANS.includes(normalized as CircleCardPlanKey)
    ? (normalized as CircleCardPlanKey)
    : "FREE";
}

export function getCircleCardOnboardingPlanGuidance(
  accountType: CircleCardAccountType | "" | null | undefined
) {
  return accountType ? CIRCLE_CARD_ONBOARDING_PLAN_GUIDANCE[accountType] : null;
}

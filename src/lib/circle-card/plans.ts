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

export type CircleCardCapabilityStatus = "included" | "available-early-access" | "planned";

export type CircleCardCapability = {
  id: string;
  label: string;
  description: string;
  status: CircleCardCapabilityStatus;
};

export type CircleCardPlanCapabilityMap = {
  plan: CircleCardPlanKey;
  relationshipPositioning: string;
  audience: string;
  summary: string;
  included: CircleCardCapability[];
  unlocked: CircleCardCapability[];
  next: CircleCardCapability[];
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

export const CIRCLE_CARD_CAPABILITY_STATUS_LABELS: Record<CircleCardCapabilityStatus, string> = {
  included: "Included",
  "available-early-access": "Available during early access",
  planned: "Coming soon / early access"
};

export const CIRCLE_CARD_CAPABILITY_MAP: Record<CircleCardPlanKey, CircleCardPlanCapabilityMap> = {
  FREE: {
    plan: "FREE",
    relationshipPositioning: "Start building relationships.",
    audience: "Personal networking and simple sharing",
    summary:
      "Free keeps Circle Card genuinely useful: a public profile, QR sharing, wallet, contacts, sharing, basic analytics and connection tools.",
    included: [
      {
        id: "one-card",
        label: "1 Circle Card",
        description: "One personal public Circle Card.",
        status: "included"
      },
      {
        id: "five-featured-links",
        label: "5 active featured links",
        description: "Enough public actions for a useful profile, offer, booking link and core proof.",
        status: "included"
      },
      {
        id: "qr-code",
        label: "QR code",
        description: "Share the public card in person, at events and from printed material.",
        status: "included"
      },
      {
        id: "public-profile",
        label: "Public profile",
        description: "A useful identity page with contact details, socials, image, role and business context.",
        status: "included"
      },
      {
        id: "wallet",
        label: "Wallet and saved contacts",
        description: "Save Circle Cards, keep contacts and build a personal relationship memory.",
        status: "included"
      }
    ],
    unlocked: [
      {
        id: "share-card",
        label: "Share card",
        description: "Copy, share and open the public card from the dashboard.",
        status: "included"
      },
      {
        id: "basic-analytics-summary",
        label: "Basic analytics summary",
        description: "View core card views, saves, shares, downloads and link activity.",
        status: "included"
      },
      {
        id: "spin-to-connect",
        label: "Spin to Connect",
        description: "Use the connection flow where it applies to turn a meeting into a saved relationship.",
        status: "included"
      },
      {
        id: "auto-connect",
        label: "Auto connect where applicable",
        description: "Existing connection paths stay active for a smoother relationship flow.",
        status: "included"
      }
    ],
    next: [
      {
        id: "pro-growth-tools",
        label: "Pro growth tools",
        description: "Move to Pro when visibility, lead capture and relationship management matter.",
        status: "planned"
      },
      {
        id: "teams-company-tools",
        label: "Teams company tools",
        description: "Move to Teams when staff cards, shared contacts and company control matter.",
        status: "planned"
      }
    ]
  },
  PRO: {
    plan: "PRO",
    relationshipPositioning: "Grow relationships.",
    audience: "Relationship builders, networkers, creators, sales people and founders",
    summary:
      "Pro is the individual growth layer for visibility, analytics, lead generation and relationship management.",
    included: [],
    unlocked: [
      {
        id: "twenty-five-featured-links",
        label: "25 featured links",
        description: "More public actions for offers, booking, content, proof, downloads and sales paths.",
        status: "planned"
      },
      {
        id: "enhanced-analytics",
        label: "Enhanced analytics",
        description: "Deeper visibility trends, source performance and conversion signals.",
        status: "planned"
      },
      {
        id: "lead-capture-tools",
        label: "Lead capture tools",
        description: "Capture and qualify interest from the public card.",
        status: "planned"
      },
      {
        id: "download-file-links",
        label: "Download/file links",
        description: "Attach files, downloads and private resources to featured actions.",
        status: "available-early-access"
      },
      {
        id: "advanced-profile-sections",
        label: "Advanced profile sections",
        description: "Richer profile areas for creators, founders, sales people and business operators.",
        status: "available-early-access"
      },
      {
        id: "profile-colour-customisation",
        label: "Profile colour customisation",
        description: "Brand-aware public card colour controls.",
        status: "available-early-access"
      },
      {
        id: "opportunity-tracking",
        label: "Opportunity tracking",
        description: "Turn saved relationships into tracked opportunities and follow-up.",
        status: "available-early-access"
      },
      {
        id: "priority-visibility",
        label: "Priority visibility features",
        description: "Prepare stronger visibility inside discovery and relationship surfaces.",
        status: "planned"
      },
      {
        id: "future-verification",
        label: "Future verification eligibility",
        description: "Prepare identity and trust signals for future verification.",
        status: "planned"
      }
    ],
    next: [
      {
        id: "teams-company-system",
        label: "Teams company system",
        description: "Move to Teams when staff, departments and shared company relationships need control.",
        status: "planned"
      }
    ]
  },
  TEAMS: {
    plan: "TEAMS",
    relationshipPositioning: "Scale relationships.",
    audience: "Businesses, departments, sales teams, networking groups and growing companies",
    summary:
      "Teams is the business layer for staff cards, shared relationship visibility, company identity and team control.",
    included: [],
    unlocked: [
      {
        id: "staff-cards",
        label: "Staff cards",
        description: "Cards connected to a company workspace.",
        status: "planned"
      },
      {
        id: "shared-company-wallet",
        label: "Shared company wallet",
        description: "Company-level contacts and relationship context for the team.",
        status: "planned"
      },
      {
        id: "team-analytics",
        label: "Team analytics",
        description: "Visibility across cards, shares, contacts and relationship activity.",
        status: "planned"
      },
      {
        id: "team-management",
        label: "Team management",
        description: "Owner and admin control for company card access.",
        status: "planned"
      },
      {
        id: "company-profile",
        label: "Company profile",
        description: "A company profile connected to staff cards and shared contacts.",
        status: "planned"
      },
      {
        id: "department-structures",
        label: "Department structures",
        description: "Organise cards and contacts around teams, departments or business units.",
        status: "planned"
      },
      {
        id: "company-verification",
        label: "Company verification",
        description: "Prepare company trust signals and owner verification.",
        status: "planned"
      },
      {
        id: "team-reporting",
        label: "Team reporting",
        description: "Reporting for team visibility, contact growth and relationship activity.",
        status: "planned"
      },
      {
        id: "shared-relationship-visibility",
        label: "Shared relationship visibility",
        description: "See company relationship flow without turning personal cards into community membership.",
        status: "planned"
      }
    ],
    next: []
  }
};

export const CIRCLE_CARD_PRO_FEATURE_PREVIEWS: CircleCardPlanFeature[] = [
  {
    id: "twenty-five-featured-links",
    label: "25 featured links",
    description: "More public actions for offers, booking, reviews, downloads and sales paths.",
    status: "pro-later"
  },
  {
    id: "enhanced-analytics",
    label: "Enhanced analytics",
    description: "Deeper visibility trends, source performance and conversion signals.",
    status: "pro-later"
  },
  {
    id: "file-backed-links",
    label: "Download/file links",
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
    label: "Advanced profile sections",
    description: "Richer layout sections for creators, founders and business profiles.",
    status: "early-access"
  },
  {
    id: "opportunity-tracking",
    label: "Opportunity tracking",
    description: "Relationship follow-up and opportunity tracking during early access.",
    status: "early-access"
  },
  {
    id: "lead-capture",
    label: "Lead capture tools",
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
    label: "Shared company wallet",
    description: "A shared company relationship wallet.",
    status: "coming-soon"
  },
  {
    id: "staff-cards",
    label: "Staff cards",
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
    id: "team-management",
    label: "Team management",
    description: "Owner and admin controls for staff cards and company access.",
    status: "coming-soon"
  },
  {
    id: "department-structures",
    label: "Department structures",
    description: "Organise staff cards by team, department or business unit.",
    status: "coming-soon"
  },
  {
    id: "team-reporting",
    label: "Team reporting",
    description: "Company-level reporting for visibility and relationship activity.",
    status: "coming-soon"
  },
  {
    id: "owner-verification",
    label: "Company verification",
    description: "Verification flow for company owners, admins and staff.",
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
    description: "Start building relationships with a useful public card, QR sharing, wallet and basic analytics.",
    goodFor: "Start building relationships",
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
        label: "Public profile",
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
        label: "QR code",
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
      },
      {
        id: "basic-analytics-summary",
        label: "Basic analytics summary",
        description: "A simple summary of views, saves, shares and link activity.",
        status: "included"
      },
      {
        id: "spin-to-connect",
        label: "Spin to Connect",
        description: "A relationship-first connection flow where it applies.",
        status: "included"
      },
      {
        id: "auto-connect",
        label: "Auto connect where applicable",
        description: "Existing connection paths stay active for smoother relationship building.",
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
      headline: "Start building relationships.",
      body: "Free stays useful. Pro grows visibility, analytics, leads and follow-up. Teams scales staff cards, shared contacts and company control.",
      nextUnlock: "Pro visibility tools / Teams company tools",
      actionLabel: "Coming soon"
    }
  },
  PRO: {
    key: "PRO",
    label: "Circle Card Pro",
    shortLabel: "Pro",
    description:
      "Grow relationships with visibility, analytics, lead generation and relationship management tools.",
    goodFor: "Grow relationships",
    limits: {
      circleCards: 1,
      activeFeaturedLinks: 25,
      profileLayouts: "classic-business-creator",
      qr: "advanced",
      wallet: "basic",
      analytics: "advanced",
      teamSeats: 1
    },
    enabledFeatures: CIRCLE_CARD_PRO_FEATURE_PREVIEWS,
    lockedFeatures: CIRCLE_CARD_TEAMS_FEATURE_PREVIEWS,
    upgradeMessaging: {
      headline: "Grow relationships.",
      body: "Pro fits relationship builders, networkers, creators, sales people and founders using Circle Card for visibility, leads and follow-up.",
      nextUnlock: "Teams company tools",
      actionLabel: "Register interest"
    }
  },
  TEAMS: {
    key: "TEAMS",
    label: "Circle Card Teams",
    shortLabel: "Teams",
    description:
      "Scale relationships across businesses, departments, sales teams, networking groups and growing companies.",
    goodFor: "Scale relationships",
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
      headline: "Scale relationships.",
      body: "Teams separates company rollout from personal Free and Pro cards with staff cards, shared wallet, team reporting and owner/admin control.",
      nextUnlock: "Owner/admin company controls",
      actionLabel: "Register interest"
    }
  }
};

export const CIRCLE_CARD_FREE_CARD_LIMIT = CIRCLE_CARD_PLAN_DEFINITIONS.FREE.limits.circleCards;
export const CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT =
  CIRCLE_CARD_PLAN_DEFINITIONS.FREE.limits.activeFeaturedLinks as number;
export const CIRCLE_CARD_PRO_ACTIVE_CUSTOM_LINK_LIMIT =
  CIRCLE_CARD_PLAN_DEFINITIONS.PRO.limits.activeFeaturedLinks as number;

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
    suggestedLabel: "Free",
    description: "Start with Free for a useful personal card, QR sharing, wallet and basic analytics.",
    guidance: "Start building relationships. Upgrade to Pro when visibility, leads and follow-up matter."
  },
  FOUNDER: {
    suggestedPlan: "PRO",
    suggestedLabel: "Pro",
    description: "Pro is the planned path for relationship builders, founders, creators, sales people and personal brands.",
    guidance: "Start with Free. Grow with Pro when the card becomes part of your relationship pipeline."
  },
  TEAM: {
    suggestedPlan: "TEAMS",
    suggestedLabel: "Teams",
    description: "Teams is the planned path for businesses, departments, sales teams and staff card rollout.",
    guidance: "Start with Free for the first card. Scale with Teams when staff, shared contacts and company control matter.",
    warning: "Free is for personal use. Teams is designed for companies, staff cards and shared relationship visibility."
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

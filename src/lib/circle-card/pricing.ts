import type { CircleCardPlanKey } from "@/lib/circle-card/plans";

type CircleCardCurrency = "GBP";

export type CircleCardPricingConfig = {
  key: CircleCardPlanKey;
  label: string;
  positioning: string;
  currency: CircleCardCurrency;
  priceMonthly: number;
  priceAnnual: number | null;
  pricePerExtraSeat: number | null;
  pricePrefix?: string;
  stripe: {
    monthlyPriceEnvVar?: string;
    annualPriceEnvVar?: string;
  };
  billingStatusLabel: string;
};

export type CircleCardFeatureLockItem = {
  id: string;
  label: string;
  status: "available" | "early-access" | "future";
  enforcement: "active" | "messaging-only";
};

export type CircleCardFeatureLockGroup = {
  plan: CircleCardPlanKey;
  positioning: string;
  features: CircleCardFeatureLockItem[];
  enforcementNote: string;
};

export const CIRCLE_CARD_BILLING_FLAG_ENV = "CIRCLE_CARD_BILLING_ENABLED";

export const CIRCLE_CARD_PRICING_CONFIG: Record<CircleCardPlanKey, CircleCardPricingConfig> = {
  FREE: {
    key: "FREE",
    label: "Free",
    positioning: "personal/basic use",
    currency: "GBP",
    priceMonthly: 0,
    priceAnnual: 0,
    pricePerExtraSeat: null,
    stripe: {},
    billingStatusLabel: "Available"
  },
  PRO: {
    key: "PRO",
    label: "Pro",
    positioning:
      "founders, creators, consultants, tradespeople, service providers and personal brands",
    currency: "GBP",
    priceMonthly: 9.99,
    priceAnnual: null,
    pricePerExtraSeat: null,
    stripe: {
      monthlyPriceEnvVar: "STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID",
      annualPriceEnvVar: "STRIPE_CIRCLE_CARD_PRO_ANNUAL_PRICE_ID"
    },
    billingStatusLabel: "Early access / register interest"
  },
  TEAMS: {
    key: "TEAMS",
    label: "Teams",
    positioning: "companies, staff, shared contacts and team control",
    currency: "GBP",
    priceMonthly: 24.99,
    priceAnnual: null,
    pricePerExtraSeat: null,
    pricePrefix: "from",
    stripe: {
      monthlyPriceEnvVar: "STRIPE_CIRCLE_CARD_TEAMS_MONTHLY_PRICE_ID",
      annualPriceEnvVar: "STRIPE_CIRCLE_CARD_TEAMS_ANNUAL_PRICE_ID"
    },
    billingStatusLabel: "Early access / register interest"
  }
};

export const CIRCLE_CARD_FEATURE_LOCK_MAP: Record<CircleCardPlanKey, CircleCardFeatureLockGroup> = {
  FREE: {
    plan: "FREE",
    positioning: "personal/basic Circle Card use",
    features: [
      { id: "one-card", label: "1 card", status: "available", enforcement: "active" },
      {
        id: "basic-public-profile",
        label: "Basic public profile",
        status: "available",
        enforcement: "messaging-only"
      },
      { id: "qr", label: "QR", status: "available", enforcement: "messaging-only" },
      { id: "basic-wallet", label: "Basic wallet", status: "available", enforcement: "messaging-only" },
      { id: "save-contacts", label: "Save contacts", status: "available", enforcement: "messaging-only" },
      {
        id: "five-active-featured-links",
        label: "Up to 5 active featured links",
        status: "available",
        enforcement: "active"
      },
      {
        id: "basic-layouts-early-access",
        label: "Basic layouts during early access",
        status: "early-access",
        enforcement: "messaging-only"
      }
    ],
    enforcementNote:
      "Free locks are partly enforced today. Other items remain messaging-only to avoid disrupting existing early-access users."
  },
  PRO: {
    plan: "PRO",
    positioning: "individual visibility, creator/founder/business growth tools",
    features: [
      { id: "more-featured-links", label: "More featured links", status: "future", enforcement: "messaging-only" },
      { id: "advanced-analytics", label: "Advanced analytics", status: "future", enforcement: "messaging-only" },
      { id: "file-backed-links", label: "File-backed links", status: "early-access", enforcement: "messaging-only" },
      { id: "custom-colours", label: "Custom colours", status: "early-access", enforcement: "messaging-only" },
      {
        id: "creator-business-enhanced-sections",
        label: "Creator/business enhanced sections",
        status: "early-access",
        enforcement: "messaging-only"
      },
      { id: "lead-capture", label: "Lead capture", status: "future", enforcement: "messaging-only" },
      {
        id: "priority-visibility-preparation",
        label: "Priority visibility preparation",
        status: "future",
        enforcement: "messaging-only"
      },
      {
        id: "verification-preparation",
        label: "Verification preparation",
        status: "future",
        enforcement: "messaging-only"
      }
    ],
    enforcementNote:
      "Pro locks are prepared for future billing, but existing early-access features stay available until billing is activated deliberately."
  },
  TEAMS: {
    plan: "TEAMS",
    positioning: "companies, staff cards, shared contacts and team control",
    features: [
      { id: "team-owner-dashboard", label: "Team owner dashboard", status: "future", enforcement: "messaging-only" },
      { id: "staff-cards", label: "Staff cards", status: "future", enforcement: "messaging-only" },
      {
        id: "shared-company-wallet",
        label: "Shared company wallet",
        status: "future",
        enforcement: "messaging-only"
      },
      { id: "team-analytics", label: "Team analytics", status: "future", enforcement: "messaging-only" },
      { id: "company-profile", label: "Company profile", status: "future", enforcement: "messaging-only" },
      {
        id: "owner-staff-verification",
        label: "Owner/staff verification",
        status: "future",
        enforcement: "messaging-only"
      },
      { id: "team-permissions", label: "Team permissions", status: "future", enforcement: "messaging-only" }
    ],
    enforcementNote:
      "Teams locks are readiness-only. No company/staff restrictions are enforced during this billing prep phase."
  }
};

export const CIRCLE_CARD_FUTURE_UPGRADE_NOTES = [
  "Free -> Pro: use when an individual needs stronger visibility, analytics, lead capture and trust signals.",
  "Free/Pro -> Teams: use when a company needs staff cards, shared contacts, company identity and owner/admin control.",
  "BCN member included benefits: keep separate from Circle Card billing; decide later whether BCN tiers include selected Circle Card benefits.",
  "Founder 50 early access: reserve compatibility for founder launch privileges without changing current BCN membership entitlements.",
  "Referral commission compatibility: keep future Circle Card billing compatible with referral attribution before implementing commissions."
] as const;

function parseBoolean(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}

function configuredEnvValue(name: string | undefined) {
  return name ? Boolean(process.env[name]?.trim()) : false;
}

export function isCircleCardBillingEnabled() {
  return parseBoolean(process.env[CIRCLE_CARD_BILLING_FLAG_ENV]);
}

export function getCircleCardBillingReadiness() {
  const pro = CIRCLE_CARD_PRICING_CONFIG.PRO;
  const teams = CIRCLE_CARD_PRICING_CONFIG.TEAMS;
  const proMonthlyConfigured = configuredEnvValue(pro.stripe.monthlyPriceEnvVar);
  const proAnnualConfigured = configuredEnvValue(pro.stripe.annualPriceEnvVar);
  const teamsMonthlyConfigured = configuredEnvValue(teams.stripe.monthlyPriceEnvVar);
  const teamsAnnualConfigured = configuredEnvValue(teams.stripe.annualPriceEnvVar);

  return {
    billingEnabled: isCircleCardBillingEnabled(),
    proPriceConfigured: proMonthlyConfigured || proAnnualConfigured,
    teamsPriceConfigured: teamsMonthlyConfigured || teamsAnnualConfigured,
    pro: {
      monthlyPriceConfigured: proMonthlyConfigured,
      annualPriceConfigured: proAnnualConfigured
    },
    teams: {
      monthlyPriceConfigured: teamsMonthlyConfigured,
      annualPriceConfigured: teamsAnnualConfigured
    }
  };
}

export function formatCircleCardPrice(plan: CircleCardPlanKey) {
  const config = CIRCLE_CARD_PRICING_CONFIG[plan];
  const prefix = config.pricePrefix ? `${config.pricePrefix} ` : "";

  if (config.priceMonthly === 0) {
    return "£0";
  }

  return `${prefix}£${config.priceMonthly.toFixed(2)}/month`;
}

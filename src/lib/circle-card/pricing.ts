import type { CircleCardPlanKey } from "@/lib/circle-card/plans";

type CircleCardCurrency = "GBP";

export type CircleCardPricingConfig = {
  key: CircleCardPlanKey;
  label: string;
  positioning: string;
  currency: CircleCardCurrency;
  priceMonthly: number;
  priceAnnual: number | null;
  annualDiscountPercent?: number;
  pricePerExtraSeat: number | null;
  pricePrefix?: string;
  bcnMemberDiscount?: {
    eligible: boolean;
    affectsBcnSubscription: false;
    note: string;
  };
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
export const CIRCLE_CARD_TEAMS_ANNUAL_DISCOUNT_PERCENT = 20;

function discountedAnnualPrice(monthlyPrice: number, discountPercent: number) {
  const annualTotal = monthlyPrice * 12;
  const discountedTotal = annualTotal * ((100 - discountPercent) / 100);

  return Math.round(discountedTotal * 100) / 100;
}

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
    priceMonthly: 79.99,
    priceAnnual: discountedAnnualPrice(79.99, CIRCLE_CARD_TEAMS_ANNUAL_DISCOUNT_PERCENT),
    annualDiscountPercent: CIRCLE_CARD_TEAMS_ANNUAL_DISCOUNT_PERCENT,
    pricePerExtraSeat: null,
    pricePrefix: "from",
    bcnMemberDiscount: {
      eligible: true,
      affectsBcnSubscription: false,
      note:
        "Future BCN member Teams discounts must apply to Circle Card Teams billing only, without changing BCN subscription logic."
    },
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
      { id: "share-card", label: "Share card", status: "available", enforcement: "messaging-only" },
      {
        id: "basic-analytics-summary",
        label: "Basic analytics summary",
        status: "available",
        enforcement: "messaging-only"
      },
      {
        id: "spin-to-connect",
        label: "Spin to Connect",
        status: "available",
        enforcement: "messaging-only"
      },
      {
        id: "auto-connect",
        label: "Auto connect where applicable",
        status: "available",
        enforcement: "messaging-only"
      },
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
      { id: "twenty-five-featured-links", label: "25 featured links", status: "future", enforcement: "messaging-only" },
      { id: "enhanced-analytics", label: "Enhanced analytics", status: "future", enforcement: "messaging-only" },
      { id: "download-file-links", label: "Download/file links", status: "early-access", enforcement: "messaging-only" },
      { id: "custom-colours", label: "Custom colours", status: "early-access", enforcement: "messaging-only" },
      {
        id: "advanced-profile-sections",
        label: "Advanced profile sections",
        status: "early-access",
        enforcement: "messaging-only"
      },
      { id: "opportunity-tracking", label: "Opportunity tracking", status: "early-access", enforcement: "messaging-only" },
      { id: "lead-capture-tools", label: "Lead capture tools", status: "future", enforcement: "messaging-only" },
      {
        id: "priority-visibility-features",
        label: "Priority visibility features",
        status: "future",
        enforcement: "messaging-only"
      },
      {
        id: "future-verification-eligibility",
        label: "Future verification eligibility",
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
      { id: "staff-cards", label: "Staff cards", status: "future", enforcement: "messaging-only" },
      {
        id: "shared-company-wallet",
        label: "Shared company wallet",
        status: "future",
        enforcement: "messaging-only"
      },
      { id: "team-analytics", label: "Team analytics", status: "future", enforcement: "messaging-only" },
      { id: "team-management", label: "Team management", status: "future", enforcement: "messaging-only" },
      { id: "company-profile", label: "Company profile", status: "future", enforcement: "messaging-only" },
      { id: "department-structures", label: "Department structures", status: "future", enforcement: "messaging-only" },
      {
        id: "company-verification",
        label: "Company verification",
        status: "future",
        enforcement: "messaging-only"
      },
      { id: "team-reporting", label: "Team reporting", status: "future", enforcement: "messaging-only" },
      {
        id: "shared-relationship-visibility",
        label: "Shared relationship visibility",
        status: "future",
        enforcement: "messaging-only"
      }
    ],
    enforcementNote:
      "Teams locks are readiness-only. No company/staff restrictions are enforced during this billing prep phase."
  }
};

export const CIRCLE_CARD_FUTURE_UPGRADE_NOTES = [
  "Free -> Pro: use when an individual needs stronger visibility, analytics, lead capture and trust signals.",
  "Free/Pro -> Teams: use when a company needs staff cards, shared contacts, company identity and owner/admin control.",
  "BCN member included benefits: active BCN membership grants Circle Card Pro as BCN_INCLUDED_PRO with no separate Circle Card subscription.",
  "BCN member Teams discounts: apply any future discount to Circle Card Teams billing/reporting only, never by changing BCN subscription logic.",
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

export function formatCircleCardAnnualPrice(plan: CircleCardPlanKey) {
  const config = CIRCLE_CARD_PRICING_CONFIG[plan];

  if (config.priceAnnual === null) {
    return null;
  }

  if (config.priceAnnual === 0) {
    return "£0/year";
  }

  return `£${config.priceAnnual.toFixed(2)}/year`;
}

export function formatCircleCardAnnualDiscount(plan: CircleCardPlanKey) {
  const config = CIRCLE_CARD_PRICING_CONFIG[plan];

  return config.annualDiscountPercent ? `${config.annualDiscountPercent}% annual discount` : null;
}

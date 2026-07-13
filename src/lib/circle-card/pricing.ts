import type { CircleCardPlanKey } from "@/lib/circle-card/plans";

type CircleCardCurrency = "GBP";

export type CircleCardPricingConfig = {
  key: CircleCardPlanKey;
  label: string;
  positioning: string;
  launchAvailable: boolean;
  currency: CircleCardCurrency;
  priceMonthly: number | null;
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
    productEnvVar?: string;
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
    launchAvailable: true,
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
    launchAvailable: true,
    currency: "GBP",
    priceMonthly: 9.99,
    priceAnnual: null,
    pricePerExtraSeat: null,
    stripe: {
      productEnvVar: "STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID",
      monthlyPriceEnvVar: "STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID"
    },
    billingStatusLabel: "£9.99 monthly launch"
  },
  TEAMS: {
    key: "TEAMS",
    label: "Teams",
    positioning: "companies, staff, shared contacts and team control",
    launchAvailable: false,
    currency: "GBP",
    priceMonthly: null,
    priceAnnual: null,
    pricePerExtraSeat: null,
    stripe: {},
    billingStatusLabel: "Deferred after the Pro launch"
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
      { id: "base-layouts", label: "Personal, Business and Creator base layouts", status: "available", enforcement: "active" }
    ],
    enforcementNote:
      "Free remains fully usable, with card and active-link limits enforced by authoritative server policy."
  },
  PRO: {
    plan: "PRO",
    positioning: "individual visibility, creator/founder/business growth tools",
    features: [
      { id: "two-cards", label: "2 Circle Cards", status: "available", enforcement: "active" },
      { id: "twenty-five-featured-links", label: "25 active links", status: "available", enforcement: "active" },
      { id: "circle-studio", label: "Circle Studio public activation", status: "available", enforcement: "active" },
      { id: "business-builder", label: "Business Card Builder", status: "available", enforcement: "active" },
      { id: "creator-media-kit", label: "Creator Media Kit", status: "available", enforcement: "active" },
      { id: "audience-snapshot", label: "Audience Snapshot", status: "available", enforcement: "active" },
      { id: "creator-presentation", label: "Expanded creator presentation", status: "available", enforcement: "active" },
      { id: "preservation", label: "Downgrade preservation and automatic restoration", status: "available", enforcement: "active" }
    ],
    enforcementNote:
      "Pro capabilities are enforced from authoritative server entitlement; billing activation remains controlled by the environment flag."
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

export type CircleCardBillingAccessMode = "operator" | "public";

export function getCircleCardBillingAccessMode(): CircleCardBillingAccessMode | null {
  const mode = process.env.CIRCLE_CARD_BILLING_ACCESS_MODE?.trim().toLowerCase();
  return mode === "operator" || mode === "public" ? mode : null;
}

export function getCircleCardBillingOperatorUserIds() {
  return new Set(
    (process.env.CIRCLE_CARD_BILLING_OPERATOR_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function canUserStartCircleCardCheckout(userId: string) {
  const mode = getCircleCardBillingAccessMode();
  return mode === "public" || (mode === "operator" && getCircleCardBillingOperatorUserIds().has(userId));
}

export function isCircleCardBillingEnabled() {
  return parseBoolean(process.env[CIRCLE_CARD_BILLING_FLAG_ENV]);
}

export function getCircleCardBillingReadiness() {
  const pro = CIRCLE_CARD_PRICING_CONFIG.PRO;
  const proProductConfigured = configuredEnvValue(pro.stripe.productEnvVar);
  const proMonthlyConfigured = configuredEnvValue(pro.stripe.monthlyPriceEnvVar);
  const portalConfigured = configuredEnvValue("CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID");
  const accessMode = getCircleCardBillingAccessMode();
  const operatorUserConfigured =
    accessMode !== "operator" || getCircleCardBillingOperatorUserIds().size > 0;

  return {
    billingEnabled: isCircleCardBillingEnabled(),
    proProductConfigured,
    proPriceConfigured: proMonthlyConfigured,
    proPortalConfigured: portalConfigured,
    billingAccessMode: accessMode,
    proLaunchConfigured:
      proProductConfigured && proMonthlyConfigured && portalConfigured && Boolean(accessMode) && operatorUserConfigured,
    teamsPriceConfigured: false,
    pro: {
      productConfigured: proProductConfigured,
      monthlyPriceConfigured: proMonthlyConfigured,
      portalConfigured,
      annualPriceConfigured: false
    },
    teams: {
      monthlyPriceConfigured: false,
      annualPriceConfigured: false
    }
  };
}

export function getCircleCardProBillingConfigurationErrorMessage() {
  const readiness = getCircleCardBillingReadiness();

  if (!readiness.billingEnabled) {
    return "Circle Card billing is disabled.";
  }

  if (!readiness.pro.productConfigured) {
    return "STRIPE_CIRCLE_CARD_PRO_PRODUCT_ID is required when Circle Card billing is enabled.";
  }

  if (!readiness.pro.monthlyPriceConfigured) {
    return "STRIPE_CIRCLE_CARD_PRO_MONTHLY_PRICE_ID is required when Circle Card billing is enabled.";
  }

  if (!readiness.pro.portalConfigured) {
    return "CIRCLE_CARD_BILLING_PORTAL_CONFIGURATION_ID is required when Circle Card billing is enabled.";
  }

  if (!readiness.billingAccessMode) {
    return "CIRCLE_CARD_BILLING_ACCESS_MODE must be explicitly set to operator or public when billing is enabled.";
  }

  if (
    readiness.billingAccessMode === "operator" &&
    getCircleCardBillingOperatorUserIds().size === 0
  ) {
    return "CIRCLE_CARD_BILLING_OPERATOR_USER_IDS is required in controlled operator mode.";
  }

  return null;
}

export function formatCircleCardPrice(plan: CircleCardPlanKey) {
  const config = CIRCLE_CARD_PRICING_CONFIG[plan];
  const prefix = config.pricePrefix ? `${config.pricePrefix} ` : "";

  if (!config.launchAvailable) {
    return "Pricing deferred";
  }

  if (config.priceMonthly === null) {
    return "Pricing unavailable";
  }

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

import type { MembershipTier } from "@prisma/client";
import type { MembershipPlan, MembershipPlanMap } from "@/types";

export type MembershipBillingVariant = "standard" | "founding";
export type MembershipBillingInterval = "monthly" | "annual";

export type MembershipPlanVariant = MembershipPlan & {
  billingVariant: MembershipBillingVariant;
};

export type MembershipBillingPlan = MembershipPlanVariant & {
  billingInterval: MembershipBillingInterval;
  checkoutPrice: number;
  annualPrice: number;
  monthlyEquivalentPrice: number;
};

type MembershipVariantMap = Record<
  MembershipTier,
  Record<MembershipBillingVariant, MembershipPlanVariant>
>;

type MembershipStripePriceMap = Record<
  MembershipTier,
  Record<MembershipBillingVariant, Record<MembershipBillingInterval, string>>
>;

const TIER_RANK: Record<MembershipTier, number> = {
  FOUNDATION: 1,
  INNER_CIRCLE: 2,
  CORE: 3
};

export const MEMBERSHIP_ANNUAL_SAVINGS_PERCENT = 20;

const STANDARD_MONTHLY_PRICES: Record<MembershipTier, number> = {
  FOUNDATION: 30,
  INNER_CIRCLE: 79,
  CORE: 149
};

const DEFAULT_FOUNDING_MONTHLY_PRICES: Record<MembershipTier, number> = {
  FOUNDATION: 15,
  INNER_CIRCLE: 39,
  CORE: 74
};

export const MEMBERSHIP_TIER_ORDER = [
  "FOUNDATION",
  "INNER_CIRCLE",
  "CORE"
] as const satisfies readonly MembershipTier[];

export const MEMBERSHIP_TIER_LABELS: Record<MembershipTier, string> = {
  FOUNDATION: "Foundation",
  INNER_CIRCLE: "Inner Circle",
  CORE: "Core"
};

const FOUNDATION_PLAN_FEATURES = [
  "Core community access",
  "Member-only business resources",
  "Directory and event access",
  "Structured discussion feeds",
  "Thoughtful collaboration opportunities"
];

const INNER_CIRCLE_PLAN_FEATURES = [
  "Everything in Foundation",
  "More focused discussion spaces",
  "Stronger intent and better context",
  "Higher-value business conversations",
  "More curated resources and access"
];

const CORE_PLAN_FEATURES = [
  "Everything in Inner Circle",
  "Private Core discussion space",
  "Closer founder proximity",
  "Higher-level strategic context",
  "Stronger bridge into premium ecosystem work"
];

function resolveAnnualPrice(monthlyPrice: number): number {
  return Math.floor(monthlyPrice * (100 - MEMBERSHIP_ANNUAL_SAVINGS_PERCENT) / 100) * 12;
}

function resolveStripePriceIdMap(): MembershipStripePriceMap {
  return {
    FOUNDATION: {
      standard: {
        monthly:
          process.env.STRIPE_FOUNDATION_MONTHLY_PRICE_ID ??
          process.env.STRIPE_FOUNDATION_PRICE_ID ??
          process.env.STRIPE_STANDARD_PRICE_ID ??
          "",
        annual: process.env.STRIPE_FOUNDATION_ANNUAL_PRICE_ID ?? ""
      },
      founding: {
        monthly:
          process.env.STRIPE_FOUNDING_FOUNDATION_MONTHLY_PRICE_ID ??
          process.env.STRIPE_FOUNDING_FOUNDATION_PRICE_ID ??
          process.env.STRIPE_FOUNDING_STANDARD_PRICE_ID ??
          "",
        annual: process.env.STRIPE_FOUNDING_FOUNDATION_ANNUAL_PRICE_ID ?? ""
      }
    },
    INNER_CIRCLE: {
      standard: {
        monthly:
          process.env.STRIPE_INNER_CIRCLE_MONTHLY_PRICE_ID ??
          process.env.STRIPE_INNER_CIRCLE_PRICE_ID ??
          "",
        annual: process.env.STRIPE_INNER_CIRCLE_ANNUAL_PRICE_ID ?? ""
      },
      founding: {
        monthly:
          process.env.STRIPE_FOUNDING_INNER_CIRCLE_MONTHLY_PRICE_ID ??
          process.env.STRIPE_FOUNDING_INNER_CIRCLE_PRICE_ID ??
          "",
        annual: process.env.STRIPE_FOUNDING_INNER_CIRCLE_ANNUAL_PRICE_ID ?? ""
      }
    },
    CORE: {
      standard: {
        monthly:
          process.env.STRIPE_CORE_MONTHLY_PRICE_ID ??
          process.env.STRIPE_CORE_PRICE_ID ??
          "",
        annual: process.env.STRIPE_CORE_ANNUAL_PRICE_ID ?? ""
      },
      founding: {
        monthly:
          process.env.STRIPE_FOUNDING_CORE_MONTHLY_PRICE_ID ??
          process.env.STRIPE_FOUNDING_CORE_PRICE_ID ??
          "",
        annual: process.env.STRIPE_FOUNDING_CORE_ANNUAL_PRICE_ID ?? ""
      }
    }
  };
}

export const MEMBERSHIP_STRIPE_PRICE_IDS = resolveStripePriceIdMap();

export const MEMBERSHIP_PLAN_VARIANTS: MembershipVariantMap = {
  FOUNDATION: {
    standard: {
      tier: "FOUNDATION",
      billingVariant: "standard",
      name: "Foundation",
      slug: "foundation",
      monthlyPrice: STANDARD_MONTHLY_PRICES.FOUNDATION,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.FOUNDATION.standard.monthly,
      features: FOUNDATION_PLAN_FEATURES
    },
    founding: {
      tier: "FOUNDATION",
      billingVariant: "founding",
      name: "Foundation",
      slug: "foundation",
      monthlyPrice: DEFAULT_FOUNDING_MONTHLY_PRICES.FOUNDATION,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.FOUNDATION.founding.monthly,
      features: FOUNDATION_PLAN_FEATURES
    }
  },
  INNER_CIRCLE: {
    standard: {
      tier: "INNER_CIRCLE",
      billingVariant: "standard",
      name: "Inner Circle",
      slug: "inner-circle",
      monthlyPrice: STANDARD_MONTHLY_PRICES.INNER_CIRCLE,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.INNER_CIRCLE.standard.monthly,
      features: INNER_CIRCLE_PLAN_FEATURES
    },
    founding: {
      tier: "INNER_CIRCLE",
      billingVariant: "founding",
      name: "Inner Circle",
      slug: "inner-circle",
      monthlyPrice: DEFAULT_FOUNDING_MONTHLY_PRICES.INNER_CIRCLE,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.INNER_CIRCLE.founding.monthly,
      features: INNER_CIRCLE_PLAN_FEATURES
    }
  },
  CORE: {
    standard: {
      tier: "CORE",
      billingVariant: "standard",
      name: "Core",
      slug: "core",
      monthlyPrice: STANDARD_MONTHLY_PRICES.CORE,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.CORE.standard.monthly,
      features: CORE_PLAN_FEATURES
    },
    founding: {
      tier: "CORE",
      billingVariant: "founding",
      name: "Core",
      slug: "core",
      monthlyPrice: DEFAULT_FOUNDING_MONTHLY_PRICES.CORE,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.CORE.founding.monthly,
      features: CORE_PLAN_FEATURES
    }
  }
};

export const MEMBERSHIP_PLANS: MembershipPlanMap = {
  FOUNDATION: MEMBERSHIP_PLAN_VARIANTS.FOUNDATION.standard,
  INNER_CIRCLE: MEMBERSHIP_PLAN_VARIANTS.INNER_CIRCLE.standard,
  CORE: MEMBERSHIP_PLAN_VARIANTS.CORE.standard
};

export function getMembershipPlan(tier: MembershipTier): MembershipPlanVariant {
  return MEMBERSHIP_PLAN_VARIANTS[tier].standard;
}

export function getMembershipPlanVariant(
  tier: MembershipTier,
  variant: MembershipBillingVariant,
  overrides?: Partial<Pick<MembershipPlanVariant, "monthlyPrice">>
): MembershipPlanVariant {
  const plan = MEMBERSHIP_PLAN_VARIANTS[tier][variant];

  if (!overrides) {
    return plan;
  }

  return {
    ...plan,
    ...overrides
  };
}

export function getMembershipBillingPlan(
  tier: MembershipTier,
  billingVariant: MembershipBillingVariant,
  billingInterval: MembershipBillingInterval,
  overrides?: Partial<
    Pick<
      MembershipBillingPlan,
      "monthlyPrice" | "annualPrice" | "checkoutPrice" | "monthlyEquivalentPrice"
    >
  >
): MembershipBillingPlan {
  const plan = MEMBERSHIP_PLAN_VARIANTS[tier][billingVariant];
  const monthlyPrice = Math.max(0, Math.round(overrides?.monthlyPrice ?? plan.monthlyPrice));
  const annualPrice = Math.max(
    0,
    Math.round(overrides?.annualPrice ?? resolveAnnualPrice(monthlyPrice))
  );
  const checkoutPrice = Math.max(
    0,
    Math.round(overrides?.checkoutPrice ?? (billingInterval === "annual" ? annualPrice : monthlyPrice))
  );
  const monthlyEquivalentPrice = Math.max(
    0,
    Math.round(
      overrides?.monthlyEquivalentPrice ??
        (billingInterval === "annual" ? annualPrice / 12 : monthlyPrice)
    )
  );

  return {
    ...plan,
    stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS[tier][billingVariant][billingInterval],
    billingInterval,
    monthlyPrice,
    annualPrice,
    checkoutPrice,
    monthlyEquivalentPrice
  };
}

export function getMembershipTierPricing(tier: MembershipTier) {
  const standardMonthlyPrice = STANDARD_MONTHLY_PRICES[tier];
  const foundingMonthlyPrice = DEFAULT_FOUNDING_MONTHLY_PRICES[tier];

  return {
    standardMonthlyPrice,
    standardAnnualPrice: resolveAnnualPrice(standardMonthlyPrice),
    foundingMonthlyPrice,
    foundingAnnualPrice: resolveAnnualPrice(foundingMonthlyPrice)
  };
}

export function getMembershipVariantPrices(tier: MembershipTier) {
  return MEMBERSHIP_PLAN_VARIANTS[tier];
}

export function resolveMembershipBillingInterval(
  value: string | null | undefined
): MembershipBillingInterval {
  return value === "annual" ? "annual" : "monthly";
}

export function getMembershipTierLabel(tier: MembershipTier): string {
  return MEMBERSHIP_TIER_LABELS[tier];
}

export function getMembershipTierRank(tier: MembershipTier): number {
  return TIER_RANK[tier];
}

export function isMembershipVariantStripeConfigured(
  tier: MembershipTier,
  variant: MembershipBillingVariant,
  interval: MembershipBillingInterval = "monthly"
): boolean {
  return Boolean(MEMBERSHIP_STRIPE_PRICE_IDS[tier][variant][interval]);
}

export function getMembershipStripePriceId(
  tier: MembershipTier,
  billingVariant: MembershipBillingVariant,
  billingInterval: MembershipBillingInterval
): string {
  return MEMBERSHIP_STRIPE_PRICE_IDS[tier][billingVariant][billingInterval];
}

export function resolveTierFromPriceId(priceId: string | null | undefined): MembershipTier {
  if (!priceId) {
    return "FOUNDATION";
  }

  for (const tier of MEMBERSHIP_TIER_ORDER) {
    const variants = MEMBERSHIP_STRIPE_PRICE_IDS[tier];

    for (const variant of Object.keys(variants) as MembershipBillingVariant[]) {
      for (const interval of Object.keys(
        variants[variant]
      ) as MembershipBillingInterval[]) {
        if (priceId === variants[variant][interval]) {
          return tier;
        }
      }
    }
  }

  return "FOUNDATION";
}

export function resolveBillingVariantFromPriceId(
  priceId: string | null | undefined
): MembershipBillingVariant {
  if (!priceId) {
    return "standard";
  }

  for (const tier of MEMBERSHIP_TIER_ORDER) {
    const variants = MEMBERSHIP_STRIPE_PRICE_IDS[tier];

    for (const variant of Object.keys(variants) as MembershipBillingVariant[]) {
      for (const interval of Object.keys(
        variants[variant]
      ) as MembershipBillingInterval[]) {
        if (priceId === variants[variant][interval]) {
          return variant;
        }
      }
    }
  }

  return "standard";
}

export function resolveBillingIntervalFromPriceId(
  priceId: string | null | undefined
): MembershipBillingInterval {
  if (!priceId) {
    return "monthly";
  }

  for (const tier of MEMBERSHIP_TIER_ORDER) {
    const variants = MEMBERSHIP_STRIPE_PRICE_IDS[tier];

    for (const variant of Object.keys(variants) as MembershipBillingVariant[]) {
      for (const interval of Object.keys(
        variants[variant]
      ) as MembershipBillingInterval[]) {
        if (priceId === variants[variant][interval]) {
          return interval;
        }
      }
    }
  }

  return "monthly";
}

export function resolveMembershipPriceFromStripePriceId(
  priceId: string | null | undefined
): MembershipBillingPlan {
  const tier = resolveTierFromPriceId(priceId);
  const billingVariant = resolveBillingVariantFromPriceId(priceId);
  const billingInterval = resolveBillingIntervalFromPriceId(priceId);

  return getMembershipBillingPlan(tier, billingVariant, billingInterval);
}

export function getMembershipPriceDifference(params: {
  currentMonthlyEquivalentPrice: number;
  targetMonthlyEquivalentPrice: number;
}) {
  return Math.max(
    0,
    params.targetMonthlyEquivalentPrice - params.currentMonthlyEquivalentPrice
  );
}

export function formatMembershipPrice(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(amount);
}

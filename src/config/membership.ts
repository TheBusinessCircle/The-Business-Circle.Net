import type { MembershipTier } from "@prisma/client";
import type { MembershipPlan, MembershipPlanMap } from "@/types";

export type MembershipBillingVariant = "standard" | "founding";

export type MembershipPlanVariant = MembershipPlan & {
  billingVariant: MembershipBillingVariant;
};

type MembershipVariantMap = Record<
  MembershipTier,
  Record<MembershipBillingVariant, MembershipPlanVariant>
>;

const TIER_RANK: Record<MembershipTier, number> = {
  FOUNDATION: 1,
  INNER_CIRCLE: 2,
  CORE: 3
};

const STANDARD_MONTHLY_PRICES: Record<MembershipTier, number> = {
  FOUNDATION: 30,
  INNER_CIRCLE: 60,
  CORE: 120
};

const DEFAULT_FOUNDING_MONTHLY_PRICES: Record<MembershipTier, number> = {
  FOUNDATION: 15,
  INNER_CIRCLE: 40,
  CORE: 80
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

export const MEMBERSHIP_PLAN_VARIANTS: MembershipVariantMap = {
  FOUNDATION: {
    standard: {
      tier: "FOUNDATION",
      billingVariant: "standard",
      name: "Foundation",
      slug: "foundation",
      monthlyPrice: STANDARD_MONTHLY_PRICES.FOUNDATION,
      currency: "GBP",
      stripePriceId:
        process.env.STRIPE_FOUNDATION_PRICE_ID ?? process.env.STRIPE_STANDARD_PRICE_ID ?? "",
      features: FOUNDATION_PLAN_FEATURES
    },
    founding: {
      tier: "FOUNDATION",
      billingVariant: "founding",
      name: "Foundation",
      slug: "foundation",
      monthlyPrice: DEFAULT_FOUNDING_MONTHLY_PRICES.FOUNDATION,
      currency: "GBP",
      stripePriceId:
        process.env.STRIPE_FOUNDING_FOUNDATION_PRICE_ID ??
        process.env.STRIPE_FOUNDING_STANDARD_PRICE_ID ??
        "",
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
      stripePriceId: process.env.STRIPE_INNER_CIRCLE_PRICE_ID ?? "",
      features: INNER_CIRCLE_PLAN_FEATURES
    },
    founding: {
      tier: "INNER_CIRCLE",
      billingVariant: "founding",
      name: "Inner Circle",
      slug: "inner-circle",
      monthlyPrice: DEFAULT_FOUNDING_MONTHLY_PRICES.INNER_CIRCLE,
      currency: "GBP",
      stripePriceId: process.env.STRIPE_FOUNDING_INNER_CIRCLE_PRICE_ID ?? "",
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
      stripePriceId: process.env.STRIPE_CORE_PRICE_ID ?? "",
      features: CORE_PLAN_FEATURES
    },
    founding: {
      tier: "CORE",
      billingVariant: "founding",
      name: "Core",
      slug: "core",
      monthlyPrice: DEFAULT_FOUNDING_MONTHLY_PRICES.CORE,
      currency: "GBP",
      stripePriceId: process.env.STRIPE_FOUNDING_CORE_PRICE_ID ?? "",
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

export function getMembershipVariantPrices(tier: MembershipTier) {
  return MEMBERSHIP_PLAN_VARIANTS[tier];
}

export function getMembershipTierLabel(tier: MembershipTier): string {
  return MEMBERSHIP_TIER_LABELS[tier];
}

export function getMembershipTierRank(tier: MembershipTier): number {
  return TIER_RANK[tier];
}

export function isMembershipVariantStripeConfigured(
  tier: MembershipTier,
  variant: MembershipBillingVariant
): boolean {
  return Boolean(MEMBERSHIP_PLAN_VARIANTS[tier][variant].stripePriceId);
}

export function resolveTierFromPriceId(priceId: string | null | undefined): MembershipTier {
  if (!priceId) {
    return "FOUNDATION";
  }

  for (const tier of MEMBERSHIP_TIER_ORDER) {
    const variants = MEMBERSHIP_PLAN_VARIANTS[tier];
    if (
      priceId === variants.standard.stripePriceId ||
      priceId === variants.founding.stripePriceId
    ) {
      return tier;
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
    if (priceId === MEMBERSHIP_PLAN_VARIANTS[tier].founding.stripePriceId) {
      return "founding";
    }
  }

  return "standard";
}

export function resolveMembershipPriceFromStripePriceId(
  priceId: string | null | undefined
): MembershipPlanVariant {
  const tier = resolveTierFromPriceId(priceId);
  const billingVariant = resolveBillingVariantFromPriceId(priceId);
  return getMembershipPlanVariant(tier, billingVariant);
}

export function getMembershipPriceDifference(params: {
  currentMonthlyPrice: number;
  targetMonthlyPrice: number;
}) {
  return Math.max(0, params.targetMonthlyPrice - params.currentMonthlyPrice);
}

import type { MembershipTier } from "@prisma/client";
import type { MembershipPlan, MembershipPlanMap } from "@/types";

export type MembershipBillingVariant = "standard" | "founding";
export type MembershipBillingInterval = "monthly" | "annual";

export type MembershipPlanVariant = MembershipPlan & {
  billingVariant: MembershipBillingVariant;
  planKey: string;
};

export type MembershipBillingPlan = MembershipPlanVariant & {
  billingInterval: MembershipBillingInterval;
  checkoutPrice: number;
  annualPrice: number;
  monthlyEquivalentPrice: number;
};

type MembershipTierPricing = {
  standardMonthly: number;
  foundersMonthly: number;
  standardAnnual: number;
  foundersAnnual: number;
};

type MembershipTierContent = {
  badgeLabel: string;
  supportingBadge: string;
  description: string;
  bestFitLine: string;
  narrative: string;
  ctaLabel: string;
  emphasisLabel?: string;
  accessNote?: string;
  trustLine: string;
  includedBenefits: string[];
  homeDescription: string;
  homePositioningLabel: string;
  homeFeaturedLabel?: string;
  homeSpotlight?: {
    label: string;
    text: string;
  };
};

type MembershipTierDefinition = {
  tier: MembershipTier;
  name: string;
  slug: string;
  rank: number;
  pricing: MembershipTierPricing;
  content: MembershipTierContent;
  features: string[];
  stripe: Record<MembershipBillingVariant, Record<MembershipBillingInterval, string>>;
};

type MembershipVariantMap = Record<
  MembershipTier,
  Record<MembershipBillingVariant, MembershipPlanVariant>
>;

type MembershipStripePriceMap = Record<
  MembershipTier,
  Record<MembershipBillingVariant, Record<MembershipBillingInterval, string>>
>;

export const MEMBERSHIP_ANNUAL_SAVINGS_PERCENT = 20;
export const MEMBERSHIP_FOUNDING_CAPACITY = 50;

export const MEMBERSHIP_PAGE_MICROCOPY = [
  "Built for business owners, not browsers.",
  "No noise, just real conversations and growth.",
  "Move at your own pace, or step into something bigger."
] as const;

const FOUNDATION_PLAN_FEATURES = [
  "Access to the wider member environment",
  "Structured business discussions instead of noise",
  "Resources and strategy material for active learning",
  "Directory visibility and event access",
  "Exposure to how other businesses are growing"
];

const FOUNDATION_INCLUDED_BENEFITS = [
  "Access to the wider Business Circle network",
  "A visible member profile so the right people can find your business",
  "Foundational resources to build traction with more structure",
  "Core business discussions with practical owner context",
  "A calmer room to build properly without extra noise"
];

const INNER_CIRCLE_PLAN_FEATURES = [
  "Everything in Foundation",
  "Deeper discussion spaces with stronger context",
  "Increased visibility inside the network",
  "Stronger positioning through a tighter room",
  "Higher-signal business conversations",
  "More private access and stronger intent"
];

const INNER_CIRCLE_INCLUDED_BENEFITS = [
  "Everything in Foundation",
  "Access to the tighter Inner Circle environment",
  "Deeper founder discussion with stronger business context",
  "Higher-value resources for businesses already moving",
  "Closer proximity to more relevant conversations"
];

const CORE_PLAN_FEATURES = [
  "Everything in Inner Circle",
  "Private room for higher-level operators",
  "Closer founder proximity",
  "Serious growth conversations with stronger context",
  "Quieter space for consequential decisions",
  "Optional deeper strategic support when needed"
];

const CORE_INCLUDED_BENEFITS = [
  "Everything in Inner Circle",
  "Access to the highest-level room inside the network",
  "Stronger proximity to serious operators carrying bigger decisions",
  "A quieter environment with higher-value conversation",
  "Better context for judgement, structure, and momentum"
];

function calculateAnnualPrice(monthlyPrice: number): number {
  return Math.floor((monthlyPrice * (100 - MEMBERSHIP_ANNUAL_SAVINGS_PERCENT)) / 100) * 12;
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

export const MEMBERSHIP_TIER_ORDER = [
  "FOUNDATION",
  "INNER_CIRCLE",
  "CORE"
] as const satisfies readonly MembershipTier[];

export const MEMBERSHIP_TIER_DEFINITIONS: Record<MembershipTier, MembershipTierDefinition> = {
  FOUNDATION: {
    tier: "FOUNDATION",
    name: "Foundation",
    slug: "foundation",
    rank: 1,
    pricing: {
      standardMonthly: 30,
      foundersMonthly: 15,
      standardAnnual: 288,
      foundersAnnual: 144
    },
    content: {
      badgeLabel: "Foundation",
      supportingBadge: "Access, learning, exposure",
      description:
        "Foundation gives you the full base: access to the network, a stronger place to learn, and exposure to how other businesses are moving.",
      bestFitLine: "Best if you need access, learning, and a clearer base around the business.",
      narrative:
        "A strong entry into the network when you want structure, signal, and business growth without overcomplicating the decision.",
      ctaLabel: "Enter Foundation",
      trustLine: "Built for business owners, not browsers.",
      includedBenefits: FOUNDATION_INCLUDED_BENEFITS,
      homeDescription:
        "Start here when you want the full structure: resources, community, directory, events, and a better business room around you.",
      homePositioningLabel: "Best place to start"
    },
    features: FOUNDATION_PLAN_FEATURES,
    stripe: {
      standard: {
        monthly: "foundation-monthly",
        annual: "foundation-annual"
      },
      founding: {
        monthly: "foundation-founders-monthly",
        annual: "foundation-founders-annual"
      }
    }
  },
  INNER_CIRCLE: {
    tier: "INNER_CIRCLE",
    name: "Inner Circle",
    slug: "inner-circle",
    rank: 2,
    pricing: {
      standardMonthly: 79,
      foundersMonthly: 39,
      standardAnnual: 756,
      foundersAnnual: 372
    },
    content: {
      badgeLabel: "Inner Circle",
      supportingBadge: "Depth, visibility, positioning",
      description:
        "Inner Circle gives you deeper discussions, increased visibility, and stronger positioning inside a more focused room.",
      bestFitLine:
        "Best if the business is moving and you want stronger positioning with higher-signal conversation.",
      narrative:
        "This is where the room becomes tighter, more useful, and more strategic without becoming noisy.",
      ctaLabel: "Join Inner Circle",
      emphasisLabel: "Most active members choose this",
      trustLine: "No noise, just real conversations and growth.",
      includedBenefits: INNER_CIRCLE_INCLUDED_BENEFITS,
      homeDescription:
        "Choose this when Foundation is already useful and you want stronger signal, more private context, and a room with greater intent.",
      homePositioningLabel: "Smartest next step",
      homeFeaturedLabel: "Most active members choose this",
      homeSpotlight: {
        label: "Most active members choose this",
        text: "A more focused room with better conversations and stronger movement inside the network."
      }
    },
    features: INNER_CIRCLE_PLAN_FEATURES,
    stripe: {
      standard: {
        monthly: "inner-circle-monthly",
        annual: "inner-circle-annual"
      },
      founding: {
        monthly: "inner-circle-founders-monthly",
        annual: "inner-circle-founders-annual"
      }
    }
  },
  CORE: {
    tier: "CORE",
    name: "Core",
    slug: "core",
    rank: 3,
    pricing: {
      standardMonthly: 149,
      foundersMonthly: 74,
      standardAnnual: 1428,
      foundersAnnual: 708
    },
    content: {
      badgeLabel: "Core",
      supportingBadge: "Operators, proximity, seriousness",
      description:
        "Core is for serious operators who want higher-level company, closer proximity, and more serious growth conversations in a protected room.",
      bestFitLine:
        "Best if you want higher-level operators, closer proximity, and more serious conversations.",
      narrative:
        "Protected by design so the room stays useful for operators carrying real decisions and real responsibility.",
      ctaLabel: "Continue to Core",
      accessNote: "Access may be limited",
      trustLine: "Move at your own pace, or step into something bigger.",
      includedBenefits: CORE_INCLUDED_BENEFITS,
      homeDescription:
        "Step into Core when proximity, judgement, and the quality of room matter more than wider access alone.",
      homePositioningLabel: "Highest-value room"
    },
    features: CORE_PLAN_FEATURES,
    stripe: {
      standard: {
        monthly: "core-monthly",
        annual: "core-annual"
      },
      founding: {
        monthly: "core-founders-monthly",
        annual: "core-founders-annual"
      }
    }
  }
};

export const MEMBERSHIP_TIER_LABELS: Record<MembershipTier, string> = Object.fromEntries(
  MEMBERSHIP_TIER_ORDER.map((tier) => [tier, MEMBERSHIP_TIER_DEFINITIONS[tier].name])
) as Record<MembershipTier, string>;

export const MEMBERSHIP_PLAN_VARIANTS: MembershipVariantMap = {
  FOUNDATION: {
    standard: {
      tier: "FOUNDATION",
      billingVariant: "standard",
      name: MEMBERSHIP_TIER_DEFINITIONS.FOUNDATION.name,
      slug: MEMBERSHIP_TIER_DEFINITIONS.FOUNDATION.slug,
      monthlyPrice: MEMBERSHIP_TIER_DEFINITIONS.FOUNDATION.pricing.standardMonthly,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.FOUNDATION.standard.monthly,
      planKey: MEMBERSHIP_TIER_DEFINITIONS.FOUNDATION.stripe.standard.monthly,
      features: FOUNDATION_PLAN_FEATURES
    },
    founding: {
      tier: "FOUNDATION",
      billingVariant: "founding",
      name: MEMBERSHIP_TIER_DEFINITIONS.FOUNDATION.name,
      slug: MEMBERSHIP_TIER_DEFINITIONS.FOUNDATION.slug,
      monthlyPrice: MEMBERSHIP_TIER_DEFINITIONS.FOUNDATION.pricing.foundersMonthly,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.FOUNDATION.founding.monthly,
      planKey: MEMBERSHIP_TIER_DEFINITIONS.FOUNDATION.stripe.founding.monthly,
      features: FOUNDATION_PLAN_FEATURES
    }
  },
  INNER_CIRCLE: {
    standard: {
      tier: "INNER_CIRCLE",
      billingVariant: "standard",
      name: MEMBERSHIP_TIER_DEFINITIONS.INNER_CIRCLE.name,
      slug: MEMBERSHIP_TIER_DEFINITIONS.INNER_CIRCLE.slug,
      monthlyPrice: MEMBERSHIP_TIER_DEFINITIONS.INNER_CIRCLE.pricing.standardMonthly,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.INNER_CIRCLE.standard.monthly,
      planKey: MEMBERSHIP_TIER_DEFINITIONS.INNER_CIRCLE.stripe.standard.monthly,
      features: INNER_CIRCLE_PLAN_FEATURES
    },
    founding: {
      tier: "INNER_CIRCLE",
      billingVariant: "founding",
      name: MEMBERSHIP_TIER_DEFINITIONS.INNER_CIRCLE.name,
      slug: MEMBERSHIP_TIER_DEFINITIONS.INNER_CIRCLE.slug,
      monthlyPrice: MEMBERSHIP_TIER_DEFINITIONS.INNER_CIRCLE.pricing.foundersMonthly,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.INNER_CIRCLE.founding.monthly,
      planKey: MEMBERSHIP_TIER_DEFINITIONS.INNER_CIRCLE.stripe.founding.monthly,
      features: INNER_CIRCLE_PLAN_FEATURES
    }
  },
  CORE: {
    standard: {
      tier: "CORE",
      billingVariant: "standard",
      name: MEMBERSHIP_TIER_DEFINITIONS.CORE.name,
      slug: MEMBERSHIP_TIER_DEFINITIONS.CORE.slug,
      monthlyPrice: MEMBERSHIP_TIER_DEFINITIONS.CORE.pricing.standardMonthly,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.CORE.standard.monthly,
      planKey: MEMBERSHIP_TIER_DEFINITIONS.CORE.stripe.standard.monthly,
      features: CORE_PLAN_FEATURES
    },
    founding: {
      tier: "CORE",
      billingVariant: "founding",
      name: MEMBERSHIP_TIER_DEFINITIONS.CORE.name,
      slug: MEMBERSHIP_TIER_DEFINITIONS.CORE.slug,
      monthlyPrice: MEMBERSHIP_TIER_DEFINITIONS.CORE.pricing.foundersMonthly,
      currency: "GBP",
      stripePriceId: MEMBERSHIP_STRIPE_PRICE_IDS.CORE.founding.monthly,
      planKey: MEMBERSHIP_TIER_DEFINITIONS.CORE.stripe.founding.monthly,
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

export function getMembershipTierDefinition(tier: MembershipTier) {
  return MEMBERSHIP_TIER_DEFINITIONS[tier];
}

export function getMembershipTierContent(tier: MembershipTier) {
  return MEMBERSHIP_TIER_DEFINITIONS[tier].content;
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
  const pricing = MEMBERSHIP_TIER_DEFINITIONS[tier].pricing;
  const defaultMonthlyPrice =
    billingVariant === "founding" ? pricing.foundersMonthly : pricing.standardMonthly;
  const defaultAnnualPrice =
    billingVariant === "founding" ? pricing.foundersAnnual : pricing.standardAnnual;
  const monthlyPrice = Math.max(
    0,
    Math.round(overrides?.monthlyPrice ?? defaultMonthlyPrice)
  );
  const annualPrice = Math.max(
    0,
    Math.round(
      overrides?.annualPrice ??
        (overrides?.monthlyPrice !== undefined
          ? calculateAnnualPrice(monthlyPrice)
          : defaultAnnualPrice)
    )
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
    planKey: getMembershipPlanKey(tier, billingVariant, billingInterval),
    billingInterval,
    monthlyPrice,
    annualPrice,
    checkoutPrice,
    monthlyEquivalentPrice
  };
}

export function getMembershipTierPricing(tier: MembershipTier) {
  const pricing = MEMBERSHIP_TIER_DEFINITIONS[tier].pricing;

  return {
    standardMonthlyPrice: pricing.standardMonthly,
    standardAnnualPrice: pricing.standardAnnual,
    foundingMonthlyPrice: pricing.foundersMonthly,
    foundingAnnualPrice: pricing.foundersAnnual
  };
}

export function getMembershipVariantPrices(tier: MembershipTier) {
  return MEMBERSHIP_PLAN_VARIANTS[tier];
}

export function getMembershipPlanKey(
  tier: MembershipTier,
  billingVariant: MembershipBillingVariant,
  billingInterval: MembershipBillingInterval
) {
  return MEMBERSHIP_TIER_DEFINITIONS[tier].stripe[billingVariant][billingInterval];
}

export function resolveMembershipBillingInterval(
  value: string | null | undefined
): MembershipBillingInterval {
  return value === "annual" ? "annual" : "monthly";
}

export function getMembershipTierLabel(tier: MembershipTier): string {
  return MEMBERSHIP_TIER_LABELS[tier];
}

export function getMembershipTierSlug(tier: MembershipTier): string {
  return MEMBERSHIP_TIER_DEFINITIONS[tier].slug;
}

export function resolveMembershipTierInput(
  value: string | null | undefined
): MembershipTier {
  if (!value) {
    return "FOUNDATION";
  }

  const normalizedValue = value.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (normalizedValue === "CORE") {
    return "CORE";
  }

  if (
    normalizedValue === "INNER_CIRCLE" ||
    normalizedValue === "INNERCIRCLE"
  ) {
    return "INNER_CIRCLE";
  }

  return "FOUNDATION";
}

export function getMembershipTierRank(tier: MembershipTier): number {
  return MEMBERSHIP_TIER_DEFINITIONS[tier].rank;
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

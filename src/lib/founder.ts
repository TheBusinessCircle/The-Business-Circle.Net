import type {
  FounderRevenueRange,
  FounderClientStage,
  FounderServiceDiscountTag,
  FounderServiceIntakeMode,
  MembershipTier,
  FounderServicePaymentStatus,
  FounderServiceStatus,
  Role,
  SubscriptionStatus
} from "@prisma/client";
import { resolveEffectiveTier } from "@/lib/auth/permissions";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import type {
  FounderPricingViewerContext,
  FounderServicePricingSummary
} from "@/types";

export const GROWTH_ARCHITECT_SERVICE_SLUGS = [
  "growth-architect-clarity-audit",
  "growth-architect-growth-strategy",
  "growth-architect-full-growth-architect"
] as const;

const GROWTH_ARCHITECT_BASE_PRICES: Record<string, number> = {
  "growth-architect-clarity-audit": 19_900,
  "growth-architect-growth-strategy": 40_000,
  "growth-architect-full-growth-architect": 100_000
};

const GROWTH_ARCHITECT_DISCOUNTS: Record<MembershipTier, number> = {
  FOUNDATION: 0,
  INNER_CIRCLE: 10,
  CORE: 20
};

const DEFAULT_MEMBER_BENEFIT_MESSAGE =
  "Inner Circle members receive 10% off and Core members receive 20% off direct founder work.";

function resolveFounderPricingTier(
  input:
    | FounderPricingViewerContext
    | {
        role: Role;
        membershipTier: MembershipTier;
        hasActiveSubscription: boolean;
      }
    | null
    | undefined
): MembershipTier | null {
  if (!input?.hasActiveSubscription) {
    return null;
  }

  return resolveEffectiveTier(input.role, input.membershipTier);
}

function hasEntitledFounderSubscription(status: SubscriptionStatus | null | undefined): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

function resolveFounderPricingTierFromAccount(input: {
  role: Role;
  membershipTier: MembershipTier;
  subscriptionStatus: SubscriptionStatus | null;
} | null): MembershipTier | null {
  if (!input) {
    return null;
  }

  return resolveFounderPricingTier({
    role: input.role,
    membershipTier: input.membershipTier,
    hasActiveSubscription:
      input.role === "ADMIN" || hasEntitledFounderSubscription(input.subscriptionStatus)
  });
}

function getFounderDiscountMessaging(
  membershipTier: MembershipTier | null
): Pick<FounderServicePricingSummary, "discountLabel" | "appliedMessage" | "memberBenefitMessage"> {
  if (membershipTier === "CORE") {
    return {
      discountLabel: "Core member rate",
      appliedMessage: "20% member rate applied because you are part of Core.",
      memberBenefitMessage: null
    };
  }

  if (membershipTier === "INNER_CIRCLE") {
    return {
      discountLabel: "Inner Circle member rate",
      appliedMessage: "10% member rate applied because you are part of the Inner Circle.",
      memberBenefitMessage: null
    };
  }

  if (membershipTier === "FOUNDATION") {
    return {
      discountLabel: null,
      appliedMessage: null,
      memberBenefitMessage: DEFAULT_MEMBER_BENEFIT_MESSAGE
    };
  }

  return {
    discountLabel: null,
    appliedMessage: null,
    memberBenefitMessage: DEFAULT_MEMBER_BENEFIT_MESSAGE
  };
}

export function getServicePrice(
  userTier: MembershipTier | null | undefined,
  basePrice: number
): number {
  const discountPercent = userTier ? GROWTH_ARCHITECT_DISCOUNTS[userTier] ?? 0 : 0;
  return Math.round(basePrice * (100 - discountPercent) / 100);
}

function getGrowthArchitectBasePrice(slug: string, fallbackPrice: number): number {
  return GROWTH_ARCHITECT_BASE_PRICES[slug] ?? fallbackPrice;
}

function buildFounderServicePricing(
  service: {
    slug: string;
    price: number;
    intakeMode?: FounderServiceIntakeMode;
  },
  membershipTier: MembershipTier | null
): FounderServicePricingSummary {
  const isGrowthArchitect = isGrowthArchitectServiceSlug(service.slug);
  const baseAmount = isGrowthArchitect
    ? getGrowthArchitectBasePrice(service.slug, service.price)
    : service.price;
  const appliedMembershipTier = isGrowthArchitect ? membershipTier : null;
  const discountPercent = appliedMembershipTier
    ? GROWTH_ARCHITECT_DISCOUNTS[appliedMembershipTier]
    : 0;
  const finalAmount = getServicePrice(appliedMembershipTier, baseAmount);
  const messaging = getFounderDiscountMessaging(appliedMembershipTier);

  return {
    isGrowthArchitect,
    isApplicationOnly: service.intakeMode === "APPLICATION",
    baseAmount,
    finalAmount,
    discountPercent,
    appliedMembershipTier,
    discountLabel: messaging.discountLabel,
    appliedMessage: messaging.appliedMessage,
    memberBenefitMessage: isGrowthArchitect ? messaging.memberBenefitMessage : null
  };
}

export function isGrowthArchitectServiceSlug(slug: string): boolean {
  return GROWTH_ARCHITECT_SERVICE_SLUGS.includes(
    slug as (typeof GROWTH_ARCHITECT_SERVICE_SLUGS)[number]
  );
}

export function getFounderServicePricing(
  service: {
    slug: string;
    price: number;
    intakeMode?: FounderServiceIntakeMode;
  },
  viewer: FounderPricingViewerContext | null
): FounderServicePricingSummary {
  return buildFounderServicePricing(service, resolveFounderPricingTier(viewer));
}

export function getFounderServicePricingForAccount(
  service: {
    slug: string;
    price: number;
    intakeMode?: FounderServiceIntakeMode;
  },
  account: {
    role: Role;
    membershipTier: MembershipTier;
    subscriptionStatus: SubscriptionStatus | null;
  } | null
): FounderServicePricingSummary {
  return buildFounderServicePricing(service, resolveFounderPricingTierFromAccount(account));
}

export function formatFounderMembershipTierLabel(
  value: MembershipTier | null | undefined
): string {
  if (value === "CORE") {
    return "Core";
  }

  if (value === "INNER_CIRCLE") {
    return "Inner Circle";
  }

  if (value === "FOUNDATION") {
    return "Foundation";
  }

  return "Non-member";
}

export function formatFounderServicePrice(
  amountInMinorUnits: number,
  currency = "GBP",
  billingSuffix?: string
): string {
  const amount = amountInMinorUnits / 100;
  const formatted = formatCurrency(amount, currency);
  return billingSuffix ? `${formatted}${billingSuffix}` : formatted;
}

export function formatFounderPaymentStatusLabel(
  value: FounderServicePaymentStatus
): string {
  return toTitleCase(value.replaceAll("_", " "));
}

export function formatFounderServiceStatusLabel(
  value: FounderServiceStatus
): string {
  return toTitleCase(value.replaceAll("_", " "));
}

export function formatFounderClientStageLabel(value: FounderClientStage): string {
  return toTitleCase(value.replaceAll("_", " "));
}

export function formatFounderDiscountTagLabel(value: FounderServiceDiscountTag): string {
  return toTitleCase(value.replaceAll("_", " "));
}

export function formatFounderRevenueRangeLabel(value: FounderRevenueRange): string {
  const labels: Record<FounderRevenueRange, string> = {
    PRE_REVENUE: "Pre-revenue",
    UNDER_2000: "Under GBP2,000",
    BETWEEN_2000_10000: "GBP2,000 - GBP10,000",
    BETWEEN_10000_50000: "GBP10,000 - GBP50,000",
    OVER_50000: "GBP50,000+"
  };

  return labels[value];
}

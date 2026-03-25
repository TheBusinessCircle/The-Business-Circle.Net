import type {
  FounderRevenueRange,
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

const GROWTH_ARCHITECT_DISCOUNTS: Record<MembershipTier, number> = {
  FOUNDATION: 10,
  INNER_CIRCLE: 20,
  CORE: 30
};

const DEFAULT_MEMBER_BENEFIT_MESSAGE =
  "Foundation members receive 10% off, Inner Circle members receive 20% off, and Core members receive 30% off.";

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
      appliedMessage:
        "30% member rate applied because you are part of Core.",
      memberBenefitMessage: null
    };
  }

  if (membershipTier === "INNER_CIRCLE") {
    return {
      discountLabel: "Inner Circle member rate",
      appliedMessage:
        "20% member rate applied because you are part of the Inner Circle.",
      memberBenefitMessage: null
    };
  }

  if (membershipTier === "FOUNDATION") {
    return {
      discountLabel: "Foundation member rate",
      appliedMessage:
        "10% member rate applied because you are part of Foundation.",
      memberBenefitMessage: null
    };
  }

  return {
    discountLabel: null,
    appliedMessage: null,
    memberBenefitMessage: DEFAULT_MEMBER_BENEFIT_MESSAGE
  };
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

  if (service.intakeMode === "APPLICATION") {
    return {
      isGrowthArchitect,
      isApplicationOnly: true,
      baseAmount: service.price,
      finalAmount: service.price,
      discountPercent: 0,
      appliedMembershipTier: null,
      discountLabel: null,
      appliedMessage: null,
      memberBenefitMessage: null
    };
  }

  const appliedMembershipTier = isGrowthArchitect ? membershipTier : null;
  const discountPercent = appliedMembershipTier
    ? GROWTH_ARCHITECT_DISCOUNTS[appliedMembershipTier]
    : 0;
  const finalAmount = Math.round(service.price * (100 - discountPercent) / 100);
  const messaging = getFounderDiscountMessaging(appliedMembershipTier);

  return {
    isGrowthArchitect,
    isApplicationOnly: false,
    baseAmount: service.price,
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

export function formatFounderRevenueRangeLabel(value: FounderRevenueRange): string {
  const labels: Record<FounderRevenueRange, string> = {
    PRE_REVENUE: "Pre-revenue",
    UNDER_2000: "Under £2,000",
    BETWEEN_2000_10000: "£2,000 - £10,000",
    BETWEEN_10000_50000: "£10,000 - £50,000",
    OVER_50000: "£50,000+"
  };

  return labels[value];
}


export const CIRCLE_CARD_REFERRAL_REWARD_FOUNDATION = {
  trackingEnabled: true,
  automaticPayoutsEnabled: false,
  currency: "GBP",
  standardUsers: {
    activeProReferralMonthlyPence: 100
  },
  founderAmbassadors: {
    tiers: [
      {
        fromReferral: 1,
        toReferral: 10,
        activeProReferralMonthlyPence: 300
      },
      {
        fromReferral: 11,
        toReferral: 15,
        activeProReferralMonthlyPence: 200
      },
      {
        fromReferral: 16,
        toReferral: null,
        activeProReferralMonthlyPence: 100
      }
    ]
  }
} as const;

export const CIRCLE_CARD_COMMISSION_ESTIMATE_NOTICE =
  "Commission estimate based on current Pro entitlement.";

export type CircleCardCommissionReferrerType = "STANDARD" | "FOUNDING_AMBASSADOR";
export type CircleCardCommissionTierKey =
  | "STANDARD"
  | "FOUNDING_FIRST_10"
  | "FOUNDING_NEXT_5"
  | "FOUNDING_ADDITIONAL";

export type ActiveProReferralForCommission = {
  referralId: string;
  referredUserId: string;
  convertedToProAt: Date;
  entitlementSource: string;
};

export type CircleCardCommissionAllocation = ActiveProReferralForCommission & {
  periodMonth: Date;
  amountPence: number;
  currency: "GBP";
  tierApplied: CircleCardCommissionTierKey;
  referralPosition: number;
};

export function getCircleCardCommissionPeriodMonth(value = new Date()) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

export function calculateCircleCardMonthlyCommissions(input: {
  referrerType: CircleCardCommissionReferrerType;
  activeProReferrals: ActiveProReferralForCommission[];
  currentMonth?: Date;
}): CircleCardCommissionAllocation[] {
  const periodMonth = getCircleCardCommissionPeriodMonth(input.currentMonth);
  const orderedReferrals = [...input.activeProReferrals].sort(
    (left, right) =>
      left.convertedToProAt.getTime() - right.convertedToProAt.getTime() ||
      left.referredUserId.localeCompare(right.referredUserId)
  );

  return orderedReferrals.map((referral, index) => {
    const referralPosition = index + 1;
    let amountPence = 100;
    let tierApplied: CircleCardCommissionTierKey = "STANDARD";

    if (input.referrerType === "FOUNDING_AMBASSADOR") {
      if (referralPosition <= 10) {
        amountPence = 300;
        tierApplied = "FOUNDING_FIRST_10";
      } else if (referralPosition <= 15) {
        amountPence = 200;
        tierApplied = "FOUNDING_NEXT_5";
      } else {
        tierApplied = "FOUNDING_ADDITIONAL";
      }
    }

    return {
      ...referral,
      periodMonth,
      amountPence,
      currency: "GBP",
      tierApplied,
      referralPosition
    };
  });
}

export function getCircleCardReferralRewardAwareness(input: {
  activatedReferralCount: number;
  isFounderAmbassador?: boolean | null;
}) {
  const ambassador = Boolean(input.isFounderAmbassador);

  return {
    enabled: CIRCLE_CARD_REFERRAL_REWARD_FOUNDATION.trackingEnabled,
    lane: ambassador ? "FOUNDER_AMBASSADOR" : "STANDARD_USER",
    activatedReferralCount: input.activatedReferralCount,
    displayLabel: ambassador ? "Founder Ambassador reward awareness" : "Standard reward awareness",
    statusLabel: CIRCLE_CARD_COMMISSION_ESTIMATE_NOTICE
  };
}

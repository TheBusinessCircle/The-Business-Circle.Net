export const CIRCLE_CARD_REFERRAL_REWARD_FOUNDATION = {
  enabled: false,
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

export function getCircleCardReferralRewardAwareness(input: {
  activatedReferralCount: number;
  isFounderAmbassador?: boolean | null;
}) {
  const ambassador = Boolean(input.isFounderAmbassador);

  return {
    enabled: CIRCLE_CARD_REFERRAL_REWARD_FOUNDATION.enabled,
    lane: ambassador ? "FOUNDER_AMBASSADOR" : "STANDARD_USER",
    activatedReferralCount: input.activatedReferralCount,
    displayLabel: ambassador ? "Founder Ambassador reward awareness" : "Standard reward awareness",
    statusLabel: "Future rewards: tracked after Pro upgrade"
  };
}

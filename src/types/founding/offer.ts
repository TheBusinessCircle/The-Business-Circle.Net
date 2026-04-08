import type { MembershipTier } from "@prisma/client";

export interface FoundingOfferTierSnapshot {
  tier: MembershipTier;
  badgeLabel: string;
  offerLabel: string;
  foundingPrice: number;
  foundingAnnualPrice: number;
  standardPrice: number;
  standardAnnualPrice: number;
  limit: number;
  claimed: number;
  remaining: number;
  available: boolean;
  statusLabel: string;
  launchClosedLabel: string;
}

export interface FoundingOfferSnapshot {
  enabled: boolean;
  foundation: FoundingOfferTierSnapshot;
  innerCircle: FoundingOfferTierSnapshot;
  core: FoundingOfferTierSnapshot;
  updatedAt: Date;
}

export interface FoundingStatusModel {
  foundingMember: boolean;
  foundingTier: MembershipTier | null;
  foundingPrice: number | null;
  foundingClaimedAt: Date | null;
  badgeLabel: string | null;
}

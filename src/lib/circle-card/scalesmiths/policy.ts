export type ScaleSmithsPartnerStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "ENDED";
export type ScaleSmithsPortfolioStatus = "INTERNAL" | "APPROVED" | "PUBLISHED" | "WITHDRAWN";

export type ScaleSmithsPortfolioEligibility = {
  partnerStatus: ScaleSmithsPartnerStatus;
  publicationStatus: ScaleSmithsPortfolioStatus;
  clientConsentAt?: Date | null;
  founderApprovedAt?: Date | null;
  projectDeliveredAt?: Date | null;
  consentWithdrawnAt?: Date | null;
  partnerCardPublished: boolean;
};

export function canShowScaleSmithsPortfolioItem(
  input: ScaleSmithsPortfolioEligibility
): boolean {
  return input.partnerStatus === "ACTIVE" &&
    input.publicationStatus === "PUBLISHED" &&
    Boolean(input.clientConsentAt) &&
    Boolean(input.founderApprovedAt) &&
    Boolean(input.projectDeliveredAt) &&
    !input.consentWithdrawnAt &&
    input.partnerCardPublished;
}

// Each card can be excluded from an account's public card selection without deleting it.
// This is deliberately distinct from direct-link publication and subscription status.
export function appearsOnPublicCardSelector(input: {
  cardIsPublished: boolean;
  cardIsArchived: boolean;
  showOnPublicProfile: boolean;
}): boolean {
  return input.cardIsPublished &&
    !input.cardIsArchived &&
    input.showOnPublicProfile;
}

export function hasActiveScaleSmithsSponsorship(input: {
  partnerStatus: ScaleSmithsPartnerStatus;
  sponsorStartedAt: Date | null;
  sponsorEndedAt: Date | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  return input.partnerStatus === "ACTIVE" &&
    Boolean(input.sponsorStartedAt && input.sponsorStartedAt <= now) &&
    (!input.sponsorEndedAt || input.sponsorEndedAt > now);
}

// Revoke *only* the ScaleSmiths-sponsored entitlement when the partner leaves.
// Never cancel a Stripe subscription or remove another independent Pro grant.
export function effectiveProAccess(input: {
  hasPaidProAccess: boolean;
  hasOtherProGrant: boolean;
  hasScaleSmithsSponsorship: boolean;
}): boolean {
  return input.hasPaidProAccess ||
    input.hasOtherProGrant ||
    input.hasScaleSmithsSponsorship;
}

export function canPartnerEditField(field: string): boolean {
  return new Set([
    "fullName", "about", "profileImageUrl",
    "email", "phone", "location"
  ]).has(field);
}

export function mayReadPartnerRecord(input: {
  actorUserId: string;
  partnerUserId: string;
  actorRole: "FOUNDER" | "ADMIN" | "STAFF" | "PARTNER" | "CLIENT" | "PUBLIC";
  hasExplicitStaffAssignment?: boolean;
}): boolean {
  return input.actorRole === "FOUNDER" ||
    input.actorRole === "ADMIN" ||
    (input.actorRole === "STAFF" && input.hasExplicitStaffAssignment === true) ||
    (input.actorRole === "PARTNER" && input.actorUserId === input.partnerUserId);
}

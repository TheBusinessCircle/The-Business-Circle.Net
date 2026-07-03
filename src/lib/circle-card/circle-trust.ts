export type CircleTrustSignalId =
  | "verified-connections"
  | "verified-testimonials"
  | "published-circle-card"
  | "active-profile"
  | "profile-complete"
  | "verified-account-email"
  | "founding-member"
  | "bcn-member";

export type CircleTrustSignal = {
  id: CircleTrustSignalId;
  label: string;
  description: string;
  count?: number;
};

export type CircleTrustTestimonial = {
  id: string;
  reviewerName: string;
  reviewerRoleOrCompany: string | null;
  testimonialText: string;
  rating: number | null;
  relationship: string | null;
  verifiedAt: Date;
};

export type CircleTrustSummary = {
  version: 1;
  score: number;
  summary: string;
  verifiedConnectionCount: number;
  verifiedTestimonialCount: number;
  manualTestimonialCount: number;
  signals: CircleTrustSignal[];
  latestVerifiedTestimonials: CircleTrustTestimonial[];
};

type BuildCircleTrustInput = {
  card: {
    fullName: string;
    businessName: string | null;
    role: string | null;
    tagline: string | null;
    about: string | null;
    profileImageUrl: string | null;
    businessLogoUrl: string | null;
    websiteUrl: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    isPublished: boolean;
    archivedAt: Date | null;
  };
  owner: {
    role: string;
    emailVerified: Date | null;
    foundingMember: boolean;
    hasActiveSubscription: boolean;
  };
  verifiedConnectionCount: number;
  verifiedTestimonials: CircleTrustTestimonial[];
  manualTestimonialCount: number;
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function isCircleTrustProfileComplete(card: BuildCircleTrustInput["card"]) {
  return Boolean(
    hasText(card.fullName) &&
      (hasText(card.businessName) || hasText(card.role)) &&
      (hasText(card.tagline) || hasText(card.about)) &&
      (hasText(card.profileImageUrl) || hasText(card.businessLogoUrl)) &&
      (hasText(card.websiteUrl) || hasText(card.email) || hasText(card.phone)) &&
      hasText(card.location)
  );
}

export function buildCircleTrustSummary(input: BuildCircleTrustInput): CircleTrustSummary {
  const verifiedConnectionCount = Math.max(0, input.verifiedConnectionCount);
  const verifiedTestimonialCount = input.verifiedTestimonials.length;
  const score = verifiedConnectionCount + verifiedTestimonialCount;
  const activeProfile = input.card.isPublished && !input.card.archivedAt;
  const signals: CircleTrustSignal[] = [];

  if (verifiedConnectionCount > 0) {
    signals.push({
      id: "verified-connections",
      label: "Verified Connections",
      description: "Mutually accepted Circle Card connections.",
      count: verifiedConnectionCount
    });
  }

  if (verifiedTestimonialCount > 0) {
    signals.push({
      id: "verified-testimonials",
      label: "Verified Testimonials",
      description: "Approved testimonials submitted through a saved Circle Wallet relationship.",
      count: verifiedTestimonialCount
    });
  }

  if (input.card.isPublished && !input.card.archivedAt) {
    signals.push({
      id: "published-circle-card",
      label: "Published Circle Card",
      description: "This Circle Card is published on the platform."
    });
  }

  if (activeProfile) {
    signals.push({
      id: "active-profile",
      label: "Active Profile",
      description: "The public profile is live and available."
    });
  }

  if (isCircleTrustProfileComplete(input.card)) {
    signals.push({
      id: "profile-complete",
      label: "Profile Complete",
      description: "Core identity, profile, location and contact details are complete."
    });
  }

  if (input.owner.emailVerified) {
    signals.push({
      id: "verified-account-email",
      label: "Verified Account Email",
      description: "The account email has been verified by the platform."
    });
  }

  if (input.owner.foundingMember) {
    signals.push({
      id: "founding-member",
      label: "Founding Member",
      description: "Recorded as a founding member of The Business Circle."
    });
  }

  if (input.owner.role === "ADMIN" || input.owner.hasActiveSubscription) {
    signals.push({
      id: "bcn-member",
      label: "BCN Member",
      description: "Active membership is recorded by The Business Circle."
    });
  }

  const summary = score > 0
    ? `Built from ${verifiedConnectionCount} verified connection${verifiedConnectionCount === 1 ? "" : "s"} and ${verifiedTestimonialCount} verified testimonial${verifiedTestimonialCount === 1 ? "" : "s"}.`
    : "Building Circle Trust through verified connections and testimonials.";

  return {
    version: 1,
    score,
    summary,
    verifiedConnectionCount,
    verifiedTestimonialCount,
    manualTestimonialCount: Math.max(0, input.manualTestimonialCount),
    signals,
    latestVerifiedTestimonials: input.verifiedTestimonials.slice(0, 6)
  };
}

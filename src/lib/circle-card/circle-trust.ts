export type CircleTrustSignalId =
  | "verified-connections"
  | "verified-testimonials"
  | "published-circle-card"
  | "active-profile"
  | "profile-complete"
  | "verified-account-email"
  | "website-added"
  | "founding-member"
  | "bcn-member";

export type CircleTrustSignal = {
  id: CircleTrustSignalId;
  label: string;
  description: string;
  count?: number;
  scoreContribution: number;
};

export type CircleTrustOpportunity = {
  id: CircleTrustSignalId;
  label: string;
  description: string;
};

export type CircleTrustTestimonial = {
  id: string;
  reviewerName: string;
  reviewerImageUrl?: string | null;
  reviewerRoleOrCompany: string | null;
  testimonialText: string;
  rating: number | null;
  relationship: string | null;
  verifiedAt: Date;
};

export type CircleTrustTimelineEvent = {
  id: string;
  kind: "CONNECTION" | "TESTIMONIAL" | "VERIFICATION" | "PROFILE";
  title: string;
  description: string;
  occurredAt: Date;
  actorName?: string | null;
};

export type CircleTrustSummary = {
  version: 1;
  score: number;
  summary: string;
  verifiedConnectionCount: number;
  verifiedTestimonialCount: number;
  manualTestimonialCount: number;
  signals: CircleTrustSignal[];
  availableSignals: CircleTrustOpportunity[];
  latestVerifiedTestimonials: CircleTrustTestimonial[];
  timeline: CircleTrustTimelineEvent[];
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
    hasHistoricalActivity: boolean;
    createdAt?: Date | null;
  };
  owner: {
    role: string;
    emailVerified: Date | null;
    foundingMember: boolean;
    foundingClaimedAt?: Date | null;
    hasActiveSubscription: boolean;
  };
  verifiedConnectionEvents?: Array<{
    id: string;
    connectionName?: string | null;
    connectionBusinessName?: string | null;
    verifiedAt: Date;
  }>;
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
  const activeProfile =
    input.card.isPublished && !input.card.archivedAt && input.card.hasHistoricalActivity;
  const signals: CircleTrustSignal[] = [];
  const availableSignals: CircleTrustOpportunity[] = [];

  if (verifiedConnectionCount > 0) {
    signals.push({
      id: "verified-connections",
      label: "Verified Connections",
      description: "Mutually accepted Circle Card connections.",
      count: verifiedConnectionCount,
      scoreContribution: verifiedConnectionCount
    });
  } else {
    availableSignals.push({
      id: "verified-connections",
      label: "Build Wallet Connections",
      description: "Connect with people you genuinely know through Circle Wallet."
    });
  }

  if (verifiedTestimonialCount > 0) {
    signals.push({
      id: "verified-testimonials",
      label: "Verified Testimonials",
      description: "Approved testimonials submitted through a saved Circle Wallet relationship.",
      count: verifiedTestimonialCount,
      scoreContribution: verifiedTestimonialCount
    });
  } else {
    availableSignals.push({
      id: "verified-testimonials",
      label: "Receive First Testimonial",
      description: "Invite a saved connection to leave a genuine testimonial."
    });
  }

  if (input.card.isPublished && !input.card.archivedAt) {
    signals.push({
      id: "published-circle-card",
      label: "Published Circle Card",
      description: "This Circle Card is published on the platform.",
      scoreContribution: 1
    });
  } else {
    availableSignals.push({
      id: "published-circle-card",
      label: "Publish Circle Card",
      description: "Make this Circle Card available through its public link."
    });
  }

  if (activeProfile) {
    signals.push({
      id: "active-profile",
      label: "Active Profile",
      description: "The public profile is live and has recorded Circle Card activity.",
      scoreContribution: 1
    });
  } else if (input.card.isPublished && !input.card.archivedAt) {
    availableSignals.push({
      id: "active-profile",
      label: "Stay Active",
      description: "Use and share your published Circle Card to build genuine activity history."
    });
  }

  if (isCircleTrustProfileComplete(input.card)) {
    signals.push({
      id: "profile-complete",
      label: "Profile Complete",
      description: "Core identity, profile, location and contact details are complete.",
      scoreContribution: 1
    });
  } else {
    availableSignals.push({
      id: "profile-complete",
      label: "Complete Profile",
      description: "Complete the core identity, image, location and contact details."
    });
  }

  if (input.owner.emailVerified) {
    signals.push({
      id: "verified-account-email",
      label: "Verified Account Email",
      description: "The account email has been verified by the platform.",
      scoreContribution: 1
    });
  } else {
    availableSignals.push({
      id: "verified-account-email",
      label: "Verify Email",
      description: "Verify the email address attached to this account."
    });
  }

  if (hasText(input.card.websiteUrl)) {
    signals.push({
      id: "website-added",
      label: "Website Added",
      description: "A public website is recorded on this Circle Card.",
      scoreContribution: 1
    });
  } else {
    availableSignals.push({
      id: "website-added",
      label: "Add Website",
      description: "Add a genuine public website or portfolio route."
    });
  }

  if (input.owner.foundingMember) {
    signals.push({
      id: "founding-member",
      label: "Founding Member",
      description: "Recorded as an early founding member of the platform.",
      scoreContribution: 1
    });
  }

  if (input.owner.role === "ADMIN" || input.owner.hasActiveSubscription) {
    signals.push({
      id: "bcn-member",
      label: "Circle Card Member",
      description: "Active platform membership is recorded for this Circle Card.",
      scoreContribution: 1
    });
  } else {
    availableSignals.push({
      id: "bcn-member",
      label: "Explore Membership",
      description: "Membership opens additional genuine trust-building opportunities."
    });
  }

  const score = signals.reduce((total, signal) => total + signal.scoreContribution, 0);
  const verifiedRelationshipCount = verifiedConnectionCount + verifiedTestimonialCount;
  const completedPlatformSignalCount = signals.filter(
    (signal) => signal.id !== "verified-connections" && signal.id !== "verified-testimonials"
  ).length;

  const summary = score > 0
    ? `Built from ${verifiedRelationshipCount} verified relationship${verifiedRelationshipCount === 1 ? "" : "s"} and ${completedPlatformSignalCount} completed platform trust signal${completedPlatformSignalCount === 1 ? "" : "s"}.`
    : "Build Circle Trust through verified relationships and completed platform trust signals.";
  const timeline: CircleTrustTimelineEvent[] = [
    ...(input.verifiedConnectionEvents ?? []).map((connection) => ({
      id: `connection:${connection.id}`,
      kind: "CONNECTION" as const,
      title: connection.connectionName
        ? `${connection.connectionName} joined their trusted Circle`
        : "A new verified connection joined their trusted Circle",
      description: connection.connectionBusinessName
        ? `Verified Circle Wallet connection · ${connection.connectionBusinessName}`
        : "Verified Circle Wallet connection",
      occurredAt: connection.verifiedAt,
      actorName: connection.connectionName ?? null
    })),
    ...input.verifiedTestimonials.map((testimonial) => ({
      id: `testimonial:${testimonial.id}`,
      kind: "TESTIMONIAL" as const,
      title: `${testimonial.reviewerName} left a verified trust signal`,
      description: testimonial.reviewerRoleOrCompany
        ? `Approved Wallet testimonial · ${testimonial.reviewerRoleOrCompany}`
        : "Approved Wallet testimonial",
      occurredAt: testimonial.verifiedAt,
      actorName: testimonial.reviewerName
    })),
    ...(input.owner.emailVerified
      ? [{
          id: "verification:email",
          kind: "VERIFICATION" as const,
          title: "Account email verified",
          description: "Confirmed by the Circle Card platform.",
          occurredAt: input.owner.emailVerified
        }]
      : []),
    ...(input.owner.foundingMember && input.owner.foundingClaimedAt
      ? [{
          id: "verification:founding-member",
          kind: "VERIFICATION" as const,
          title: "Founding member status recorded",
          description: "Early platform membership confirmed.",
          occurredAt: input.owner.foundingClaimedAt
        }]
      : []),
    ...(input.card.createdAt
      ? [{
          id: "profile:created",
          kind: "PROFILE" as const,
          title: "Circle Card profile created",
          description: "Professional trust profile started.",
          occurredAt: input.card.createdAt
        }]
      : [])
  ]
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
    .slice(0, 16);

  return {
    version: 1,
    score,
    summary,
    verifiedConnectionCount,
    verifiedTestimonialCount,
    manualTestimonialCount: Math.max(0, input.manualTestimonialCount),
    signals,
    availableSignals,
    latestVerifiedTestimonials: input.verifiedTestimonials.slice(0, 24),
    timeline
  };
}

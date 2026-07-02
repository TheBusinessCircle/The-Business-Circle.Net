export type CreatorStudioMode = "hidden" | "locked" | "enabled" | "preview";

export function resolveCreatorStudioMode(input: {
  cardType?: string | null;
  hasProAccess: boolean;
  isPlatformOwner?: boolean;
  platformPreviewCardType?: string | null;
}): CreatorStudioMode {
  if (input.cardType === "BUSINESS") return "hidden";
  if (input.cardType === "CREATOR") {
    return input.hasProAccess || input.isPlatformOwner ? "enabled" : "locked";
  }
  return input.isPlatformOwner && input.platformPreviewCardType === "creator"
    ? "preview"
    : "hidden";
}

export const CREATOR_PROFILE_COMPLETION_ITEM_IDS = [
  "creator-card",
  "profile-image",
  "creator-bio",
  "social-profile",
  "featured-link",
  "featured-content",
  "media-kit",
  "what-i-create",
  "audience-snapshot",
  "brand-partnership",
  "creator-offer",
  "press-proof",
  "community-route",
  "creator-trust"
] as const;

export type CreatorProfileCompletionItemId =
  (typeof CREATOR_PROFILE_COMPLETION_ITEM_IDS)[number];

export function calculateCreatorProfileCompletion(input: {
  creatorCardSelected: boolean;
  hasProfileImage: boolean;
  hasBio: boolean;
  activeSocialProfileCount: number;
  activeFeaturedLinkCount: number;
  hasFeaturedContent: boolean;
  hasMediaKit: boolean;
  hasWhatICreate: boolean;
  hasAudienceSnapshot: boolean;
  hasBrandPartnershipOrOpenToData: boolean;
  hasCreatorOffer: boolean;
  hasPressProof: boolean;
  hasWebsiteOrCommunityLink: boolean;
  creatorTrustSignalCount: number;
}) {
  const items: Array<{ id: CreatorProfileCompletionItemId; complete: boolean }> = [
    { id: "creator-card", complete: input.creatorCardSelected },
    { id: "profile-image", complete: input.hasProfileImage },
    { id: "creator-bio", complete: input.hasBio },
    { id: "social-profile", complete: input.activeSocialProfileCount > 0 },
    { id: "featured-link", complete: input.activeFeaturedLinkCount > 0 },
    { id: "featured-content", complete: input.hasFeaturedContent },
    { id: "media-kit", complete: input.hasMediaKit },
    { id: "what-i-create", complete: input.hasWhatICreate },
    { id: "audience-snapshot", complete: input.hasAudienceSnapshot },
    { id: "brand-partnership", complete: input.hasBrandPartnershipOrOpenToData },
    { id: "creator-offer", complete: input.hasCreatorOffer },
    { id: "press-proof", complete: input.hasPressProof },
    { id: "community-route", complete: input.hasWebsiteOrCommunityLink },
    { id: "creator-trust", complete: input.creatorTrustSignalCount > 0 }
  ];
  const completedCount = items.filter((item) => item.complete).length;

  return {
    score: Math.round((completedCount / items.length) * 100),
    completedCount,
    totalCount: items.length,
    items,
    nextIncompleteId: items.find((item) => !item.complete)?.id ?? null
  };
}

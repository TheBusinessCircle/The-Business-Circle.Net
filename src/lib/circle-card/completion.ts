export type CircleCardCompletionItemId =
  | "profile-photo"
  | "bio"
  | "location"
  | "business-name"
  | "featured-link"
  | "contact-details"
  | "social-profile"
  | "card-share";

export type CircleCardCompletionItem = {
  id: CircleCardCompletionItemId;
  label: string;
  complete: boolean;
  activationCritical: boolean;
};

export type CircleCardCompletionInput = {
  profileImageUrl?: string | null;
  fallbackProfileImageUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  businessName?: string | null;
  activeFeaturedLinkCount?: number | null;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  activeSocialProfileCount?: number | null;
  shareCount?: number | null;
};

export type CircleCardCompletionResult = {
  score: number;
  completedCount: number;
  totalCount: number;
  activationComplete: boolean;
  activationLeadScore: number;
  items: CircleCardCompletionItem[];
  missingItems: CircleCardCompletionItem[];
};

const COMPLETION_DEFINITIONS: Array<{
  id: CircleCardCompletionItemId;
  label: string;
  activationCritical: boolean;
}> = [
  { id: "profile-photo", label: "Add profile image", activationCritical: true },
  { id: "bio", label: "Add bio", activationCritical: false },
  { id: "location", label: "Add location", activationCritical: false },
  { id: "business-name", label: "Add business", activationCritical: true },
  { id: "featured-link", label: "Add first featured link", activationCritical: true },
  { id: "contact-details", label: "Add contact details", activationCritical: false },
  { id: "social-profile", label: "Add social profile", activationCritical: false },
  { id: "card-share", label: "Share your card", activationCritical: true }
];

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function hasCount(value?: number | null) {
  return typeof value === "number" && value > 0;
}

export function calculateCircleCardCompletion(
  input: CircleCardCompletionInput
): CircleCardCompletionResult {
  const completeById: Record<CircleCardCompletionItemId, boolean> = {
    "profile-photo": hasText(input.profileImageUrl) || hasText(input.fallbackProfileImageUrl),
    bio: hasText(input.bio),
    location: hasText(input.location),
    "business-name": hasText(input.businessName),
    "featured-link": hasCount(input.activeFeaturedLinkCount),
    "contact-details": hasText(input.email) || hasText(input.phone) || hasText(input.websiteUrl),
    "social-profile": hasCount(input.activeSocialProfileCount),
    "card-share": hasCount(input.shareCount)
  };

  const items = COMPLETION_DEFINITIONS.map((definition) => ({
    ...definition,
    complete: completeById[definition.id]
  }));
  const completedCount = items.filter((item) => item.complete).length;
  const activationCriticalItems = items.filter((item) => item.activationCritical);
  const activationComplete = activationCriticalItems.every((item) => item.complete);

  return {
    score: Math.round((completedCount / items.length) * 100),
    completedCount,
    totalCount: items.length,
    activationComplete,
    activationLeadScore: activationCriticalItems.filter((item) => item.complete).length * 25,
    items,
    missingItems: items.filter((item) => !item.complete)
  };
}

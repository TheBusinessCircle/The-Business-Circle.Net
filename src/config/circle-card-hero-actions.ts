export type CircleCardHeroReviewAction = {
  href: string;
  label: string;
};

// Approved bespoke actions are scoped to an exact card, never inferred from a
// featured-link label or applied to every card using the Business layout.
const BUSINESS_HERO_REVIEW_ACTIONS: Record<
  string,
  CircleCardHeroReviewAction & { websiteHostname: string }
> = {
  "precision-finish-plastering-rendering-ecb582748528": {
    websiteHostname: "precisionplasteringandrendering.co.uk",
    href: "https://g.page/r/Cb0gy5hYJ94-EAE/review",
    label: "Leave us a Google review"
  }
};

export function resolveCircleCardHeroReviewAction({
  slug,
  websiteUrl
}: {
  slug: string;
  websiteUrl: string | null;
}): CircleCardHeroReviewAction | null {
  const action = BUSINESS_HERO_REVIEW_ACTIONS[slug];
  if (!action || !websiteUrl) return null;

  try {
    const website = new URL(websiteUrl);
    if (
      !["https:", "http:"].includes(website.protocol) ||
      website.hostname.replace(/^www\./, "") !== action.websiteHostname
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return { href: action.href, label: action.label };
}

export type CircleCardHeroReviewAction = {
  href: string;
  label: string;
};

export type CircleCardBusinessExperience = {
  key: string;
  brandName: string;
  specialty: string;
  eyebrow: string;
  highlights: readonly string[];
  quoteHref: string;
  projectsHref: string;
  galleryHeading: string;
  galleryDescription: string;
  surfaceStyle: Record<`--${string}`, string>;
};

// Approved bespoke actions are scoped to an exact card, never inferred from a
// featured-link label or applied to every card using the Business layout.
const BUSINESS_HERO_REVIEW_ACTIONS: Record<
  string,
  CircleCardHeroReviewAction & {
    websiteHostname: string;
    experience?: CircleCardBusinessExperience;
  }
> = {
  "precision-finish-plastering-rendering-ecb582748528": {
    websiteHostname: "precisionplasteringandrendering.co.uk",
    href: "https://g.page/r/Cb0gy5hYJ94-EAE/review",
    label: "Leave us a Google review",
    experience: {
      key: "precision-finish",
      brandName: "Precision Finish",
      specialty: "Plastering & Rendering",
      eyebrow: "The detail makes the difference",
      highlights: ["Free quotes", "Indoor & exterior work", "Local Nottingham team"],
      quoteHref: "https://precisionplasteringandrendering.co.uk/#quote",
      projectsHref: "https://precisionplasteringandrendering.co.uk/projects/",
      galleryHeading: "See the finish for yourself",
      galleryDescription: "Explore the plastering, rendering and finishing details in our portfolio. Tap a photo for a closer look.",
      surfaceStyle: {
        "--cc-theme-page-bg": "radial-gradient(ellipse at 10% 0%,rgba(227,154,37,.13),transparent 42%),#0b100e",
        "--cc-theme-hero-bg": "linear-gradient(145deg,#20251f,#0c110f 70%)",
        "--cc-theme-section-bg": "#121915",
        "--cc-theme-card-bg": "#19211b",
        "--cc-theme-secondary-bg": "#151d17",
        "--cc-theme-secondary-hover-bg": "#222c23",
        "--cc-theme-link-bg": "#151d17",
        "--cc-theme-media-bg": "linear-gradient(145deg,#252c23,#0b100e)",
        "--cc-theme-trust-bg": "linear-gradient(145deg,#182019,#0d140f)",
        "--cc-theme-qr-bg": "linear-gradient(145deg,#182019,#0d140f)"
      }
    }
  }
};

function resolveApprovedBusinessActions({
  slug,
  websiteUrl
}: {
  slug: string;
  websiteUrl: string | null;
}) {
  if (!Object.prototype.hasOwnProperty.call(BUSINESS_HERO_REVIEW_ACTIONS, slug)) return null;
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

  return action;
}

export function resolveCircleCardHeroReviewAction(
  input: { slug: string; websiteUrl: string | null }
): CircleCardHeroReviewAction | null {
  const action = resolveApprovedBusinessActions(input);
  return action ? { href: action.href, label: action.label } : null;
}

export function resolveCircleCardBusinessExperience(
  input: { slug: string; websiteUrl: string | null }
): CircleCardBusinessExperience | null {
  return resolveApprovedBusinessActions(input)?.experience ?? null;
}

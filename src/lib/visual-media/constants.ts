import type {
  VisualMediaOverlayStyle,
  VisualMediaPage,
  VisualMediaVariant
} from "@prisma/client";
import type { VisualMediaPlacementDefinition } from "@/lib/visual-media/types";

type RegistryItem = VisualMediaPlacementDefinition & {
  defaultOverlayStyle?: VisualMediaOverlayStyle;
};

export const VISUAL_MEDIA_PLACEMENTS = {
  HOME_HERO_PRIMARY: {
    key: "home.hero.primary",
    label: "Homepage Hero Image",
    page: "HOME",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Primary cinematic image for the homepage hero. Keep it premium, dark, and editorial.",
    defaultOverlayStyle: "CINEMATIC"
  },
  HOME_SUPPORTING_STORY: {
    key: "home.section.story",
    label: "Homepage Story Section Image",
    page: "HOME",
    section: "story",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Supporting image for the homepage story or proof area. Use founder-led, trust-building business imagery.",
    defaultOverlayStyle: "SOFT_DARK"
  },
  MEMBERSHIP_HERO_PRIMARY: {
    key: "membership.hero.primary",
    label: "Membership Hero Image",
    page: "MEMBERSHIP",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Top-of-page membership image. Keep text readability in mind and avoid cluttered scenes.",
    defaultOverlayStyle: "DARK"
  },
  MEMBERSHIP_SECTION_INSIDE: {
    key: "membership.section.inside-circle",
    label: "Membership Inside The Circle Section Image",
    page: "MEMBERSHIP",
    section: "inside-circle",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Secondary membership image for inside-the-circle style sections or comparison storytelling.",
    defaultOverlayStyle: "SOFT_DARK"
  },
  JOIN_HERO_PRIMARY: {
    key: "join.hero.primary",
    label: "Join Page Hero Image",
    page: "JOIN",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Image for the join flow entry area. Use calm, premium scenes that support conversion rather than distract from it.",
    defaultOverlayStyle: "DARK"
  },
  ABOUT_HERO_PRIMARY: {
    key: "about.hero.primary",
    label: "About Page Hero Image",
    page: "ABOUT",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Brand-story hero image for the About page. Prioritise trust, founder leadership, and premium tone.",
    defaultOverlayStyle: "CINEMATIC"
  },
  COMMUNITY_HERO_PRIMARY: {
    key: "community.hero.primary",
    label: "Community Page Hero Image",
    page: "COMMUNITY",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Optional hero image for public community-facing entry points or previews.",
    defaultOverlayStyle: "DARK"
  },
  FOUNDER_HERO_PRIMARY: {
    key: "founder.hero.primary",
    label: "Founder Services Hero Image",
    page: "FOUNDER",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Hero image for founder services or growth architect style landing pages.",
    defaultOverlayStyle: "CINEMATIC"
  },
  RESOURCES_HERO_PRIMARY: {
    key: "resources.hero.primary",
    label: "Resources Index Hero Image",
    page: "RESOURCES",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Hero image for the public resource library entry, separate from individual resource card imagery.",
    defaultOverlayStyle: "SOFT_DARK"
  },
  INSIGHTS_HERO_PRIMARY: {
    key: "insights.hero.primary",
    label: "BCN Intelligence Index Hero Image",
    page: "INSIGHTS",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Hero image for the BCN Intelligence landing page or editorial index.",
    defaultOverlayStyle: "SOFT_DARK"
  }
} as const satisfies Record<string, RegistryItem>;

export type VisualMediaPlacementKey =
  (typeof VISUAL_MEDIA_PLACEMENTS)[keyof typeof VISUAL_MEDIA_PLACEMENTS]["key"];

export const VISUAL_MEDIA_PLACEMENT_LIST = Object.values(VISUAL_MEDIA_PLACEMENTS);

export const VISUAL_MEDIA_PLACEMENT_KEYS = VISUAL_MEDIA_PLACEMENT_LIST.map((item) => item.key);

export const VISUAL_MEDIA_PAGE_OPTIONS: readonly VisualMediaPage[] = [
  "HOME",
  "MEMBERSHIP",
  "JOIN",
  "ABOUT",
  "COMMUNITY",
  "FOUNDER",
  "RESOURCES",
  "INSIGHTS",
  "GLOBAL"
] as const;

export const VISUAL_MEDIA_VARIANT_OPTIONS: readonly VisualMediaVariant[] = [
  "HERO",
  "SECTION",
  "BACKGROUND",
  "INLINE",
  "CARD"
] as const;

export function isVisualMediaPlacementKey(value: string): value is VisualMediaPlacementKey {
  return VISUAL_MEDIA_PLACEMENT_KEYS.includes(value as VisualMediaPlacementKey);
}

export function getVisualMediaPlacementDefinition(key: VisualMediaPlacementKey) {
  return VISUAL_MEDIA_PLACEMENT_LIST.find((item) => item.key === key) ?? null;
}

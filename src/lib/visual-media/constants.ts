import type {
  VisualMediaOverlayStyle,
  VisualMediaPage
} from "@prisma/client";
import type { VisualMediaPlacementDefinition } from "@/lib/visual-media/types";

type RegistryItem = VisualMediaPlacementDefinition & {
  defaultOverlayStyle?: VisualMediaOverlayStyle;
};

export const VISUAL_MEDIA_PLACEMENTS = {
  HOME_HERO: {
    key: "home.hero",
    label: "Homepage Hero",
    page: "HOME",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Cinematic homepage hero image. Atmosphere first, readable text second, never generic stock energy.",
    defaultOverlayStyle: "CINEMATIC"
  },
  HOME_CONNECTION: {
    key: "home.section.connection",
    label: "Homepage Connection Section",
    page: "HOME",
    section: "connection",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "People-based image for trust, conversation, and meaningful founder interaction.",
    defaultOverlayStyle: "SOFT_DARK"
  },
  HOME_PLATFORM: {
    key: "home.section.platform",
    label: "Homepage Platform Section",
    page: "HOME",
    section: "platform",
    variant: "SECTION",
    sortOrder: 30,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Platform or ecosystem visual. Mockup-style imagery works well here if it feels premium and restrained.",
    defaultOverlayStyle: "SOFT_DARK"
  },
  JOIN_HERO: {
    key: "join.hero",
    label: "Join Page Hero",
    page: "JOIN",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Premium entry image for the join page. It should feel like stepping into a private room.",
    defaultOverlayStyle: "DARK"
  },
  JOIN_INSIDE: {
    key: "join.section.inside",
    label: "Join Page Inside Section",
    page: "JOIN",
    section: "inside",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Supporting image for what it feels like inside the platform once someone joins.",
    defaultOverlayStyle: "SOFT_DARK"
  },
  MEMBERSHIP_HERO: {
    key: "membership.hero",
    label: "Membership Hero",
    page: "MEMBERSHIP",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Hero image for room selection. Keep pricing and tier clarity readable above all else.",
    defaultOverlayStyle: "DARK"
  },
  MEMBERSHIP_ROOMS: {
    key: "membership.section.rooms",
    label: "Membership Rooms Section",
    page: "MEMBERSHIP",
    section: "rooms",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Supporting image for the room structure and tier progression section.",
    defaultOverlayStyle: "SOFT_DARK"
  },
  MEMBERSHIP_FOUNDERS: {
    key: "membership.section.founders",
    label: "Membership Founders Section",
    page: "MEMBERSHIP",
    section: "founders",
    variant: "SECTION",
    sortOrder: 30,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Founder allocation or first-mover image. It should feel exclusive, strategic, and controlled.",
    defaultOverlayStyle: "SOFT_DARK"
  },
  ABOUT_HERO: {
    key: "about.hero",
    label: "About Hero",
    page: "ABOUT",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Founder-led, serious brand image for the top of the About page.",
    defaultOverlayStyle: "CINEMATIC"
  },
  ABOUT_STORY: {
    key: "about.section.story",
    label: "About Story Section",
    page: "ABOUT",
    section: "story",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Human, intentional imagery for the mission, story, or philosophy section.",
    defaultOverlayStyle: "SOFT_DARK"
  },
  COMMUNITY_HERO: {
    key: "community.hero",
    label: "Community Hero",
    page: "COMMUNITY",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Serious, structured community hero image for the top community entry area.",
    defaultOverlayStyle: "DARK"
  },
  RESOURCES_HERO: {
    key: "resources.hero",
    label: "Resources Hero",
    page: "RESOURCES",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Hero image for the resources index page only. Do not use this for individual resource cards.",
    defaultOverlayStyle: "SOFT_DARK"
  },
  INTELLIGENCE_HERO: {
    key: "intelligence.hero",
    label: "BCN Intelligence Hero",
    page: "INSIGHTS",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Editorial hero image for the BCN Intelligence index page only.",
    defaultOverlayStyle: "SOFT_DARK"
  },
  SERVICES_HERO: {
    key: "services.hero",
    label: "Services Hero",
    page: "FOUNDER",
    section: "hero",
    variant: "HERO",
    sortOrder: 10,
    supportsMobile: true,
    recommendedAspectRatio: "16:10",
    adminHelperText:
      "Hero image for the public services or founder offer page.",
    defaultOverlayStyle: "CINEMATIC"
  },
  SERVICES_APPROACH: {
    key: "services.section.approach",
    label: "Services Approach Section",
    page: "FOUNDER",
    section: "approach",
    variant: "SECTION",
    sortOrder: 20,
    supportsMobile: true,
    recommendedAspectRatio: "4:5",
    adminHelperText:
      "Supporting image for the methodology, approach, or partnership explanation.",
    defaultOverlayStyle: "SOFT_DARK"
  }
} as const satisfies Record<string, RegistryItem>;

export type VisualMediaPlacementKey =
  (typeof VISUAL_MEDIA_PLACEMENTS)[keyof typeof VISUAL_MEDIA_PLACEMENTS]["key"];

export const VISUAL_MEDIA_PLACEMENT_LIST = Object.values(VISUAL_MEDIA_PLACEMENTS);

export const VISUAL_MEDIA_PLACEMENT_KEYS = VISUAL_MEDIA_PLACEMENT_LIST.map((item) => item.key);

export const VISUAL_MEDIA_PAGE_LABELS: Record<VisualMediaPage, string> = {
  HOME: "Home",
  MEMBERSHIP: "Membership",
  JOIN: "Join",
  ABOUT: "About",
  COMMUNITY: "Community",
  FOUNDER: "Services",
  RESOURCES: "Resources",
  INSIGHTS: "BCN Intelligence",
  GLOBAL: "Global"
};

export const VISUAL_MEDIA_PAGE_ORDER: readonly VisualMediaPage[] = [
  "HOME",
  "JOIN",
  "MEMBERSHIP",
  "ABOUT",
  "COMMUNITY",
  "RESOURCES",
  "INSIGHTS",
  "FOUNDER"
] as const;

export const VISUAL_MEDIA_LEGACY_KEY_MAP: Partial<
  Record<string, VisualMediaPlacementKey>
> = {
  "home.hero.primary": "home.hero",
  "home.section.story": "home.section.connection",
  "membership.hero.primary": "membership.hero",
  "membership.section.inside-circle": "membership.section.rooms",
  "join.hero.primary": "join.hero",
  "about.hero.primary": "about.hero",
  "community.hero.primary": "community.hero",
  "founder.hero.primary": "services.hero",
  "resources.hero.primary": "resources.hero",
  "insights.hero.primary": "intelligence.hero"
};

export function isVisualMediaPlacementKey(value: string): value is VisualMediaPlacementKey {
  return VISUAL_MEDIA_PLACEMENT_KEYS.includes(value as VisualMediaPlacementKey);
}

export function getVisualMediaPlacementDefinition(key: VisualMediaPlacementKey) {
  return VISUAL_MEDIA_PLACEMENT_LIST.find((item) => item.key === key) ?? null;
}

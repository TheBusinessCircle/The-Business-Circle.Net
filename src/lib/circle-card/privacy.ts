import type { Prisma } from "@prisma/client";

export const CIRCLE_CARD_DISCOVER_HIDDEN_LABEL = "Hidden from Discover";
export const CIRCLE_CARD_DISCOVER_VISIBLE_LABEL = "Visible on Discover";
export const CIRCLE_CARD_DISCOVER_SETTING_COPY =
  "Your public card still works when shared. This only controls whether people can find you in Discover.";

export const CIRCLE_CARD_DISCOVER_VISIBLE_WHERE = {
  isPublished: true,
  showInDiscover: true,
  archivedAt: null
} satisfies Prisma.CircleCardWhereInput;

export const CIRCLE_CARD_PRIVACY_CONTROL_MAP = {
  showName: {
    label: "Show name",
    field: "fullName",
    status: "future"
  },
  showCompany: {
    label: "Show company",
    field: "businessName",
    status: "future"
  },
  showBio: {
    label: "Show bio",
    field: "about",
    status: "future"
  },
  showLocation: {
    label: "Show location",
    field: "location",
    status: "future"
  },
  showLinks: {
    label: "Show links",
    field: "customLinks",
    status: "future"
  },
  showContactMethods: {
    label: "Show contact methods",
    field: "email_phone",
    status: "future"
  }
} as const;

export type CircleCardPrivacyControlKey = keyof typeof CIRCLE_CARD_PRIVACY_CONTROL_MAP;

export function isCircleCardDiscoverVisible(input: {
  isPublished?: boolean | null;
  showInDiscover?: boolean | null;
}) {
  return Boolean(input.isPublished && input.showInDiscover);
}

export function buildCircleCardDiscoverVisibilityData(input: {
  showInDiscover: boolean;
  previousShowInDiscover?: boolean | null;
  previousDiscoverOptedInAt?: Date | null;
}) {
  if (!input.showInDiscover) {
    return {
      showInDiscover: false,
      discoverOptedInAt: null
    };
  }

  return {
    showInDiscover: true,
    discoverOptedInAt:
      input.previousShowInDiscover && input.previousDiscoverOptedInAt
        ? input.previousDiscoverOptedInAt
        : new Date()
  };
}

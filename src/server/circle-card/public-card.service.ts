import "server-only";
import type {
  CircleCardAccountType,
  CircleCardProfileLayout,
  CircleCardType,
  MembershipTier,
  Prisma,
  Role
} from "@prisma/client";
import { SITE_CONFIG } from "@/config/site";
import {
  readCircleCardSocialLinks,
  type CircleCardCustomLinkIcon,
  type CircleCardLinkVisibility,
  type CircleCardLinkType,
  type CircleCardSocialLinks
} from "@/lib/circle-card/schema";
import { hasEntitledSubscription } from "@/lib/membership/access";
import { prisma } from "@/lib/prisma";
import { resolvePublicUploadImageUrl } from "@/server/circle-card/public-upload-image-url";

export type PublicCircleCardLink = {
  id: string;
  type: CircleCardLinkType;
  actionMode: string;
  visibility: CircleCardLinkVisibility;
  label: string;
  url: string | null;
  description: string | null;
  icon: CircleCardCustomLinkIcon | null;
  imageUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  buttonText: string | null;
  expiresAt: Date | null;
  accessCodeHint: string | null;
  hasAccessCode: boolean;
  sortOrder: number;
};

export type PublicCircleCardRecommendation = {
  id: string;
  category: string;
  reason: string | null;
  createdAt: Date;
  recommenderCard: {
    slug: string;
    fullName: string;
    businessName: string | null;
    role: string | null;
  };
};

export type PublicCircleCardSwitcherItem = {
  id: string;
  slug: string;
  cardType: CircleCardType;
  fullName: string;
  businessName: string | null;
  tagline: string | null;
  profileImageUrl: string | null;
  displayOrder: number;
  isDefaultCard: boolean;
};

export type PublicCircleCard = {
  id: string;
  userId: string;
  slug: string;
  cardType: CircleCardType;
  displayOrder: number;
  isDefaultCard: boolean;
  fullName: string;
  businessName: string | null;
  accountType: CircleCardAccountType | null;
  identityTags: string[];
  profileLayout: CircleCardProfileLayout;
  role: string | null;
  tagline: string | null;
  about: string | null;
  profileImageUrl: string | null;
  businessLogoUrl: string | null;
  profileImagePositionX: number | null;
  profileImagePositionY: number | null;
  profileImageScale: number | null;
  businessLogoPositionX: number | null;
  businessLogoPositionY: number | null;
  businessLogoScale: number | null;
  themePrimaryColor: string | null;
  themeAccentColor: string | null;
  themeButtonColor: string | null;
  themeSurfaceStyle: string;
  themePreset: string | null;
  themeMetadata: Prisma.JsonValue;
  websiteUrl: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  socialLinks: CircleCardSocialLinks;
  customLinks: PublicCircleCardLink[];
  ownerCards: PublicCircleCardSwitcherItem[];
  recommendations: PublicCircleCardRecommendation[];
  successfulReferralCount: number;
  viewCount: number;
  isDemo: boolean;
  user: {
    role: Role;
    membershipTier: MembershipTier;
    foundingTier: MembershipTier | null;
    hasActiveSubscription: boolean;
  };
};

export const DEMO_CIRCLE_CARD: PublicCircleCard = {
  id: "demo",
  userId: "demo",
  slug: "demo",
  cardType: "PERSONAL",
  displayOrder: 0,
  isDefaultCard: true,
  fullName: "Trev Clarke",
  businessName: "The Business Circle",
  accountType: "FOUNDER",
  identityTags: ["community-builder"],
  profileLayout: "BUSINESS",
  role: "Founder",
  tagline: "Founder-led rooms for better business relationships.",
  about:
    "Circle Card gives professionals a clean identity layer for the people they meet, the details they need to share, and the relationships worth returning to later.",
  profileImageUrl: "/branding/the-business-circle-logo.png",
  businessLogoUrl: "/branding/circle-card-logo.png",
  profileImagePositionX: 50,
  profileImagePositionY: 50,
  profileImageScale: 1,
  businessLogoPositionX: 50,
  businessLogoPositionY: 50,
  businessLogoScale: 1,
  themePrimaryColor: null,
  themeAccentColor: null,
  themeButtonColor: null,
  themeSurfaceStyle: "PREMIUM",
  themePreset: null,
  themeMetadata: {},
  websiteUrl: "https://thebusinesscircle.net",
  email: SITE_CONFIG.supportEmail,
  phone: null,
  location: "United Kingdom",
  socialLinks: readCircleCardSocialLinks({
    linkedin: SITE_CONFIG.social.linkedin,
    tiktok: SITE_CONFIG.social.tiktok,
    instagram: SITE_CONFIG.social.instagram,
    facebook: SITE_CONFIG.social.facebook,
    youtube: SITE_CONFIG.social.youtube
  } as Prisma.JsonObject),
  customLinks: [
    {
      id: "demo-book-call",
      type: "BOOK_CALL",
      actionMode: "AUTO",
      visibility: "PUBLIC",
      label: "Book a call",
      url: "https://thebusinesscircle.net/contact",
      description: "Start a founder-led conversation",
      icon: "calendar",
      imageUrl: null,
      fileUrl: null,
      fileName: null,
      fileMimeType: null,
      buttonText: null,
      expiresAt: null,
      accessCodeHint: null,
      hasAccessCode: false,
      sortOrder: 0
    },
    {
      id: "demo-latest-offer",
      type: "LATEST_OFFER",
      actionMode: "AUTO",
      visibility: "PUBLIC",
      label: "Latest offer",
      url: "https://thebusinesscircle.net/membership",
      description: "Explore current BCN membership access",
      icon: "offer",
      imageUrl: null,
      fileUrl: null,
      fileName: null,
      fileMimeType: null,
      buttonText: null,
      expiresAt: null,
      accessCodeHint: null,
      hasAccessCode: false,
      sortOrder: 1
    }
  ],
  ownerCards: [],
  recommendations: [],
  successfulReferralCount: 0,
  viewCount: 0,
  isDemo: true,
  user: {
    role: "ADMIN",
    membershipTier: "CORE",
    foundingTier: "CORE",
    hasActiveSubscription: true
  }
};

export async function getPublicCircleCard(slug: string): Promise<PublicCircleCard | null> {
  if (slug === "demo") {
    return DEMO_CIRCLE_CARD;
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      slug,
      isPublished: true,
      archivedAt: null,
      user: {
        suspended: false
      }
    },
    select: {
      id: true,
      userId: true,
      slug: true,
      cardType: true,
      displayOrder: true,
      isDefaultCard: true,
      fullName: true,
      businessName: true,
      accountType: true,
      identityTags: true,
      profileLayout: true,
      role: true,
      tagline: true,
      about: true,
      profileImageUrl: true,
      businessLogoUrl: true,
      profileImagePositionX: true,
      profileImagePositionY: true,
      profileImageScale: true,
      businessLogoPositionX: true,
      businessLogoPositionY: true,
      businessLogoScale: true,
      themePrimaryColor: true,
      themeAccentColor: true,
      themeButtonColor: true,
      themeSurfaceStyle: true,
      themePreset: true,
      themeMetadata: true,
      websiteUrl: true,
      email: true,
      phone: true,
      location: true,
      socialLinks: true,
      customLinks: {
        where: {
          isActive: true
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          type: true,
          actionMode: true,
          visibility: true,
          label: true,
          url: true,
          description: true,
          icon: true,
          imageUrl: true,
          fileUrl: true,
          fileName: true,
          fileMimeType: true,
          buttonText: true,
          expiresAt: true,
          accessCodeHint: true,
          accessCodeHash: true,
          sortOrder: true
        }
      },
      recommendationsReceived: {
        where: {
          visibility: "PUBLIC",
          status: "ACTIVE",
          recommenderCard: {
            isPublished: true,
            user: {
              suspended: false
            }
          }
        },
        orderBy: [{ createdAt: "desc" }],
        take: 12,
        select: {
          id: true,
          category: true,
          reason: true,
          createdAt: true,
          recommenderCard: {
            select: {
              slug: true,
              fullName: true,
              businessName: true,
              role: true
            }
          }
        }
      },
      _count: {
        select: {
          referralsReceived: {
            where: {
              visibility: "PUBLIC_SUCCESS",
              status: "WON"
            }
          }
        }
      },
      viewCount: true,
      user: {
        select: {
          role: true,
          membershipTier: true,
          foundingTier: true,
          subscription: {
            select: {
              status: true
            }
          }
        }
      }
    }
  });

  if (!card) {
    return null;
  }

  const ownerCards = await prisma.circleCard.findMany({
    where: {
      userId: card.userId,
      isPublished: true,
      archivedAt: null,
      user: {
        suspended: false
      }
    },
    orderBy: [{ displayOrder: "asc" }, { isDefaultCard: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      cardType: true,
      fullName: true,
      businessName: true,
      tagline: true,
      profileImageUrl: true,
      displayOrder: true,
      isDefaultCard: true
    }
  });

  const customLinks = await Promise.all(
    card.customLinks.map(async (link) => {
      const { accessCodeHash, ...publicLink } = link;
      const visibility = (link.visibility || "PUBLIC") as CircleCardLinkVisibility;
      const isPrivate = visibility === "PRIVATE_CODE";
      const imageUrl = isPrivate
        ? null
        : await resolvePublicUploadImageUrl(link.imageUrl, SITE_CONFIG.url);

      return {
        ...publicLink,
        type: (link.type || "GENERAL") as CircleCardLinkType,
        visibility,
        url: isPrivate ? null : link.url,
        imageUrl,
        fileUrl: isPrivate ? null : link.fileUrl,
        accessCodeHint: isPrivate ? link.accessCodeHint : null,
        hasAccessCode: Boolean(accessCodeHash),
        icon: link.icon as CircleCardCustomLinkIcon | null
      };
    })
  );

  return {
    ...card,
    user: {
      role: card.user.role,
      membershipTier: card.user.membershipTier,
      foundingTier: card.user.foundingTier,
      hasActiveSubscription:
        card.user.role === "ADMIN"
          ? true
          : hasEntitledSubscription(card.user.subscription?.status ?? null)
    },
    socialLinks: readCircleCardSocialLinks(card.socialLinks as Prisma.JsonValue),
    recommendations: card.recommendationsReceived,
    successfulReferralCount: card._count.referralsReceived,
    ownerCards,
    customLinks,
    isDemo: false
  };
}

function escapeVCardValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function fileSafeName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "circle-card"
  );
}

export function buildCircleCardVCard(card: PublicCircleCard) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(card.fullName)}`,
    `N:${escapeVCardValue(card.fullName)};;;;`
  ];

  if (card.businessName) {
    lines.push(`ORG:${escapeVCardValue(card.businessName)}`);
  }

  if (card.role) {
    lines.push(`TITLE:${escapeVCardValue(card.role)}`);
  }

  if (card.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(card.email)}`);
  }

  if (card.phone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCardValue(card.phone)}`);
  }

  if (card.websiteUrl) {
    lines.push(`URL:${escapeVCardValue(card.websiteUrl)}`);
  }

  if (card.location) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(card.location)};;;;`);
  }

  lines.push("END:VCARD");

  return `${lines.join("\r\n")}\r\n`;
}

export function circleCardVCardFilename(card: PublicCircleCard) {
  return `${fileSafeName(card.fullName)}-circle-card.vcf`;
}

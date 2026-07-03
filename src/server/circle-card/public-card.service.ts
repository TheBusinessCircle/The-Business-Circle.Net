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
  visibleCircleCardBookingEnquiry,
  visibleCircleCardBrandPartnerships,
  visibleCircleCardCreatorOffers,
  visibleCircleCardPressProofItems,
  visibleCircleCardAudienceSnapshot,
  visibleCircleCardDocumentItems,
  visibleCircleCardFeaturedContentItems,
  visibleCircleCardGalleryItems,
  visibleCircleCardMenuOfferItems,
  visibleCircleCardMediaKit,
  visibleCircleCardOpeningHours,
  visibleCircleCardProductItems,
  visibleCircleCardPriceListItems,
  visibleCircleCardReviewItems,
  visibleCircleCardServices,
  type CircleCardBookingEnquiry,
  type CircleCardBrandPartnership,
  type CircleCardCreatorOffer,
  type CircleCardPressProofItem,
  type CircleCardAudienceSnapshot,
  type CircleCardDocumentItem,
  type CircleCardFeaturedContentItem,
  type CircleCardGalleryItem,
  type CircleCardMenuOfferItem,
  type CircleCardMediaKit,
  type CircleCardOpeningHours,
  type CircleCardProductItem,
  type CircleCardPriceListItem,
  type CircleCardReviewItem,
  type CircleCardServiceItem
} from "@/lib/circle-card/content-blocks";
import {
  isSafeCircleCardExternalUrl,
  isSafeCircleCardLinkDestination,
  readCircleCardSocialLinks,
  type CircleCardCustomLinkIcon,
  type CircleCardLinkVisibility,
  type CircleCardLinkType,
  type CircleCardSocialLinks
} from "@/lib/circle-card/schema";
import {
  buildCircleTrustSummary,
  type CircleTrustSummary,
  type CircleTrustTestimonial
} from "@/lib/circle-card/circle-trust";
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
  createdAt: Date;
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
  services: CircleCardServiceItem[];
  products: CircleCardProductItem[];
  priceItems: CircleCardPriceListItem[];
  menuOfferItems: CircleCardMenuOfferItem[];
  mediaKit: CircleCardMediaKit | null;
  documents: CircleCardDocumentItem[];
  featuredContentItems: CircleCardFeaturedContentItem[];
  bookingEnquiry: CircleCardBookingEnquiry | null;
  brandPartnerships: CircleCardBrandPartnership[];
  creatorOffers: CircleCardCreatorOffer[];
  pressProofItems: CircleCardPressProofItem[];
  audienceSnapshot: CircleCardAudienceSnapshot | null;
  galleryItems: CircleCardGalleryItem[];
  reviews: CircleCardReviewItem[];
  approvedWalletTestimonialCount: number;
  averageWalletTestimonialRating: number | null;
  trustScore: number;
  trust: CircleTrustSummary;
  openingHours: CircleCardOpeningHours | null;
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
  createdAt: new Date("2026-06-01T09:00:00.000Z"),
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
  services: [],
  products: [],
  priceItems: [],
  menuOfferItems: [],
  mediaKit: null,
  documents: [],
  featuredContentItems: [],
  bookingEnquiry: null,
  brandPartnerships: [],
  creatorOffers: [],
  pressProofItems: [],
  audienceSnapshot: null,
  galleryItems: [],
  reviews: [],
  approvedWalletTestimonialCount: 0,
  averageWalletTestimonialRating: null,
  trustScore: 0,
  trust: {
    version: 1,
    score: 0,
    summary: "Build Circle Trust through verified relationships and completed platform trust signals.",
    verifiedConnectionCount: 0,
    verifiedTestimonialCount: 0,
    manualTestimonialCount: 0,
    signals: [],
    availableSignals: [],
    latestVerifiedTestimonials: [],
    timeline: []
  },
  openingHours: null,
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
      createdAt: true,
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
      contentBlocks: true,
      isPublished: true,
      archivedAt: true,
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
      walletTestimonialsReceived: {
        where: { status: "APPROVED" },
        orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
        take: 24,
        select: {
          id: true,
          reviewerName: true,
          reviewerRoleOrCompany: true,
          testimonialText: true,
          rating: true,
          relationship: true,
          walletVerifiedAt: true,
          reviewerUser: {
            select: { image: true }
          }
        }
      },
      connectionRequestsSent: {
        where: { status: "ACCEPTED" },
        orderBy: [{ respondedAt: "desc" }, { createdAt: "desc" }],
        take: 12,
        select: {
          id: true,
          createdAt: true,
          respondedAt: true
        }
      },
      connectionRequestsReceived: {
        where: { status: "ACCEPTED" },
        orderBy: [{ respondedAt: "desc" }, { createdAt: "desc" }],
        take: 12,
        select: {
          id: true,
          createdAt: true,
          respondedAt: true
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
          connectionRequestsSent: {
            where: { status: "ACCEPTED" }
          },
          connectionRequestsReceived: {
            where: { status: "ACCEPTED" }
          },
          referralsReceived: {
            where: {
              visibility: "PUBLIC_SUCCESS",
              status: "WON"
            }
          },
          activities: true,
          events: true
        }
      },
      viewCount: true,
      user: {
        select: {
          role: true,
          membershipTier: true,
          foundingTier: true,
          foundingMember: true,
          foundingClaimedAt: true,
          emailVerified: true,
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

  const rawOwnerCards = await prisma.circleCard.findMany({
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

  const ownerCards = await Promise.all(
    rawOwnerCards.map(async (ownerCard) => ({
      ...ownerCard,
      profileImageUrl: await resolvePublicUploadImageUrl(ownerCard.profileImageUrl, SITE_CONFIG.url)
    }))
  );

  const customLinks = (await Promise.all(
    card.customLinks.map(async (link) => {
      const { accessCodeHash, ...publicLink } = link;
      const visibility = (link.visibility || "PUBLIC") as CircleCardLinkVisibility;
      const isPrivate = visibility === "PRIVATE_CODE";
      const safeUrl = isSafeCircleCardExternalUrl(link.url) ? link.url : null;
      const safeFileUrl = isSafeCircleCardLinkDestination(link.fileUrl) ? link.fileUrl : null;

      if (!safeUrl && !safeFileUrl) {
        return null;
      }

      const imageUrl = isPrivate
        ? null
        : await resolvePublicUploadImageUrl(link.imageUrl, SITE_CONFIG.url);

      return {
        ...publicLink,
        type: (link.type || "GENERAL") as CircleCardLinkType,
        visibility,
        url: isPrivate ? null : safeUrl,
        imageUrl,
        fileUrl: isPrivate ? null : safeFileUrl,
        accessCodeHint: isPrivate ? link.accessCodeHint : null,
        hasAccessCode: Boolean(accessCodeHash),
        icon: link.icon as CircleCardCustomLinkIcon | null
      };
    })
  )).filter((link): link is NonNullable<typeof link> => Boolean(link));
  const services = await Promise.all(
    visibleCircleCardServices({
      cardType: card.cardType,
      contentBlocks: card.contentBlocks
    }).map(async (service) => ({
      ...service,
      imageUrl: await resolvePublicUploadImageUrl(service.imageUrl, SITE_CONFIG.url)
    }))
  );
  const products = await Promise.all(
    visibleCircleCardProductItems({
      cardType: card.cardType,
      contentBlocks: card.contentBlocks
    }).map(async (product) => ({
      ...product,
      imageUrl: await resolvePublicUploadImageUrl(product.imageUrl, SITE_CONFIG.url)
    }))
  );
  const priceItems = visibleCircleCardPriceListItems({
    cardType: card.cardType,
    contentBlocks: card.contentBlocks
  });
  const menuOfferItems = await Promise.all(
    visibleCircleCardMenuOfferItems({
      cardType: card.cardType,
      contentBlocks: card.contentBlocks
    }).map(async (item) => ({
      ...item,
      imageUrl: await resolvePublicUploadImageUrl(item.imageUrl, SITE_CONFIG.url)
    }))
  );
  const mediaKit = visibleCircleCardMediaKit({
    cardType: card.cardType,
    contentBlocks: card.contentBlocks
  });
  const documents = visibleCircleCardDocumentItems({
    cardType: card.cardType,
    contentBlocks: card.contentBlocks
  });
  const featuredContentItems = await Promise.all(
    visibleCircleCardFeaturedContentItems({
      cardType: card.cardType,
      contentBlocks: card.contentBlocks
    }).map(async (item) => ({
      ...item,
      thumbnailUrl: await resolvePublicUploadImageUrl(item.thumbnailUrl, SITE_CONFIG.url)
    }))
  );
  const brandPartnerships = await Promise.all(
    visibleCircleCardBrandPartnerships({
      cardType: card.cardType,
      contentBlocks: card.contentBlocks
    }).map(async (item) => ({
      ...item,
      brandLogo: await resolvePublicUploadImageUrl(item.brandLogo, SITE_CONFIG.url)
    }))
  );
  const creatorOffers = (
    await Promise.all(
      visibleCircleCardCreatorOffers({
        cardType: card.cardType,
        contentBlocks: card.contentBlocks
      }).map(async (item) => {
        const image = await resolvePublicUploadImageUrl(item.image, SITE_CONFIG.url);
        return image ? { ...item, image } : null;
      })
    )
  ).filter((item): item is CircleCardCreatorOffer => Boolean(item));
  const pressProofItems = (
    await Promise.all(
      visibleCircleCardPressProofItems({
        cardType: card.cardType,
        contentBlocks: card.contentBlocks
      }).map(async (item) => {
        const image = await resolvePublicUploadImageUrl(item.image, SITE_CONFIG.url);
        return image ? { ...item, image } : null;
      })
    )
  ).filter((item): item is CircleCardPressProofItem => Boolean(item));
  const bookingEnquiry = visibleCircleCardBookingEnquiry({
    cardType: card.cardType,
    contentBlocks: card.contentBlocks
  });
  const audienceSnapshot = visibleCircleCardAudienceSnapshot({
    cardType: card.cardType,
    contentBlocks: card.contentBlocks
  });
  const galleryItems = (
    await Promise.all(
      visibleCircleCardGalleryItems({
        cardType: card.cardType,
        contentBlocks: card.contentBlocks
      }).map(async (item) => {
        const imageUrl = await resolvePublicUploadImageUrl(item.imageUrl, SITE_CONFIG.url);
        return imageUrl ? { ...item, imageUrl } : null;
      })
    )
  ).filter((item): item is CircleCardGalleryItem => Boolean(item));
  const openingHours = visibleCircleCardOpeningHours({
    cardType: card.cardType,
    contentBlocks: card.contentBlocks
  });
  const manualReviews = visibleCircleCardReviewItems({
    cardType: card.cardType,
    contentBlocks: card.contentBlocks
  });
  const walletReviews: CircleCardReviewItem[] = card.walletTestimonialsReceived.map(
    (testimonial, index) => ({
      id: `wallet-${testimonial.id}`,
      reviewerName: testimonial.reviewerName,
      reviewerRoleOrCompany: testimonial.reviewerRoleOrCompany,
      reviewText: testimonial.testimonialText,
      rating: testimonial.rating,
      source: null,
      sourceUrl: null,
      isActive: true,
      sortOrder: manualReviews.length + index,
      verifiedConnection: Boolean(testimonial.walletVerifiedAt),
      relationship: testimonial.relationship
    })
  );
  const reviews = [...manualReviews, ...walletReviews];
  const approvedWalletTestimonialCount = walletReviews.length;
  const walletRatings = walletReviews
    .map((review) => review.rating)
    .filter((rating): rating is number => typeof rating === "number");
  const averageWalletTestimonialRating = walletRatings.length
    ? Math.round((walletRatings.reduce((total, rating) => total + rating, 0) / walletRatings.length) * 10) / 10
    : null;
  const verifiedTestimonials: CircleTrustTestimonial[] = card.walletTestimonialsReceived.map(
    (testimonial) => ({
      id: testimonial.id,
      reviewerName: testimonial.reviewerName,
      reviewerImageUrl: testimonial.reviewerUser.image,
      reviewerRoleOrCompany: testimonial.reviewerRoleOrCompany,
      testimonialText: testimonial.testimonialText,
      rating: testimonial.rating,
      relationship: testimonial.relationship,
      verifiedAt: testimonial.walletVerifiedAt
    })
  );
  const hasActiveSubscription =
    card.user.role === "ADMIN"
      ? true
      : hasEntitledSubscription(card.user.subscription?.status ?? null);
  const verifiedConnectionEvents = [
    ...card.connectionRequestsSent.map((connection) => ({
      id: connection.id,
      connectionName: null,
      connectionBusinessName: null,
      verifiedAt: connection.respondedAt ?? connection.createdAt
    })),
    ...card.connectionRequestsReceived.map((connection) => ({
      id: connection.id,
      connectionName: null,
      connectionBusinessName: null,
      verifiedAt: connection.respondedAt ?? connection.createdAt
    }))
  ];
  const trust = buildCircleTrustSummary({
    card: {
      fullName: card.fullName,
      businessName: card.businessName,
      role: card.role,
      tagline: card.tagline,
      about: card.about,
      profileImageUrl: card.profileImageUrl,
      businessLogoUrl: card.businessLogoUrl,
      websiteUrl: card.websiteUrl,
      email: card.email,
      phone: card.phone,
      location: card.location,
      isPublished: card.isPublished,
      archivedAt: card.archivedAt,
      createdAt: card.createdAt,
      hasHistoricalActivity:
        card.viewCount > 0 || card._count.activities > 0 || card._count.events > 0
    },
    owner: {
      role: card.user.role,
      emailVerified: card.user.emailVerified,
      foundingMember: card.user.foundingMember,
      foundingClaimedAt: card.user.foundingClaimedAt,
      hasActiveSubscription
    },
    verifiedConnectionCount:
      card._count.connectionRequestsSent + card._count.connectionRequestsReceived,
    verifiedConnectionEvents,
    verifiedTestimonials,
    manualTestimonialCount: manualReviews.length
  });
  const trustScore = trust.score;
  const {
    contentBlocks,
    walletTestimonialsReceived,
    connectionRequestsSent,
    connectionRequestsReceived,
    ...publicCard
  } = card;
  void contentBlocks;
  void walletTestimonialsReceived;
  void connectionRequestsSent;
  void connectionRequestsReceived;
  const [profileImageUrl, businessLogoUrl] = await Promise.all([
    resolvePublicUploadImageUrl(card.profileImageUrl, SITE_CONFIG.url),
    resolvePublicUploadImageUrl(card.businessLogoUrl, SITE_CONFIG.url)
  ]);

  return {
    ...publicCard,
    profileImageUrl,
    businessLogoUrl,
    user: {
      role: card.user.role,
      membershipTier: card.user.membershipTier,
      foundingTier: card.user.foundingTier,
      hasActiveSubscription
    },
    socialLinks: readCircleCardSocialLinks(card.socialLinks as Prisma.JsonValue),
    services,
    products,
    priceItems,
    menuOfferItems,
    mediaKit,
    documents,
    featuredContentItems,
    brandPartnerships,
    creatorOffers,
    pressProofItems,
    bookingEnquiry,
    audienceSnapshot,
    galleryItems,
    reviews,
    approvedWalletTestimonialCount,
    averageWalletTestimonialRating,
    trustScore,
    trust,
    openingHours,
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

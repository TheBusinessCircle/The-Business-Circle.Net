"use server";

import { randomBytes } from "node:crypto";
import type { MembershipTier, Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { safeRedirectPath } from "@/lib/auth/utils";
import type { CircleCardEventTypeValue } from "@/lib/circle-card/analytics-events";
import {
  buildCircleCardSlugBase,
  buildCircleCardSocialLinks,
  buildCircleCardSocialLinksJson,
  buildCircleWalletBusinessCardSocialLinks,
  CIRCLE_CARD_FILE_LINK_TYPES,
  CIRCLE_CARD_LINK_TYPES,
  CIRCLE_CARD_SOCIAL_FIELDS,
  type CircleCardSocialLink,
  type CircleCardSocialPlatform,
  circleCardConnectionRequestFormSchema,
  circleCardConnectionRequestIdSchema,
  circleCardIdentityFormSchema,
  type CircleCardLinkActionMode,
  type CircleCardLinkVisibility,
  type CircleCardLinkType,
  circleCardLinkFormSchema,
  circleCardLinkIdSchema,
  circleCardLinkMoveSchema,
  circleCardFormSchema,
  circleCardOnboardingSchema,
  circleWalletBusinessCardContactSchema,
  circleWalletContactDetailsSchema,
  circleWalletContactIdSchema,
  circleWalletMatchedCardActionSchema,
  nullableNumber,
  nullableText,
  normalizeCircleCardEmail,
  normalizeCircleCardUrl,
  normalizeWebsiteDomain,
  parseCircleWalletDateInput,
  parseCircleWalletTagsInput,
  readCircleCardSocialLinks,
  resolveCircleCardLookupSlug,
  resolveCircleWalletLastInteractionDate
} from "@/lib/circle-card/schema";
import { DEFAULT_CIRCLE_CARD_PROFILE_LAYOUT } from "@/lib/circle-card/profile-layout";
import {
  circleCardWalletTestimonialModerationSchema,
  circleCardWalletTestimonialSubmitSchema,
  type CircleCardWalletTestimonialStatus
} from "@/lib/circle-card/wallet-testimonials";
import {
  CIRCLE_CARD_GALLERY_PRO_LIMIT,
  CIRCLE_CARD_PRODUCT_PRO_LIMIT,
  CIRCLE_CARD_REVIEW_PRO_LIMIT,
  CIRCLE_CARD_SERVICE_LIMIT,
  CIRCLE_CARD_WEEKDAYS,
  circleCardGalleryItemFormSchema,
  circleCardGalleryItemIdSchema,
  circleCardReviewItemFormSchema,
  circleCardReviewItemIdSchema,
  circleCardOpeningHoursFormSchema,
  circleCardOpeningHoursPresetSchema,
  circleCardProductItemFormSchema,
  circleCardProductItemIdSchema,
  circleCardServiceFormSchema,
  circleCardServiceIdSchema,
  createCircleCardOpeningHoursPreset,
  createEmptyCircleCardContentBlocks,
  readCircleCardGalleryItems,
  readCircleCardOpeningHours,
  readCircleCardProductItems,
  readCircleCardReviewItems,
  readCircleCardServices,
  writeCircleCardGalleryItems,
  writeCircleCardOpeningHours,
  writeCircleCardProductItems,
  type CircleCardGalleryItem,
  type CircleCardOpeningHours,
  type CircleCardProductItem,
  type CircleCardReviewItem,
  writeCircleCardReviewItems,
  writeCircleCardServices
} from "@/lib/circle-card/content-blocks";
import {
  buildCircleCardThemeMetadata,
  buildCircleCardThemeStorage
} from "@/lib/circle-card/theme";
import { buildCircleCardDiscoverVisibilityData } from "@/lib/circle-card/privacy";
import {
  circleCardRecommendationFormSchema,
  circleCardRecommendationStatusSchema,
  circleCardRecommendationVisibilityLabel
} from "@/lib/circle-card/recommendations";
import {
  CIRCLE_CARD_INTRODUCTION_ACTIVE_STATUSES,
  circleCardIntroductionFormSchema,
  circleCardIntroductionIdSchema
} from "@/lib/circle-card/introductions";
import {
  CIRCLE_CARD_REFERRAL_OPEN_STATUSES,
  circleCardReferralEventTypeForStatus,
  circleCardReferralFormSchema,
  circleCardReferralStatusSchema
} from "@/lib/circle-card/referrals";
import {
  circleCardOpportunityCreateSchema,
  circleCardOpportunityStatusSchema,
  circleCardOpportunityUpdateSchema,
  isCircleCardOpportunityOpenStatus
} from "@/lib/circle-card/opportunities";
import {
  circleCardNotificationIdSchema,
  circleCardNotificationMarkAllSchema
} from "@/lib/circle-card/notifications";
import {
  canCreateCircleCard,
  isCircleCardFreeAccount,
  resolveCircleCardAccessLevel
} from "@/lib/circle-card/permissions";
import {
  CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT,
  CIRCLE_CARD_PRO_ACTIVE_CUSTOM_LINK_LIMIT
} from "@/lib/circle-card/plans";
import type { CircleCardSaveActionState } from "@/lib/circle-card/save-action-state";
import { hasEntitledSubscription } from "@/lib/membership/access";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { absoluteUrl } from "@/lib/utils";
import {
  createCircleCardActivity,
  createCircleCardNotification,
  findBusinessCardCircleCardMatches,
  findDuplicateBusinessCardWalletContact,
  trackCircleCardEvent
} from "@/server/circle-card";
import { hashCircleCardAccessCode } from "@/server/circle-card/link-access.service";
import { scanCircleCardSmartImportUrls } from "@/server/circle-card/smart-profile-import.service";

const CIRCLE_CARD_FORM_FIELDS = [
  "cardId",
  "slug",
  "cardType",
  "fullName",
  "businessName",
  "accountType",
  "profileLayout",
  "role",
  "tagline",
  "about",
  "profileImageUrl",
  "businessLogoUrl",
  "profileImagePositionX",
  "profileImagePositionY",
  "profileImageScale",
  "businessLogoPositionX",
  "businessLogoPositionY",
  "businessLogoScale",
  "themePreset",
  "themePrimaryColor",
  "themeAccentColor",
  "themeButtonColor",
  "themeSurfaceStyle",
  "websiteUrl",
  "email",
  "phone",
  "location",
  "linkedinUrl",
  "tiktokUrl",
  "instagramUrl",
  "xUrl",
  "facebookUrl",
  "youtubeUrl",
  "discordUrl",
  "socialLinksJson",
  "isPublished",
  "showInDiscover"
] as const;

const CIRCLE_CARD_ONBOARDING_FIELDS = [
  "profileImageUrl",
  "businessLogoUrl",
  "profileImagePositionX",
  "profileImagePositionY",
  "profileImageScale",
  "businessLogoPositionX",
  "businessLogoPositionY",
  "businessLogoScale",
  "fullName",
  "businessName",
  "accountType",
  "role",
  "tagline",
  "websiteUrl",
  "isPublished",
  "showInDiscover"
] as const;

const CIRCLE_CARD_LINK_FORM_FIELDS = [
  "cardId",
  "linkId",
  "type",
  "label",
  "url",
  "description",
  "icon",
  "imageUrl",
  "fileUrl",
  "fileName",
  "fileMimeType",
  "buttonText",
  "expiresAt",
  "actionMode",
  "visibility",
  "accessCodePlain",
  "accessCodeHint",
  "sortOrder",
  "isActive"
] as const;

const CIRCLE_CARD_IDENTITY_FORM_FIELDS = ["cardId", "returnPath", "accountType"] as const;

const CIRCLE_CARD_LINK_ID_FIELDS = ["cardId", "linkId"] as const;

const CIRCLE_CARD_LINK_MOVE_FIELDS = ["cardId", "linkId", "direction"] as const;

const CIRCLE_WALLET_BUSINESS_CARD_FIELDS = [
  "fullName",
  "businessName",
  "role",
  "phone",
  "mobilePhone",
  "email",
  "websiteUrl",
  "address",
  "linkedin",
  "instagram",
  "x",
  "facebook",
  "tiktok",
  "youtube",
  "originalCardImageUrl",
  "returnPath"
] as const;

const CIRCLE_WALLET_MATCHED_CARD_FIELDS = ["cardId", "message", "returnPath"] as const;
const CIRCLE_WALLET_CONTACT_ID_FIELDS = ["walletContactId", "returnPath"] as const;
const CIRCLE_CARD_RECOMMENDATION_FORM_FIELDS = [
  "recommendationId",
  "walletContactId",
  "category",
  "reason",
  "visibility",
  "returnPath"
] as const;
const CIRCLE_CARD_RECOMMENDATION_STATUS_FIELDS = [
  "recommendationId",
  "status",
  "returnPath"
] as const;
const CIRCLE_CARD_REFERRAL_FORM_FIELDS = [
  "recipientWalletContactId",
  "recipientCardId",
  "referredContactName",
  "referredContactBusiness",
  "referredContactEmail",
  "referredContactPhone",
  "referredContactWebsite",
  "reason",
  "estimatedValue",
  "visibility",
  "returnPath",
  "source"
] as const;
const CIRCLE_CARD_REFERRAL_STATUS_FIELDS = [
  "referralId",
  "status",
  "actualValue",
  "visibility",
  "returnPath"
] as const;
const CIRCLE_CARD_OPPORTUNITY_CREATE_FIELDS = [
  "walletContactId",
  "title",
  "description",
  "status",
  "potentialValue",
  "currency",
  "sourceType",
  "nextFollowUpAt",
  "notes",
  "returnPath"
] as const;
const CIRCLE_CARD_OPPORTUNITY_UPDATE_FIELDS = [
  "opportunityId",
  "title",
  "description",
  "status",
  "potentialValue",
  "currency",
  "sourceType",
  "lastActivityAt",
  "nextFollowUpAt",
  "notes",
  "returnPath"
] as const;
const CIRCLE_CARD_OPPORTUNITY_STATUS_FIELDS = [
  "opportunityId",
  "status",
  "returnPath"
] as const;
const CIRCLE_CARD_NOTIFICATION_ID_FIELDS = ["notificationId", "returnPath"] as const;
const CIRCLE_CARD_NOTIFICATION_MARK_ALL_FIELDS = ["returnPath"] as const;
const CIRCLE_CARD_MANAGEMENT_FIELDS = ["cardId", "returnPath"] as const;
const CIRCLE_CARD_VISIBILITY_FIELDS = ["cardId", "visibility", "returnPath"] as const;
const CIRCLE_CARD_ORDER_FIELDS = ["cardId", "direction", "returnPath"] as const;

const CIRCLE_CARD_CUSTOM_LINK_TOTAL_LIMIT = CIRCLE_CARD_PRO_ACTIVE_CUSTOM_LINK_LIMIT;
const CIRCLE_CARD_PRIVATE_LINK_TYPES = new Set<string>(CIRCLE_CARD_FILE_LINK_TYPES);
const CIRCLE_CARD_RELATIONSHIP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const CIRCLE_CARD_SMART_IMPORT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const CIRCLE_CARD_SMART_IMPORT_LINK_LIMIT = 8;
const CIRCLE_CARD_SMART_IMPORT_APPLY_LINK_LIMIT = 3;

type CircleCardActionUser = {
  id: string;
  role: Role;
  membershipTier: MembershipTier;
  hasActiveSubscription: boolean;
};

async function requireCircleCardActionUser(): Promise<CircleCardActionUser> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      membershipTier: true,
      suspended: true,
      subscription: {
        select: {
          status: true
        }
      }
    }
  });

  if (!user) {
    redirect("/login");
  }

  if (user.suspended) {
    redirect("/login?error=suspended");
  }

  return {
    id: user.id,
    role: user.role,
    membershipTier: user.membershipTier,
    hasActiveSubscription:
      user.role === "ADMIN" ? true : hasEntitledSubscription(user.subscription?.status ?? null)
  };
}

function appendQueryParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function redirectWithNotice(path: string, notice: string): never {
  redirect(appendQueryParam(path, "notice", notice));
}

function redirectWithError(path: string, error: string): never {
  redirect(appendQueryParam(path, "error", error));
}

function redirectWithSpinStatus(path: string, status: "already" | "connected" | "first"): never {
  redirect(appendQueryParam(path, "spin", status));
}

async function enforceCircleCardRelationshipRateLimit(input: {
  userId: string;
  bucket: "connection" | "introduction" | "referral";
  limit: number;
  returnPath: string;
  error: string;
}) {
  const rateLimit = await consumeRateLimit({
    key: `circle-card:${input.bucket}:${input.userId}`,
    limit: input.limit,
    windowMs: CIRCLE_CARD_RELATIONSHIP_RATE_LIMIT_WINDOW_MS
  });

  if (!rateLimit.allowed) {
    redirectWithError(input.returnPath, input.error);
  }
}

function resolveReturnPath(value: FormDataEntryValue | null | undefined, fallback: string) {
  return safeRedirectPath(typeof value === "string" ? value : null, fallback);
}

function readCircleCardFormData(formData: FormData) {
  return {
    ...Object.fromEntries(
      CIRCLE_CARD_FORM_FIELDS.map((field) => [field, formData.get(field) ?? ""])
    ),
    identityTags: formData.getAll("identityTags")
  };
}

function readCircleCardOnboardingFormData(formData: FormData) {
  return {
    ...Object.fromEntries(
      CIRCLE_CARD_ONBOARDING_FIELDS.map((field) => [field, formData.get(field) ?? ""])
    ),
    identityTags: formData.getAll("identityTags")
  };
}

function readCircleCardIdentityFormData(formData: FormData) {
  return {
    ...Object.fromEntries(
      CIRCLE_CARD_IDENTITY_FORM_FIELDS.map((field) => [field, formData.get(field) ?? ""])
    ),
    identityTags: formData.getAll("identityTags")
  };
}

function readCircleCardLinkFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_LINK_FORM_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardLinkIdFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_LINK_ID_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardLinkMoveFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_LINK_MOVE_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleWalletBusinessCardFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_WALLET_BUSINESS_CARD_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleWalletMatchedCardFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_WALLET_MATCHED_CARD_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleWalletContactIdFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_WALLET_CONTACT_ID_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardRecommendationFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_RECOMMENDATION_FORM_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardRecommendationStatusFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_RECOMMENDATION_STATUS_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardReferralFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_REFERRAL_FORM_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardReferralStatusFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_REFERRAL_STATUS_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardOpportunityCreateFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_OPPORTUNITY_CREATE_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardOpportunityUpdateFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_OPPORTUNITY_UPDATE_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardOpportunityStatusFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_OPPORTUNITY_STATUS_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardNotificationIdFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_NOTIFICATION_ID_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardNotificationMarkAllFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_NOTIFICATION_MARK_ALL_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardManagementFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_MANAGEMENT_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardVisibilityFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_VISIBILITY_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardOrderFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_ORDER_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

async function resolveAvailableSlug(input: {
  slugBase: string;
  cardId?: string | null;
  userProvidedSlug: boolean;
}) {
  if (input.userProvidedSlug) {
    const conflictingCard = await prisma.circleCard.findFirst({
      where: {
        slug: input.slugBase,
        ...(input.cardId ? { NOT: { id: input.cardId } } : {})
      },
      select: { id: true }
    });

    if (conflictingCard) {
      return null;
    }

    return input.slugBase;
  }

  for (let suffix = 0; suffix < 25; suffix += 1) {
    const candidate = suffix === 0 ? input.slugBase : `${input.slugBase}-${suffix + 1}`;
    const existing = await prisma.circleCard.findUnique({
      where: { slug: candidate },
      select: { id: true }
    });

    if (!existing || existing.id === input.cardId) {
      return candidate;
    }
  }

  return `${input.slugBase}-${Date.now().toString(36)}`;
}

function revalidateCircleCardPaths(slug?: string | null) {
  revalidatePath("/dashboard/circle-card");
  revalidatePath("/circle-card");

  if (slug) {
    revalidatePath(`/card/${slug}`);
  }
}

function revalidateCircleCardPublicPaths(slug?: string | null) {
  if (slug) {
    revalidatePath(`/card/${slug}`);
  }
}

function revalidateCircleCardConnectionPaths(slugs: Array<string | null | undefined>) {
  revalidatePath("/dashboard/circle-card");

  for (const slug of slugs) {
    if (slug) {
      revalidatePath(`/card/${slug}`);
    }
  }
}

async function getPrimaryCircleCardForUser(userId: string) {
  return prisma.circleCard.findFirst({
    where: {
      userId,
      archivedAt: null
    },
    orderBy: [{ isDefaultCard: "desc" }, { isPrimary: "desc" }, { displayOrder: "asc" }],
    select: {
      id: true,
      slug: true,
      userId: true,
      fullName: true,
      businessName: true
    }
  });
}

async function trackPrimaryCircleCardEvent(input: {
  userId: string;
  eventType: CircleCardEventTypeValue;
  metadata?: Record<string, unknown>;
}) {
  const primaryCard = await getPrimaryCircleCardForUser(input.userId);

  if (!primaryCard) {
    return { stored: false as const };
  }

  return trackCircleCardEvent({
    cardId: primaryCard.id,
    eventType: input.eventType,
    userId: input.userId,
    metadata: input.metadata
  });
}

async function findActiveCircleCardConnectionRequest(input: {
  requesterCardId: string;
  recipientCardId: string;
}) {
  return prisma.circleCardConnectionRequest.findFirst({
    where: {
      status: {
        in: ["PENDING", "ACCEPTED"]
      },
      OR: [
        {
          requesterCardId: input.requesterCardId,
          recipientCardId: input.recipientCardId
        },
        {
          requesterCardId: input.recipientCardId,
          recipientCardId: input.requesterCardId
        }
      ]
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      requesterId: true,
      recipientId: true
    }
  });
}

async function ensureAcceptedIntroductionConnection(
  tx: Prisma.TransactionClient,
  input: {
    personAUserId: string;
    personACardId: string;
    personBUserId: string;
    personBCardId: string;
    requesterUserId: string;
    requesterCardId: string;
    recipientUserId: string;
    recipientCardId: string;
    now: Date;
  }
) {
  const [personAWalletSave, personBWalletSave] = await Promise.all([
    tx.circleWalletContact.findUnique({
      where: {
        userId_cardId: {
          userId: input.personAUserId,
          cardId: input.personBCardId
        }
      },
      select: { id: true }
    }),
    tx.circleWalletContact.findUnique({
      where: {
        userId_cardId: {
          userId: input.personBUserId,
          cardId: input.personACardId
        }
      },
      select: { id: true }
    })
  ]);

  const activeConnection = await tx.circleCardConnectionRequest.findFirst({
    where: {
      status: {
        in: ["PENDING", "ACCEPTED"]
      },
      OR: [
        {
          requesterCardId: input.personACardId,
          recipientCardId: input.personBCardId
        },
        {
          requesterCardId: input.personBCardId,
          recipientCardId: input.personACardId
        }
      ]
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      status: true
    }
  });

  if (activeConnection?.status === "PENDING") {
    await tx.circleCardConnectionRequest.update({
      where: { id: activeConnection.id },
      data: {
        status: "ACCEPTED",
        respondedAt: input.now
      }
    });
  }

  if (!activeConnection) {
    await tx.circleCardConnectionRequest.create({
      data: {
        requesterId: input.requesterUserId,
        requesterCardId: input.requesterCardId,
        recipientId: input.recipientUserId,
        recipientCardId: input.recipientCardId,
        status: "ACCEPTED",
        respondedAt: input.now
      }
    });
  }

  await Promise.all([
    tx.circleWalletContact.upsert({
      where: {
        userId_cardId: {
          userId: input.personAUserId,
          cardId: input.personBCardId
        }
      },
      create: {
        userId: input.personAUserId,
        cardId: input.personBCardId
      },
      update: {}
    }),
    tx.circleWalletContact.upsert({
      where: {
        userId_cardId: {
          userId: input.personBUserId,
          cardId: input.personACardId
        }
      },
      create: {
        userId: input.personBUserId,
        cardId: input.personACardId
      },
      update: {}
    })
  ]);

  return {
    createdPersonAWalletSave: !personAWalletSave,
    createdPersonBWalletSave: !personBWalletSave,
    createdConnection: !activeConnection,
    acceptedPendingConnection: activeConnection?.status === "PENDING"
  };
}

function isFreeCircleCardActionUser(user: CircleCardActionUser) {
  return isCircleCardFreeAccount({
    role: user.role,
    membershipTier: user.membershipTier,
    hasActiveSubscription: user.hasActiveSubscription,
    suspended: false
  });
}

function circleCardLinkIconForType(type: CircleCardLinkType) {
  switch (type) {
    case "BOOK_CALL":
      return "calendar";
    case "PORTFOLIO":
      return "portfolio";
    case "LATEST_OFFER":
      return "offer";
    case "COMMUNITY":
      return "community";
    case "DOWNLOAD":
      return "download";
    case "REVIEW":
      return "review";
    case "SHOP":
      return "shop";
    case "MENU":
      return "menu";
    case "CASE_STUDY":
      return "case-studies";
    default:
      return "link";
  }
}

function circleCardLinkVisibilityForType(
  type: CircleCardLinkType,
  visibility: CircleCardLinkVisibility
) {
  return CIRCLE_CARD_PRIVATE_LINK_TYPES.has(type) ? visibility : "PUBLIC";
}

function circleCardLinkActionModeForType(
  type: CircleCardLinkType,
  actionMode: CircleCardLinkActionMode
) {
  return CIRCLE_CARD_PRIVATE_LINK_TYPES.has(type) ? actionMode : "AUTO";
}

function nullableMoney(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function circleCardReferralNoticeForStatus(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "referral-accepted";
    case "DECLINED":
      return "referral-declined";
    case "WON":
      return "referral-won";
    case "LOST":
      return "referral-lost";
    case "CANCELLED":
      return "referral-cancelled";
    default:
      return "referral-updated";
  }
}

function circleCardOpportunityNoticeForStatus(status: string) {
  if (status === "WON") {
    return "opportunity-won";
  }

  if (status === "LOST") {
    return "opportunity-lost";
  }

  return "opportunity-updated";
}

function opportunityClosedAtData(input: {
  previousStatus?: string | null;
  nextStatus: string;
  existingClosedAt?: Date | null;
  now: Date;
}) {
  const wasOpen = isCircleCardOpportunityOpenStatus(input.previousStatus);
  const isOpen = isCircleCardOpportunityOpenStatus(input.nextStatus);

  if (wasOpen && !isOpen) {
    return { closedAt: input.now };
  }

  if (!wasOpen && isOpen) {
    return { closedAt: null };
  }

  if (!isOpen && input.existingClosedAt) {
    return { closedAt: input.existingClosedAt };
  }

  return {};
}

function dateOnlyKey(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : null;
}

function circleCardDisplayName(card: { fullName?: string | null; businessName?: string | null }) {
  return [card.fullName, card.businessName].filter(Boolean).join(" / ") || "A Circle Card contact";
}

async function enforceCircleCardCustomLinkActivationLimit(input: {
  user: CircleCardActionUser;
  cardId: string;
  linkId?: string | null;
  existingIsActive?: boolean;
  wantsActive: boolean;
  returnPath: string;
}) {
  const limitExceeded = await circleCardCustomLinkActivationLimitExceeded(input);

  if (limitExceeded) {
    redirectWithError(input.returnPath, "custom-link-active-limit");
  }
}

async function circleCardCustomLinkActivationLimitExceeded(input: {
  user: CircleCardActionUser;
  cardId: string;
  linkId?: string | null;
  existingIsActive?: boolean;
  wantsActive: boolean;
}) {
  if (!input.wantsActive || input.existingIsActive || !isFreeCircleCardActionUser(input.user)) {
    return false;
  }

  const activeLinkCount = await prisma.circleCardLink.count({
    where: {
      cardId: input.cardId,
      isActive: true,
      ...(input.linkId ? { NOT: { id: input.linkId } } : {})
    }
  });

  return activeLinkCount >= CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT;
}

const CIRCLE_CARD_LINK_DASHBOARD_SELECT = {
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
  sortOrder: true,
  isActive: true
} as const satisfies Prisma.CircleCardLinkSelect;

type CircleCardDashboardLinkRecord = Prisma.CircleCardLinkGetPayload<{
  select: typeof CIRCLE_CARD_LINK_DASHBOARD_SELECT;
}>;

export type CircleCardDashboardLinkPayload = {
  id: string;
  type: CircleCardLinkType;
  actionMode: CircleCardLinkActionMode;
  visibility: CircleCardLinkVisibility;
  label: string;
  url: string | null;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  buttonText: string | null;
  expiresAt: string | null;
  accessCodeHint: string | null;
  hasAccessCode: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type CircleCardInlineActionResult =
  | {
      ok: true;
      notice: string;
      link?: CircleCardDashboardLinkPayload;
      links?: CircleCardDashboardLinkPayload[];
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

export type CircleCardGalleryInlineActionResult =
  | {
      ok: true;
      notice: string;
      item?: CircleCardGalleryItem;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

export type CircleCardProductInlineActionResult =
  | {
      ok: true;
      notice: string;
      item?: CircleCardProductItem;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

export type CircleCardReviewInlineActionResult =
  | {
      ok: true;
      notice: string;
      item?: CircleCardReviewItem;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

function serializeCircleCardDashboardLink(
  link: CircleCardDashboardLinkRecord
): CircleCardDashboardLinkPayload {
  return {
    id: link.id,
    type: (link.type || "GENERAL") as CircleCardLinkType,
    actionMode: circleCardLinkActionModeForType(
      (link.type || "GENERAL") as CircleCardLinkType,
      (link.actionMode || "AUTO") as CircleCardLinkActionMode
    ),
    visibility: (link.visibility || "PUBLIC") as CircleCardLinkVisibility,
    label: link.label,
    url: link.url,
    description: link.description,
    icon: link.icon,
    imageUrl: link.imageUrl,
    fileUrl: link.fileUrl,
    fileName: link.fileName,
    fileMimeType: link.fileMimeType,
    buttonText: link.buttonText,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    accessCodeHint: link.accessCodeHint,
    hasAccessCode: Boolean(link.accessCodeHash),
    sortOrder: link.sortOrder,
    isActive: link.isActive
  };
}

async function readCircleCardDashboardLinks(cardId: string) {
  const links = await prisma.circleCardLink.findMany({
    where: { cardId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: CIRCLE_CARD_LINK_DASHBOARD_SELECT
  });

  return links.map(serializeCircleCardDashboardLink);
}

function inlineCircleCardError(error: string, message: string): CircleCardInlineActionResult {
  return {
    ok: false,
    error,
    message
  };
}

function inlineCircleCardGalleryError(
  error: string,
  message: string
): CircleCardGalleryInlineActionResult {
  return { ok: false, error, message };
}

function inlineCircleCardProductError(
  error: string,
  message: string
): CircleCardProductInlineActionResult {
  return { ok: false, error, message };
}

function inlineCircleCardReviewError(
  error: string,
  message: string
): CircleCardReviewInlineActionResult {
  return { ok: false, error, message };
}

function circleCardSaveSuccess(input: { cardId: string; slug: string }): CircleCardSaveActionState {
  return {
    success: true,
    message: "Your Circle Card has been saved.",
    cardId: input.cardId,
    slug: input.slug,
    publicUrl: absoluteUrl(`/card/${input.slug}`),
    submittedAt: Date.now()
  };
}

function circleCardSaveFailure(input: {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
}): CircleCardSaveActionState {
  const message = input.message ?? "The Circle Card could not be saved.";

  return {
    success: false,
    message,
    fieldErrors: input.fieldErrors,
    formError: input.formError ?? message,
    submittedAt: Date.now()
  };
}

export async function markCircleCardNotificationReadAction(formData: FormData) {
  const parsed = circleCardNotificationIdSchema.safeParse(readCircleCardNotificationIdFormData(formData));
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=network#notifications"
  );
  const user = await requireCircleCardActionUser();

  if (!parsed.success) {
    redirectWithError(returnPath, "notification-invalid");
  }

  const notification = await prisma.circleCardNotification.findFirst({
    where: {
      id: parsed.data.notificationId,
      userId: user.id
    },
    select: {
      id: true,
      circleCardId: true,
      type: true,
      isRead: true
    }
  });

  if (!notification) {
    redirectWithError(returnPath, "notification-not-found");
  }

  if (!notification.isRead) {
    await prisma.circleCardNotification.update({
      where: { id: notification.id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    if (notification.circleCardId) {
      await trackCircleCardEvent({
        cardId: notification.circleCardId,
        eventType: "NOTIFICATION_READ",
        userId: user.id,
        metadata: {
          source: "circle_card_notifications",
          notificationType: notification.type
        }
      });
    } else {
      await trackPrimaryCircleCardEvent({
        userId: user.id,
        eventType: "NOTIFICATION_READ",
        metadata: {
          source: "circle_card_notifications",
          notificationType: notification.type
        }
      });
    }
  }

  revalidatePath("/dashboard/circle-card");
  redirectWithNotice(returnPath, "notification-read");
}

export async function markAllCircleCardNotificationsReadAction(formData: FormData) {
  const parsed = circleCardNotificationMarkAllSchema.safeParse(
    readCircleCardNotificationMarkAllFormData(formData)
  );
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=network#notifications"
  );
  const user = await requireCircleCardActionUser();

  if (!parsed.success) {
    redirectWithError(returnPath, "notification-invalid");
  }

  const unreadCount = await prisma.circleCardNotification.count({
    where: {
      userId: user.id,
      isRead: false
    }
  });

  if (unreadCount > 0) {
    await prisma.circleCardNotification.updateMany({
      where: {
        userId: user.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    await trackPrimaryCircleCardEvent({
      userId: user.id,
      eventType: "NOTIFICATION_MARK_ALL_READ",
      metadata: {
        source: "circle_card_notifications",
        count: unreadCount
      }
    });
  }

  revalidatePath("/dashboard/circle-card");
  redirectWithNotice(returnPath, "notifications-read");
}

function readSmartImportTextField(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function readSmartImportHttpUrl(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  const normalized = normalizeCircleCardUrl(value);

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function scanCircleCardSmartImportLinksAction(input: { links: string }) {
  const user = await requireCircleCardActionUser();
  const rateLimit = await consumeRateLimit({
    key: `circle-card:smart-import:${user.id}`,
    limit: 12,
    windowMs: CIRCLE_CARD_SMART_IMPORT_RATE_LIMIT_WINDOW_MS
  });

  if (!rateLimit.allowed) {
    return {
      ok: false as const,
      error: "You have scanned several links recently. Please try again shortly.",
      results: []
    };
  }

  const links = input.links
    .split(/[\n,\s]+/)
    .map((link) => link.trim())
    .filter(Boolean)
    .slice(0, CIRCLE_CARD_SMART_IMPORT_LINK_LIMIT);

  if (!links.length) {
    return {
      ok: false as const,
      error: "Paste at least one public link to scan.",
      results: []
    };
  }

  const results = await scanCircleCardSmartImportUrls(links);

  return {
    ok: true as const,
    error: null,
    results
  };
}

export async function applyCircleCardSmartImportAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(
    formData.get("returnPath"),
    "/dashboard/circle-card?section=my-card#smart-profile-import"
  );
  const cardId = readSmartImportTextField(formData, "cardId", 140);

  if (!cardId) {
    redirectWithError(returnPath, "smart-import-invalid");
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      id: cardId,
      userId: user.id
    },
    select: {
      id: true,
      slug: true,
      socialLinks: true,
      _count: {
        select: {
          customLinks: true
        }
      },
      customLinks: {
        where: {
          isActive: true
        },
        select: {
          id: true
        }
      }
    }
  });

  if (!card) {
    redirectWithError(returnPath, "card-not-found");
  }

  const data: Prisma.CircleCardUpdateInput = {};
  const tagline = readSmartImportTextField(formData, "taglineValue", 180);
  const profileImageUrl = readSmartImportHttpUrl(formData, "profileImageUrl");
  const websiteUrl = readSmartImportHttpUrl(formData, "websiteUrl");

  if (formData.has("useTagline") && tagline) {
    data.tagline = tagline;
  }

  if (formData.has("useProfileImage") && profileImageUrl) {
    data.profileImageUrl = profileImageUrl;
  }

  if (formData.has("useWebsite") && websiteUrl) {
    data.websiteUrl = websiteUrl;
  }

  const socialLinks = readCircleCardSocialLinks(card.socialLinks as Prisma.JsonValue);
  const socialLinkItems: CircleCardSocialLink[] = [...socialLinks.links];
  let hasSocialUpdates = false;

  for (const platform of formData.getAll("socialPlatform")) {
    if (
      typeof platform !== "string" ||
      !CIRCLE_CARD_SOCIAL_FIELDS.includes(platform as CircleCardSocialPlatform)
    ) {
      continue;
    }

    const socialUrl = readSmartImportHttpUrl(formData, `socialUrl-${platform}`);

    if (socialUrl) {
      const socialPlatform = platform as CircleCardSocialPlatform;
      const alreadyStored = socialLinkItems.some(
        (item) => item.platform === socialPlatform && item.url === socialUrl
      );

      if (!alreadyStored) {
        socialLinkItems.push({
          id: `smart-${socialPlatform}-${Date.now()}-${socialLinkItems.length}`,
          platform: socialPlatform,
          label: null,
          url: socialUrl,
          isActive: true,
          sortOrder: socialLinkItems.length
        });
      }

      hasSocialUpdates = true;
    }
  }

  if (hasSocialUpdates) {
    data.socialLinks = buildCircleCardSocialLinksJson(socialLinkItems);
  }

  const selectedLinkIndexes = formData
    .getAll("smartLinkIndex")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .slice(0, CIRCLE_CARD_SMART_IMPORT_APPLY_LINK_LIMIT);
  const selectedLinks = selectedLinkIndexes
    .map((index) => {
      const rawType = readSmartImportTextField(formData, `linkType-${index}`, 40);
      const type = CIRCLE_CARD_LINK_TYPES.includes(rawType as CircleCardLinkType)
        ? (rawType as CircleCardLinkType)
        : "GENERAL";
      const url = readSmartImportHttpUrl(formData, `linkUrl-${index}`);
      const label = readSmartImportTextField(formData, `linkLabel-${index}`, 90);
      const imageUrl = readSmartImportHttpUrl(formData, `linkImageUrl-${index}`);

      return {
        type,
        url,
        label,
        description: readSmartImportTextField(formData, `linkDescription-${index}`, 220),
        imageUrl
      };
    })
    .filter((link) => link.url && link.label);

  const hasCardUpdates = Object.keys(data).length > 0;

  if (!hasCardUpdates && !selectedLinks.length) {
    redirectWithError(returnPath, "smart-import-empty");
  }

  if (
    selectedLinks.length &&
    card._count.customLinks + selectedLinks.length > CIRCLE_CARD_CUSTOM_LINK_TOTAL_LIMIT
  ) {
    redirectWithError(returnPath, "custom-link-total-limit");
  }

  const activeLinkCount = card.customLinks.length;
  let remainingFreeActiveSlots = isFreeCircleCardActionUser(user)
    ? Math.max(0, CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT - activeLinkCount)
    : Number.POSITIVE_INFINITY;

  if (hasCardUpdates) {
    await prisma.circleCard.update({
      where: {
        id: card.id
      },
      data
    });
  }

  if (selectedLinks.length) {
    let nextSortOrder = card._count.customLinks;

    for (const link of selectedLinks) {
      const isActive = remainingFreeActiveSlots > 0;

      if (Number.isFinite(remainingFreeActiveSlots)) {
        remainingFreeActiveSlots -= 1;
      }

      await prisma.circleCardLink.create({
        data: {
          cardId: card.id,
          type: link.type,
          label: link.label,
          url: link.url,
          description: nullableText(link.description),
          imageUrl: nullableText(link.imageUrl),
          icon: circleCardLinkIconForType(link.type),
          sortOrder: nextSortOrder,
          isActive
        }
      });

      nextSortOrder += 1;
    }
  }

  await createCircleCardActivity({
    userId: user.id,
    circleCardId: card.id,
    type: "CARD_UPDATED",
    title: "Smart Profile Import applied",
    message: "Reviewed Smart Import suggestions were applied to this Circle Card.",
    entityType: "CIRCLE_CARD",
    entityId: card.id
  });

  revalidateCircleCardPaths(card.slug);
  redirectWithNotice(returnPath, "smart-import-applied");
}

export async function upsertCircleCardAction(
  _previousState: CircleCardSaveActionState,
  formData: FormData
): Promise<CircleCardSaveActionState> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardFormSchema.safeParse(readCircleCardFormData(formData));

  if (!parsed.success) {
    return circleCardSaveFailure({
      message: "The Circle Card could not be saved.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Check the card fields and try again."
    });
  }

  const values = parsed.data;
  const shouldUpdateIdentity = formData.has("accountType") || formData.has("identityTags");
  const shouldUpdateProfileLayout = formData.has("profileLayout");
  const shouldResetTheme = formData.get("resetThemeColours") === "true";
  const shouldUpdateTheme =
    shouldResetTheme ||
    formData.has("themePrimaryColor") ||
    formData.has("themeAccentColor") ||
    formData.has("themeButtonColor") ||
    formData.has("themeSurfaceStyle") ||
    formData.has("themePreset");
  const cardId = values.cardId || null;

  if (!cardId && !values.accountType) {
    return circleCardSaveFailure({
      message: "The Circle Card could not be saved.",
      fieldErrors: {
        accountType: ["Choose what best describes you before saving your Circle Card."]
      },
      formError: "Choose what best describes you before saving your Circle Card."
    });
  }

  const existingCard = cardId
    ? await prisma.circleCard.findFirst({
        where: {
          id: cardId,
          userId: user.id
        },
        select: {
          id: true,
          slug: true,
          isPublished: true,
          isDefaultCard: true,
          isPrimary: true,
          showInDiscover: true,
          discoverOptedInAt: true,
          archivedAt: true
        }
      })
    : null;

  if (cardId && (!existingCard || existingCard.archivedAt)) {
    return circleCardSaveFailure({
      message: "The Circle Card could not be saved.",
      formError: "That Circle Card could not be found."
    });
  }

  if (!cardId) {
    const existingCardCount = await prisma.circleCard.count({
      where: {
        userId: user.id,
        archivedAt: null
      }
    });
    const accessLevel = resolveCircleCardAccessLevel({
      role: user.role,
      membershipTier: user.membershipTier,
      hasActiveSubscription: user.hasActiveSubscription
    });

    if (!canCreateCircleCard({ accessLevel, existingCardCount })) {
      return circleCardSaveFailure({
        message: "The Circle Card could not be saved.",
        formError: "You have reached the Circle Card limit for your current access."
      });
    }
  }

  const userProvidedSlug = Boolean(values.slug);
  const slugBase = buildCircleCardSlugBase(values);
  const slug = await resolveAvailableSlug({
    slugBase,
    cardId,
    userProvidedSlug
  });

  if (!slug) {
    return circleCardSaveFailure({
      message: "The Circle Card could not be saved.",
      fieldErrors: {
        slug: ["That public card link is already taken."]
      },
      formError: "That public card link is already taken."
    });
  }

  const socialLinks = buildCircleCardSocialLinks(values);
  const themeStorage = buildCircleCardThemeStorage(
    shouldResetTheme
      ? {}
      : {
          themePrimaryColor: values.themePrimaryColor,
          themeAccentColor: values.themeAccentColor,
          themeButtonColor: values.themeButtonColor,
          themeSurfaceStyle: values.themeSurfaceStyle,
          themePreset: values.themePreset
        }
  );
  const resolvedTheme = themeStorage.theme;
  const data = {
    slug,
    cardType: values.cardType,
    fullName: values.fullName.trim(),
    businessName: nullableText(values.businessName),
    ...(shouldUpdateIdentity
      ? {
          accountType: values.accountType ?? null,
          identityTags: values.identityTags
        }
      : {}),
    ...(!cardId || shouldUpdateProfileLayout ? { profileLayout: values.profileLayout } : {}),
    role: nullableText(values.role),
    tagline: nullableText(values.tagline),
    about: nullableText(values.about),
    profileImageUrl: nullableText(values.profileImageUrl),
    businessLogoUrl: nullableText(values.businessLogoUrl),
    profileImagePositionX: nullableNumber(values.profileImagePositionX),
    profileImagePositionY: nullableNumber(values.profileImagePositionY),
    profileImageScale: nullableNumber(values.profileImageScale),
    businessLogoPositionX: nullableNumber(values.businessLogoPositionX),
    businessLogoPositionY: nullableNumber(values.businessLogoPositionY),
    businessLogoScale: nullableNumber(values.businessLogoScale),
    ...(!cardId || shouldUpdateTheme
      ? {
          themePrimaryColor: themeStorage.values.themePrimaryColor,
          themeAccentColor: themeStorage.values.themeAccentColor,
          themeButtonColor: themeStorage.values.themeButtonColor,
          themeSurfaceStyle: themeStorage.values.themeSurfaceStyle,
          themePreset: themeStorage.values.themePreset,
          themeMetadata: buildCircleCardThemeMetadata(resolvedTheme) as Prisma.InputJsonValue
        }
      : {}),
    websiteUrl: nullableText(values.websiteUrl),
    email: nullableText(values.email),
    phone: nullableText(values.phone),
    location: nullableText(values.location),
    socialLinks,
    isPublished: values.isPublished,
    ...buildCircleCardDiscoverVisibilityData({
      showInDiscover: values.showInDiscover,
      previousShowInDiscover: existingCard?.showInDiscover,
      previousDiscoverOptedInAt: existingCard?.discoverOptedInAt
    })
  };

  try {
    if (cardId) {
      const publicationChanged =
        typeof existingCard?.isPublished === "boolean" &&
        existingCard.isPublished !== data.isPublished;
      const needsDefaultReassignment =
        !data.isPublished && Boolean(existingCard?.isDefaultCard || existingCard?.isPrimary);

      if (publicationChanged || needsDefaultReassignment) {
        await prisma.$transaction(async (tx) => {
          await tx.circleCard.update({
            where: { id: cardId },
            data: {
              ...data,
              ...(!data.isPublished
                ? {
                    isDefaultCard: false,
                    isPrimary: false,
                    showInDiscover: false,
                    discoverOptedInAt: null
                  }
                : {})
            }
          });

          if (needsDefaultReassignment) {
            const nextDefaultCard = await tx.circleCard.findFirst({
              where: {
                userId: user.id,
                id: { not: cardId },
                archivedAt: null,
                isPublished: true
              },
              orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
              select: { id: true }
            });

            await tx.circleCard.updateMany({
              where: { userId: user.id, archivedAt: null },
              data: { isDefaultCard: false, isPrimary: false }
            });

            if (nextDefaultCard) {
              await tx.circleCard.update({
                where: { id: nextDefaultCard.id },
                data: { isDefaultCard: true, isPrimary: true }
              });
            }
          } else if (data.isPublished && existingCard?.isPublished === false) {
            const currentLiveDefault = await tx.circleCard.findFirst({
              where: {
                userId: user.id,
                archivedAt: null,
                isPublished: true,
                OR: [{ isDefaultCard: true }, { isPrimary: true }]
              },
              select: { id: true }
            });

            if (!currentLiveDefault) {
              await tx.circleCard.updateMany({
                where: { userId: user.id, archivedAt: null },
                data: { isDefaultCard: false, isPrimary: false }
              });
              await tx.circleCard.update({
                where: { id: cardId },
                data: { isDefaultCard: true, isPrimary: true }
              });
            }
          }
        });
      } else {
        await prisma.circleCard.update({
          where: { id: cardId },
          data
        });
      }

      await createCircleCardActivity({
        userId: user.id,
        circleCardId: cardId,
        type: "CARD_UPDATED",
        title: "Circle Card updated",
        message: `${data.fullName}'s Circle Card details were updated.`,
        entityType: "CIRCLE_CARD",
        entityId: cardId
      });

      revalidateCircleCardPaths(existingCard?.slug);
      revalidateCircleCardPaths(slug);
      if (publicationChanged) {
        const ownerCardSlugs = await prisma.circleCard.findMany({
          where: { userId: user.id, archivedAt: null },
          select: { slug: true }
        });
        for (const ownerCard of ownerCardSlugs) {
          revalidateCircleCardPublicPaths(ownerCard.slug);
        }
      }
      return circleCardSaveSuccess({ cardId, slug });
    }

    const cardCount = await prisma.circleCard.count({
      where: {
        userId: user.id,
        archivedAt: null
      }
    });
    const currentLiveDefault = data.isPublished
      ? await prisma.circleCard.findFirst({
          where: {
            userId: user.id,
            archivedAt: null,
            isPublished: true,
            OR: [{ isDefaultCard: true }, { isPrimary: true }]
          },
          select: { id: true }
        })
      : null;
    const card = await prisma.circleCard.create({
      data: {
        ...data,
        userId: user.id,
        isPrimary: data.isPublished && !currentLiveDefault,
        isDefaultCard: data.isPublished && !currentLiveDefault,
        displayOrder: cardCount,
        contentBlocks: createEmptyCircleCardContentBlocks() as Prisma.InputJsonValue
      },
      select: { id: true, slug: true }
    });

    await createCircleCardActivity({
      userId: user.id,
      circleCardId: card.id,
      type: "CARD_CREATED",
      title: "Circle Card created",
      message: `${data.fullName}'s Circle Card was created.`,
      entityType: "CIRCLE_CARD",
      entityId: card.id
    });

    revalidateCircleCardPaths(card.slug);
    return circleCardSaveSuccess({ cardId: card.id, slug: card.slug });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return circleCardSaveFailure({
        message: "The Circle Card could not be saved.",
        fieldErrors: {
          slug: ["That public card link is already taken."]
        },
        formError: "That public card link is already taken."
      });
    }

    return circleCardSaveFailure({
      message: "The Circle Card could not be saved.",
      formError: "The Circle Card could not be saved."
    });
  }
}

export async function setDefaultCircleCardAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const values = readCircleCardManagementFormData(formData);
  const returnPath = resolveReturnPath(values.returnPath, "/dashboard/circle-card");
  const cardId = typeof values.cardId === "string" ? values.cardId : "";

  if (!cardId) {
    redirectWithError(returnPath, "card-not-found");
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      id: cardId,
      userId: user.id,
      archivedAt: null
    },
    select: {
      id: true,
      slug: true,
      isPublished: true
    }
  });

  if (!card) {
    redirectWithError(returnPath, "card-not-found");
  }

  if (!card.isPublished) {
    redirectWithError(returnPath, "card-hidden-default");
  }

  await prisma.$transaction([
    prisma.circleCard.updateMany({
      where: {
        userId: user.id,
        archivedAt: null
      },
      data: {
        isDefaultCard: false,
        isPrimary: false
      }
    }),
    prisma.circleCard.update({
      where: { id: card.id },
      data: {
        isDefaultCard: true,
        isPrimary: true
      }
    })
  ]);

  await createCircleCardActivity({
    userId: user.id,
    circleCardId: card.id,
    type: "CARD_UPDATED",
    title: "Default Circle Card updated",
    message: "Your default public landing card was updated.",
    entityType: "CIRCLE_CARD",
    entityId: card.id,
    metadata: {
      source: "circle_card_multi_card_management"
    }
  });

  const activeCardSlugs = await prisma.circleCard.findMany({
    where: {
      userId: user.id,
      archivedAt: null
    },
    select: {
      slug: true
    }
  });

  revalidatePath("/dashboard/circle-card");
  for (const activeCard of activeCardSlugs) {
    revalidateCircleCardPublicPaths(activeCard.slug);
  }
  redirectWithNotice(returnPath, "card-default-updated");
}

export async function setCircleCardVisibilityAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const values = readCircleCardVisibilityFormData(formData);
  const returnPath = resolveReturnPath(values.returnPath, "/dashboard/circle-card");
  const cardId = typeof values.cardId === "string" ? values.cardId : "";
  const visibility =
    values.visibility === "live" ? "live" : values.visibility === "hidden" ? "hidden" : null;

  if (!cardId || !visibility) {
    redirectWithError(returnPath, "card-not-found");
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      id: cardId,
      userId: user.id,
      archivedAt: null
    },
    select: {
      id: true,
      slug: true,
      fullName: true,
      isPublished: true,
      isDefaultCard: true,
      isPrimary: true
    }
  });

  if (!card) {
    redirectWithError(returnPath, "card-not-found");
  }

  const makeLive = visibility === "live";

  if (card.isPublished === makeLive) {
    redirectWithNotice(returnPath, makeLive ? "card-already-live" : "card-already-hidden");
  }

  await prisma.$transaction(async (tx) => {
    await tx.circleCard.update({
      where: { id: card.id },
      data: makeLive
        ? { isPublished: true }
        : {
            isPublished: false,
            showInDiscover: false,
            discoverOptedInAt: null,
            isDefaultCard: false,
            isPrimary: false
          }
    });

    if (!makeLive && (card.isDefaultCard || card.isPrimary)) {
      const nextDefaultCard = await tx.circleCard.findFirst({
        where: {
          userId: user.id,
          id: { not: card.id },
          archivedAt: null,
          isPublished: true
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true }
      });

      await tx.circleCard.updateMany({
        where: { userId: user.id, archivedAt: null },
        data: { isDefaultCard: false, isPrimary: false }
      });

      if (nextDefaultCard) {
        await tx.circleCard.update({
          where: { id: nextDefaultCard.id },
          data: { isDefaultCard: true, isPrimary: true }
        });
      }
    }

    if (makeLive) {
      const currentLiveDefault = await tx.circleCard.findFirst({
        where: {
          userId: user.id,
          archivedAt: null,
          isPublished: true,
          OR: [{ isDefaultCard: true }, { isPrimary: true }]
        },
        select: { id: true }
      });

      if (!currentLiveDefault) {
        await tx.circleCard.updateMany({
          where: { userId: user.id, archivedAt: null },
          data: { isDefaultCard: false, isPrimary: false }
        });
        await tx.circleCard.update({
          where: { id: card.id },
          data: { isDefaultCard: true, isPrimary: true }
        });
      }
    }
  });

  await createCircleCardActivity({
    userId: user.id,
    circleCardId: card.id,
    type: "CARD_UPDATED",
    title: makeLive ? "Circle Card set live" : "Circle Card hidden",
    message: makeLive
      ? `${card.fullName}'s Circle Card is now publicly available.`
      : `${card.fullName}'s Circle Card was hidden from public view.`,
    entityType: "CIRCLE_CARD",
    entityId: card.id,
    metadata: {
      source: "circle_card_visibility_control",
      visibility
    }
  });

  const ownerCardSlugs = await prisma.circleCard.findMany({
    where: { userId: user.id, archivedAt: null },
    select: { slug: true }
  });

  revalidatePath("/dashboard/circle-card");
  revalidatePath("/circle-card");
  for (const ownerCard of ownerCardSlugs) {
    revalidateCircleCardPublicPaths(ownerCard.slug);
  }

  redirectWithNotice(returnPath, makeLive ? "card-set-live" : "card-hidden");
}

export async function moveCircleCardDisplayOrderAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const values = readCircleCardOrderFormData(formData);
  const returnPath = resolveReturnPath(values.returnPath, "/dashboard/circle-card");
  const cardId = typeof values.cardId === "string" ? values.cardId : "";
  const direction = values.direction === "up" ? -1 : values.direction === "down" ? 1 : 0;

  if (!cardId || direction === 0) {
    redirectWithError(returnPath, "card-not-found");
  }

  const cards = await prisma.circleCard.findMany({
    where: {
      userId: user.id,
      archivedAt: null
    },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true
    }
  });
  const currentIndex = cards.findIndex((card) => card.id === cardId);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0) {
    redirectWithError(returnPath, "card-not-found");
  }

  if (nextIndex < 0 || nextIndex >= cards.length) {
    redirectWithNotice(returnPath, "card-order-unchanged");
  }

  const reorderedCards = [...cards];
  const [movingCard] = reorderedCards.splice(currentIndex, 1);
  if (!movingCard) {
    redirectWithError(returnPath, "card-not-found");
  }
  reorderedCards.splice(nextIndex, 0, movingCard);

  await prisma.$transaction(
    reorderedCards.map((card, index) =>
      prisma.circleCard.update({
        where: { id: card.id },
        data: { displayOrder: index }
      })
    )
  );

  revalidatePath("/dashboard/circle-card");
  for (const card of reorderedCards) {
    revalidateCircleCardPublicPaths(card.slug);
  }
  redirectWithNotice(returnPath, "card-order-updated");
}

export async function archiveCircleCardAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const values = readCircleCardManagementFormData(formData);
  const returnPath = resolveReturnPath(values.returnPath, "/dashboard/circle-card");
  const cardId = typeof values.cardId === "string" ? values.cardId : "";

  if (!cardId) {
    redirectWithError(returnPath, "card-not-found");
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      id: cardId,
      userId: user.id,
      archivedAt: null
    },
    select: {
      id: true,
      slug: true,
      isDefaultCard: true,
      isPrimary: true,
      fullName: true
    }
  });

  if (!card) {
    redirectWithError(returnPath, "card-not-found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.circleCard.update({
      where: { id: card.id },
      data: {
        archivedAt: new Date(),
        isPublished: false,
        showInDiscover: false,
        discoverOptedInAt: null,
        isDefaultCard: false,
        isPrimary: false
      }
    });

    if (card.isDefaultCard || card.isPrimary) {
      const nextDefaultCard = await tx.circleCard.findFirst({
        where: {
          userId: user.id,
          archivedAt: null
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true
        }
      });

      if (nextDefaultCard) {
        await tx.circleCard.updateMany({
          where: {
            userId: user.id,
            archivedAt: null
          },
          data: {
            isDefaultCard: false,
            isPrimary: false
          }
        });
        await tx.circleCard.update({
          where: { id: nextDefaultCard.id },
          data: {
            isDefaultCard: true,
            isPrimary: true
          }
        });
      }
    }
  });

  await createCircleCardActivity({
    userId: user.id,
    circleCardId: card.id,
    type: "CARD_UPDATED",
    title: "Circle Card archived",
    message: `${card.fullName}'s Circle Card was archived.`,
    entityType: "CIRCLE_CARD",
    entityId: card.id,
    metadata: {
      source: "circle_card_multi_card_management"
    }
  });

  revalidateCircleCardPaths(card.slug);
  const activeCardSlugs = await prisma.circleCard.findMany({
    where: {
      userId: user.id,
      archivedAt: null
    },
    select: {
      slug: true
    }
  });
  for (const activeCard of activeCardSlugs) {
    revalidateCircleCardPublicPaths(activeCard.slug);
  }
  redirectWithNotice(returnPath, "card-archived");
}

export type CircleCardSocialLinksInlineActionResult =
  | {
      ok: true;
      notice: string;
      links: CircleCardSocialLink[];
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

export async function updateCircleCardSocialLinksInlineAction(input: {
  cardId: string;
  socialLinksJson: string;
}): Promise<CircleCardSocialLinksInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const cardId = typeof input.cardId === "string" ? input.cardId.trim() : "";
  const socialLinksJson =
    typeof input.socialLinksJson === "string" ? input.socialLinksJson.trim().slice(0, 30000) : "";

  if (!cardId) {
    return {
      ok: false,
      error: "card-not-found",
      message: "That Circle Card could not be found."
    };
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      id: cardId,
      userId: user.id
    },
    select: {
      id: true,
      slug: true
    }
  });

  if (!card) {
    return {
      ok: false,
      error: "card-not-found",
      message: "That Circle Card could not be found."
    };
  }

  const socialLinks = buildCircleCardSocialLinks({
    linkedinUrl: "",
    tiktokUrl: "",
    instagramUrl: "",
    xUrl: "",
    facebookUrl: "",
    youtubeUrl: "",
    discordUrl: "",
    socialLinksJson
  });

  await prisma.circleCard.update({
    where: { id: card.id },
    data: {
      socialLinks
    }
  });

  await createCircleCardActivity({
    userId: user.id,
    circleCardId: card.id,
    type: "CARD_UPDATED",
    title: "Social links updated",
    message: "Circle Card social links were updated.",
    entityType: "CIRCLE_CARD",
    entityId: card.id
  });

  revalidateCircleCardPublicPaths(card.slug);

  return {
    ok: true,
    notice: "Saved",
    links: readCircleCardSocialLinks(socialLinks as Prisma.JsonValue).links
  };
}

export async function updateCircleCardIdentityAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardIdentityFormSchema.safeParse(readCircleCardIdentityFormData(formData));
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "identity-invalid");
  }

  const values = parsed.data;
  const card = await prisma.circleCard.findFirst({
    where: {
      id: values.cardId,
      userId: user.id
    },
    select: {
      id: true,
      slug: true
    }
  });

  if (!card) {
    redirectWithError(returnPath, "card-not-found");
  }

  await prisma.circleCard.update({
    where: { id: card.id },
    data: {
      accountType: values.accountType,
      identityTags: values.identityTags
    }
  });

  revalidateCircleCardPaths(card.slug);
  redirectWithNotice(returnPath, "identity-updated");
}

export async function upsertCircleCardLinkAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardLinkFormSchema.safeParse(readCircleCardLinkFormData(formData));

  if (!parsed.success) {
    redirectWithError(returnPath, "custom-link-invalid");
  }

  const values = parsed.data;
  const card = await prisma.circleCard.findFirst({
    where: {
      id: values.cardId,
      userId: user.id
    },
    select: {
      id: true,
      slug: true
    }
  });

  if (!card) {
    redirectWithError(returnPath, "card-not-found");
  }

  const linkId = values.linkId || null;
  const existingLink = linkId
    ? await prisma.circleCardLink.findFirst({
        where: {
          id: linkId,
          cardId: card.id
        },
        select: {
          id: true,
          isActive: true,
          sortOrder: true,
          icon: true,
          accessCodeHash: true
        }
      })
    : null;

  if (linkId && !existingLink) {
    redirectWithError(returnPath, "custom-link-not-found");
  }

  if (!linkId) {
    const linkCount = await prisma.circleCardLink.count({
      where: { cardId: card.id }
    });

    if (linkCount >= CIRCLE_CARD_CUSTOM_LINK_TOTAL_LIMIT) {
      redirectWithError(returnPath, "custom-link-total-limit");
    }
  }

  await enforceCircleCardCustomLinkActivationLimit({
    user,
    cardId: card.id,
    linkId,
    existingIsActive: existingLink?.isActive,
    wantsActive: values.isActive,
    returnPath
  });

  const sortOrder =
    values.sortOrder ??
    existingLink?.sortOrder ??
    (await prisma.circleCardLink.count({
      where: { cardId: card.id }
    }));
  const visibility = circleCardLinkVisibilityForType(values.type, values.visibility);
  const accessCodeHash =
    visibility === "PRIVATE_CODE"
      ? values.accessCodePlain
        ? await hashCircleCardAccessCode(values.accessCodePlain)
        : existingLink?.accessCodeHash ?? null
      : null;

  if (visibility === "PRIVATE_CODE" && !accessCodeHash) {
    redirectWithError(returnPath, "custom-link-access-code-required");
  }

  const data = {
    type: values.type,
    label: values.label.trim(),
    url: nullableText(values.url),
    description: nullableText(values.description),
    icon: nullableText(values.icon) || existingLink?.icon || circleCardLinkIconForType(values.type),
    imageUrl: nullableText(values.imageUrl),
    fileUrl: nullableText(values.fileUrl),
    fileName: nullableText(values.fileName),
    fileMimeType: nullableText(values.fileMimeType),
    buttonText: nullableText(values.buttonText),
    expiresAt: values.expiresAt ?? null,
    actionMode: circleCardLinkActionModeForType(values.type, values.actionMode),
    visibility,
    accessCodeHash,
    accessCodeLastGeneratedAt:
      visibility === "PRIVATE_CODE" && values.accessCodePlain
        ? new Date()
        : visibility === "PRIVATE_CODE"
          ? undefined
          : null,
    accessCodeHint:
      visibility === "PRIVATE_CODE" ? nullableText(values.accessCodeHint) : null,
    sortOrder,
    isActive: values.isActive
  };

  try {
    if (linkId) {
      await prisma.circleCardLink.update({
        where: { id: linkId },
        data
      });
    } else {
      await prisma.circleCardLink.create({
        data: {
          ...data,
          cardId: card.id
        }
      });
    }
  } catch {
    redirectWithError(returnPath, "custom-link-save-failed");
  }

  revalidateCircleCardPaths(card.slug);
  redirectWithNotice(returnPath, linkId ? "custom-link-updated" : "custom-link-created");
}

export async function toggleCircleCardLinkAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardLinkIdSchema.safeParse(readCircleCardLinkIdFormData(formData));

  if (!parsed.success) {
    redirectWithError(returnPath, "custom-link-invalid");
  }

  const link = await prisma.circleCardLink.findFirst({
    where: {
      id: parsed.data.linkId,
      cardId: parsed.data.cardId,
      card: {
        userId: user.id
      }
    },
    select: {
      id: true,
      isActive: true,
      cardId: true,
      card: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!link) {
    redirectWithError(returnPath, "custom-link-not-found");
  }

  await enforceCircleCardCustomLinkActivationLimit({
    user,
    cardId: link.cardId,
    linkId: link.id,
    existingIsActive: link.isActive,
    wantsActive: !link.isActive,
    returnPath
  });

  await prisma.circleCardLink.update({
    where: { id: link.id },
    data: {
      isActive: !link.isActive
    }
  });

  revalidateCircleCardPaths(link.card.slug);
  redirectWithNotice(returnPath, link.isActive ? "custom-link-disabled" : "custom-link-enabled");
}

export async function deleteCircleCardLinkAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardLinkIdSchema.safeParse(readCircleCardLinkIdFormData(formData));

  if (!parsed.success) {
    redirectWithError(returnPath, "custom-link-invalid");
  }

  const link = await prisma.circleCardLink.findFirst({
    where: {
      id: parsed.data.linkId,
      cardId: parsed.data.cardId,
      card: {
        userId: user.id
      }
    },
    select: {
      id: true,
      card: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!link) {
    redirectWithError(returnPath, "custom-link-not-found");
  }

  await prisma.circleCardLink.delete({
    where: { id: link.id }
  });

  revalidateCircleCardPaths(link.card.slug);
  redirectWithNotice(returnPath, "custom-link-deleted");
}

function canManageCircleCardBusinessBlocks(user: CircleCardActionUser) {
  return resolveCircleCardAccessLevel({
    role: user.role,
    membershipTier: user.membershipTier,
    hasActiveSubscription: user.hasActiveSubscription
  }) !== "FREE";
}

async function getOwnedCircleCardForBusinessBlocks(cardId: string, userId: string) {
  return prisma.circleCard.findFirst({
    where: { id: cardId, userId, archivedAt: null },
    select: {
      id: true,
      slug: true,
      cardType: true,
      contentBlocks: true
    }
  });
}

export async function upsertCircleCardServiceAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardServiceFormSchema.safeParse({
    cardId: formData.get("cardId"),
    serviceId: formData.get("serviceId") ?? "",
    title: formData.get("title"),
    description: formData.get("description"),
    startingPrice: formData.get("startingPrice") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    ctaLabel: formData.get("ctaLabel") ?? "",
    ctaUrl: formData.get("ctaUrl") ?? "",
    isActive: formData.get("isActive")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "service-invalid");
  }

  if (!canManageCircleCardBusinessBlocks(user)) {
    redirectWithError(returnPath, "services-locked");
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card) {
    redirectWithError(returnPath, "card-not-found");
  }
  if (card.cardType !== "BUSINESS") {
    redirectWithError(returnPath, "services-business-card-required");
  }

  const services = readCircleCardServices(card.contentBlocks);
  const existingIndex = parsed.data.serviceId
    ? services.findIndex((service) => service.id === parsed.data.serviceId)
    : -1;

  if (parsed.data.serviceId && existingIndex < 0) {
    redirectWithError(returnPath, "service-not-found");
  }
  if (existingIndex < 0 && services.length >= CIRCLE_CARD_SERVICE_LIMIT) {
    redirectWithError(returnPath, "service-limit");
  }

  const service = {
    id: existingIndex >= 0 ? services[existingIndex].id : randomBytes(12).toString("hex"),
    title: parsed.data.title,
    description: parsed.data.description,
    startingPrice: parsed.data.startingPrice || null,
    imageUrl: parsed.data.imageUrl || null,
    ctaLabel: parsed.data.ctaLabel || null,
    ctaUrl: parsed.data.ctaUrl || null,
    isActive: parsed.data.isActive,
    sortOrder: existingIndex >= 0 ? services[existingIndex].sortOrder : services.length
  };
  const nextServices = [...services];

  if (existingIndex >= 0) {
    nextServices[existingIndex] = service;
  } else {
    nextServices.push(service);
  }

  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardServices(card.contentBlocks, nextServices) }
  });

  revalidateCircleCardPaths(card.slug);
  redirectWithNotice(returnPath, existingIndex >= 0 ? "service-updated" : "service-created");
}

export async function toggleCircleCardServiceAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardServiceIdSchema.safeParse({
    cardId: formData.get("cardId"),
    serviceId: formData.get("serviceId")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "service-invalid");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    redirectWithError(returnPath, "services-locked");
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card || card.cardType !== "BUSINESS") {
    redirectWithError(returnPath, card ? "services-business-card-required" : "card-not-found");
  }

  const services = readCircleCardServices(card.contentBlocks);
  const serviceIndex = services.findIndex((service) => service.id === parsed.data.serviceId);
  if (serviceIndex < 0) {
    redirectWithError(returnPath, "service-not-found");
  }

  const wasActive = services[serviceIndex].isActive;
  services[serviceIndex] = { ...services[serviceIndex], isActive: !wasActive };
  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardServices(card.contentBlocks, services) }
  });

  revalidateCircleCardPaths(card.slug);
  redirectWithNotice(returnPath, wasActive ? "service-hidden" : "service-shown");
}

export async function deleteCircleCardServiceAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardServiceIdSchema.safeParse({
    cardId: formData.get("cardId"),
    serviceId: formData.get("serviceId")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "service-invalid");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    redirectWithError(returnPath, "services-locked");
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card || card.cardType !== "BUSINESS") {
    redirectWithError(returnPath, card ? "services-business-card-required" : "card-not-found");
  }

  const services = readCircleCardServices(card.contentBlocks);
  const nextServices = services.filter((service) => service.id !== parsed.data.serviceId);
  if (nextServices.length === services.length) {
    redirectWithError(returnPath, "service-not-found");
  }

  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardServices(card.contentBlocks, nextServices) }
  });

  revalidateCircleCardPaths(card.slug);
  redirectWithNotice(returnPath, "service-deleted");
}

export async function upsertCircleCardGalleryItemAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardGalleryItemFormSchema.safeParse({
    cardId: formData.get("cardId"),
    galleryItemId: formData.get("galleryItemId") ?? "",
    imageUrl: formData.get("imageUrl"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    isActive: formData.get("isActive")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "gallery-item-invalid");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    redirectWithError(returnPath, "gallery-locked");
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card) {
    redirectWithError(returnPath, "card-not-found");
  }
  if (card.cardType !== "BUSINESS") {
    redirectWithError(returnPath, "gallery-business-card-required");
  }

  const galleryItems = readCircleCardGalleryItems(card.contentBlocks);
  const existingIndex = parsed.data.galleryItemId
    ? galleryItems.findIndex((item) => item.id === parsed.data.galleryItemId)
    : -1;

  if (parsed.data.galleryItemId && existingIndex < 0) {
    redirectWithError(returnPath, "gallery-item-not-found");
  }
  if (existingIndex < 0 && galleryItems.length >= CIRCLE_CARD_GALLERY_PRO_LIMIT) {
    redirectWithError(returnPath, "gallery-limit");
  }

  const galleryItem = {
    id: existingIndex >= 0 ? galleryItems[existingIndex].id : randomBytes(12).toString("hex"),
    imageUrl: parsed.data.imageUrl,
    title: parsed.data.title,
    description: parsed.data.description || null,
    category: parsed.data.category || null,
    isActive: parsed.data.isActive,
    sortOrder: existingIndex >= 0 ? galleryItems[existingIndex].sortOrder : galleryItems.length
  };
  const nextGalleryItems = [...galleryItems];

  if (existingIndex >= 0) {
    nextGalleryItems[existingIndex] = galleryItem;
  } else {
    nextGalleryItems.push(galleryItem);
  }

  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardGalleryItems(card.contentBlocks, nextGalleryItems) }
  });

  revalidateCircleCardPaths(card.slug);
  redirectWithNotice(returnPath, existingIndex >= 0 ? "gallery-item-updated" : "gallery-item-created");
}

export async function toggleCircleCardGalleryItemAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardGalleryItemIdSchema.safeParse({
    cardId: formData.get("cardId"),
    galleryItemId: formData.get("galleryItemId")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "gallery-item-invalid");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    redirectWithError(returnPath, "gallery-locked");
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card || card.cardType !== "BUSINESS") {
    redirectWithError(returnPath, card ? "gallery-business-card-required" : "card-not-found");
  }

  const galleryItems = readCircleCardGalleryItems(card.contentBlocks);
  const galleryItemIndex = galleryItems.findIndex((item) => item.id === parsed.data.galleryItemId);
  if (galleryItemIndex < 0) {
    redirectWithError(returnPath, "gallery-item-not-found");
  }

  const wasActive = galleryItems[galleryItemIndex].isActive;
  galleryItems[galleryItemIndex] = {
    ...galleryItems[galleryItemIndex],
    isActive: !wasActive
  };

  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardGalleryItems(card.contentBlocks, galleryItems) }
  });

  revalidateCircleCardPaths(card.slug);
  redirectWithNotice(returnPath, wasActive ? "gallery-item-hidden" : "gallery-item-shown");
}

export async function deleteCircleCardGalleryItemAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardGalleryItemIdSchema.safeParse({
    cardId: formData.get("cardId"),
    galleryItemId: formData.get("galleryItemId")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "gallery-item-invalid");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    redirectWithError(returnPath, "gallery-locked");
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card || card.cardType !== "BUSINESS") {
    redirectWithError(returnPath, card ? "gallery-business-card-required" : "card-not-found");
  }

  const galleryItems = readCircleCardGalleryItems(card.contentBlocks);
  const nextGalleryItems = galleryItems.filter((item) => item.id !== parsed.data.galleryItemId);
  if (nextGalleryItems.length === galleryItems.length) {
    redirectWithError(returnPath, "gallery-item-not-found");
  }

  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardGalleryItems(card.contentBlocks, nextGalleryItems) }
  });

  revalidateCircleCardPaths(card.slug);
  redirectWithNotice(returnPath, "gallery-item-deleted");
}

export async function upsertCircleCardGalleryItemInlineAction(
  formData: FormData
): Promise<CircleCardGalleryInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardGalleryItemFormSchema.safeParse({
    cardId: formData.get("cardId"),
    galleryItemId: formData.get("galleryItemId") ?? "",
    imageUrl: formData.get("imageUrl"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    isActive: formData.get("isActive")
  });

  if (!parsed.success) {
    return inlineCircleCardGalleryError(
      "gallery-item-invalid",
      "Upload an image and check the gallery item fields."
    );
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    return inlineCircleCardGalleryError("gallery-locked", "Gallery is included with Circle Card Pro.");
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card) {
    return inlineCircleCardGalleryError("card-not-found", "That Circle Card could not be found.");
  }
  if (card.cardType !== "BUSINESS") {
    return inlineCircleCardGalleryError(
      "gallery-business-card-required",
      "Gallery can only be added to a Business Card."
    );
  }

  const galleryItems = readCircleCardGalleryItems(card.contentBlocks);
  const existingIndex = parsed.data.galleryItemId
    ? galleryItems.findIndex((item) => item.id === parsed.data.galleryItemId)
    : -1;

  if (parsed.data.galleryItemId && existingIndex < 0) {
    return inlineCircleCardGalleryError(
      "gallery-item-not-found",
      "That gallery item could not be found on this Business Card."
    );
  }
  if (existingIndex < 0 && galleryItems.length >= CIRCLE_CARD_GALLERY_PRO_LIMIT) {
    return inlineCircleCardGalleryError(
      "gallery-limit",
      `Circle Card Pro can keep up to ${CIRCLE_CARD_GALLERY_PRO_LIMIT} gallery images.`
    );
  }

  const galleryItem: CircleCardGalleryItem = {
    id: existingIndex >= 0 ? galleryItems[existingIndex].id : randomBytes(12).toString("hex"),
    imageUrl: parsed.data.imageUrl,
    title: parsed.data.title,
    description: parsed.data.description || null,
    category: parsed.data.category || null,
    isActive: parsed.data.isActive,
    sortOrder: existingIndex >= 0 ? galleryItems[existingIndex].sortOrder : galleryItems.length
  };
  const nextGalleryItems = [...galleryItems];

  if (existingIndex >= 0) {
    nextGalleryItems[existingIndex] = galleryItem;
  } else {
    nextGalleryItems.push(galleryItem);
  }

  try {
    await prisma.circleCard.update({
      where: { id: card.id },
      data: { contentBlocks: writeCircleCardGalleryItems(card.contentBlocks, nextGalleryItems) }
    });

    revalidateCircleCardPaths(card.slug);
    return {
      ok: true,
      notice: "Gallery image saved",
      item: galleryItem
    };
  } catch {
    return inlineCircleCardGalleryError(
      "gallery-save-failed",
      "The gallery image could not be saved. Your current image is still shown."
    );
  }
}

export async function toggleCircleCardGalleryItemInlineAction(input: {
  cardId: string;
  galleryItemId: string;
}): Promise<CircleCardGalleryInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardGalleryItemIdSchema.safeParse(input);

  if (!parsed.success) {
    return inlineCircleCardGalleryError("gallery-item-invalid", "Check the gallery item and try again.");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    return inlineCircleCardGalleryError("gallery-locked", "Gallery is included with Circle Card Pro.");
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card || card.cardType !== "BUSINESS") {
    return inlineCircleCardGalleryError(
      card ? "gallery-business-card-required" : "card-not-found",
      card ? "Gallery can only be added to a Business Card." : "That Circle Card could not be found."
    );
  }

  const galleryItems = readCircleCardGalleryItems(card.contentBlocks);
  const itemIndex = galleryItems.findIndex((item) => item.id === parsed.data.galleryItemId);
  if (itemIndex < 0) {
    return inlineCircleCardGalleryError(
      "gallery-item-not-found",
      "That gallery item could not be found on this Business Card."
    );
  }

  galleryItems[itemIndex] = { ...galleryItems[itemIndex], isActive: !galleryItems[itemIndex].isActive };
  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardGalleryItems(card.contentBlocks, galleryItems) }
  });
  revalidateCircleCardPaths(card.slug);

  return {
    ok: true,
    notice: galleryItems[itemIndex].isActive ? "Gallery image shown" : "Gallery image hidden",
    item: galleryItems[itemIndex]
  };
}

export async function deleteCircleCardGalleryItemInlineAction(input: {
  cardId: string;
  galleryItemId: string;
}): Promise<CircleCardGalleryInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardGalleryItemIdSchema.safeParse(input);

  if (!parsed.success) {
    return inlineCircleCardGalleryError("gallery-item-invalid", "Check the gallery item and try again.");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    return inlineCircleCardGalleryError("gallery-locked", "Gallery is included with Circle Card Pro.");
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card || card.cardType !== "BUSINESS") {
    return inlineCircleCardGalleryError(
      card ? "gallery-business-card-required" : "card-not-found",
      card ? "Gallery can only be added to a Business Card." : "That Circle Card could not be found."
    );
  }

  const galleryItems = readCircleCardGalleryItems(card.contentBlocks);
  const nextGalleryItems = galleryItems.filter((item) => item.id !== parsed.data.galleryItemId);
  if (nextGalleryItems.length === galleryItems.length) {
    return inlineCircleCardGalleryError(
      "gallery-item-not-found",
      "That gallery item could not be found on this Business Card."
    );
  }

  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardGalleryItems(card.contentBlocks, nextGalleryItems) }
  });
  revalidateCircleCardPaths(card.slug);

  return { ok: true, notice: "Gallery image deleted" };
}

export async function upsertCircleCardProductItemInlineAction(
  formData: FormData
): Promise<CircleCardProductInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardProductItemFormSchema.safeParse({
    cardId: formData.get("cardId"),
    productItemId: formData.get("productItemId") ?? "",
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    salePrice: formData.get("salePrice") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    category: formData.get("category") ?? "",
    ctaLabel: formData.get("ctaLabel"),
    ctaUrl: formData.get("ctaUrl"),
    isFeatured: formData.get("isFeatured"),
    isActive: formData.get("isActive")
  });

  if (!parsed.success) {
    return inlineCircleCardProductError(
      "product-invalid",
      parsed.error.issues[0]?.message ?? "Check the product fields and try again."
    );
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    return inlineCircleCardProductError(
      "products-locked",
      "Products are included with Circle Card Pro."
    );
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card) {
    return inlineCircleCardProductError("card-not-found", "That Circle Card could not be found.");
  }
  if (card.cardType !== "BUSINESS") {
    return inlineCircleCardProductError(
      "products-business-card-required",
      "Products can only be added to a Business Card."
    );
  }

  const products = readCircleCardProductItems(card.contentBlocks);
  const existingIndex = parsed.data.productItemId
    ? products.findIndex((product) => product.id === parsed.data.productItemId)
    : -1;

  if (parsed.data.productItemId && existingIndex < 0) {
    return inlineCircleCardProductError(
      "product-not-found",
      "That product could not be found on this Business Card."
    );
  }
  if (existingIndex < 0 && products.length >= CIRCLE_CARD_PRODUCT_PRO_LIMIT) {
    return inlineCircleCardProductError(
      "product-limit",
      `Circle Card Pro can keep up to ${CIRCLE_CARD_PRODUCT_PRO_LIMIT} products.`
    );
  }

  const product: CircleCardProductItem = {
    id: existingIndex >= 0 ? products[existingIndex].id : randomBytes(12).toString("hex"),
    title: parsed.data.title,
    description: parsed.data.description,
    price: parsed.data.price,
    salePrice: parsed.data.salePrice || null,
    imageUrl: parsed.data.imageUrl || null,
    category: parsed.data.category || null,
    ctaLabel: parsed.data.ctaLabel,
    ctaUrl: parsed.data.ctaUrl,
    isFeatured: parsed.data.isFeatured,
    isActive: parsed.data.isActive,
    sortOrder: existingIndex >= 0 ? products[existingIndex].sortOrder : products.length
  };
  const nextProducts = [...products];

  if (existingIndex >= 0) {
    nextProducts[existingIndex] = product;
  } else {
    nextProducts.push(product);
  }

  try {
    await prisma.circleCard.update({
      where: { id: card.id },
      data: { contentBlocks: writeCircleCardProductItems(card.contentBlocks, nextProducts) }
    });
    revalidateCircleCardPaths(card.slug);
    return { ok: true, notice: "Product saved", item: product };
  } catch {
    return inlineCircleCardProductError(
      "product-save-failed",
      "The product could not be saved. Your current product is still shown."
    );
  }
}

export async function toggleCircleCardProductItemInlineAction(input: {
  cardId: string;
  productItemId: string;
}): Promise<CircleCardProductInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardProductItemIdSchema.safeParse(input);

  if (!parsed.success) {
    return inlineCircleCardProductError("product-invalid", "Check the product and try again.");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    return inlineCircleCardProductError(
      "products-locked",
      "Products are included with Circle Card Pro."
    );
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card || card.cardType !== "BUSINESS") {
    return inlineCircleCardProductError(
      card ? "products-business-card-required" : "card-not-found",
      card ? "Products can only be added to a Business Card." : "That Circle Card could not be found."
    );
  }

  const products = readCircleCardProductItems(card.contentBlocks);
  const itemIndex = products.findIndex((product) => product.id === parsed.data.productItemId);
  if (itemIndex < 0) {
    return inlineCircleCardProductError(
      "product-not-found",
      "That product could not be found on this Business Card."
    );
  }

  products[itemIndex] = { ...products[itemIndex], isActive: !products[itemIndex].isActive };
  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardProductItems(card.contentBlocks, products) }
  });
  revalidateCircleCardPaths(card.slug);

  return {
    ok: true,
    notice: products[itemIndex].isActive ? "Product shown" : "Product hidden",
    item: products[itemIndex]
  };
}

export async function deleteCircleCardProductItemInlineAction(input: {
  cardId: string;
  productItemId: string;
}): Promise<CircleCardProductInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardProductItemIdSchema.safeParse(input);

  if (!parsed.success) {
    return inlineCircleCardProductError("product-invalid", "Check the product and try again.");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    return inlineCircleCardProductError(
      "products-locked",
      "Products are included with Circle Card Pro."
    );
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card || card.cardType !== "BUSINESS") {
    return inlineCircleCardProductError(
      card ? "products-business-card-required" : "card-not-found",
      card ? "Products can only be added to a Business Card." : "That Circle Card could not be found."
    );
  }

  const products = readCircleCardProductItems(card.contentBlocks);
  const nextProducts = products.filter((product) => product.id !== parsed.data.productItemId);
  if (nextProducts.length === products.length) {
    return inlineCircleCardProductError(
      "product-not-found",
      "That product could not be found on this Business Card."
    );
  }

  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardProductItems(card.contentBlocks, nextProducts) }
  });
  revalidateCircleCardPaths(card.slug);

  return { ok: true, notice: "Product deleted" };
}

export async function upsertCircleCardReviewItemInlineAction(
  formData: FormData
): Promise<CircleCardReviewInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardReviewItemFormSchema.safeParse({
    cardId: formData.get("cardId"),
    reviewItemId: formData.get("reviewItemId") ?? "",
    reviewerName: formData.get("reviewerName"),
    reviewerRoleOrCompany: formData.get("reviewerRoleOrCompany") ?? "",
    reviewText: formData.get("reviewText"),
    rating: formData.get("rating") ?? "",
    source: formData.get("source") ?? "",
    sourceUrl: formData.get("sourceUrl") ?? "",
    isActive: formData.get("isActive")
  });

  if (!parsed.success) {
    return inlineCircleCardReviewError(
      "review-invalid",
      parsed.error.issues[0]?.message ?? "Check the testimonial fields and try again."
    );
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    return inlineCircleCardReviewError(
      "reviews-locked",
      "Reviews are included with Circle Card Pro."
    );
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card) {
    return inlineCircleCardReviewError("card-not-found", "That Circle Card could not be found.");
  }
  if (card.cardType !== "BUSINESS") {
    return inlineCircleCardReviewError(
      "reviews-business-card-required",
      "Reviews can only be added to a Business Card."
    );
  }

  const reviews = readCircleCardReviewItems(card.contentBlocks);
  const existingIndex = parsed.data.reviewItemId
    ? reviews.findIndex((item) => item.id === parsed.data.reviewItemId)
    : -1;

  if (parsed.data.reviewItemId && existingIndex < 0) {
    return inlineCircleCardReviewError(
      "review-not-found",
      "That testimonial could not be found on this Business Card."
    );
  }
  if (existingIndex < 0 && reviews.length >= CIRCLE_CARD_REVIEW_PRO_LIMIT) {
    return inlineCircleCardReviewError(
      "review-limit",
      `Circle Card Pro can keep up to ${CIRCLE_CARD_REVIEW_PRO_LIMIT} testimonials.`
    );
  }

  const review: CircleCardReviewItem = {
    id: existingIndex >= 0 ? reviews[existingIndex].id : randomBytes(12).toString("hex"),
    reviewerName: parsed.data.reviewerName,
    reviewerRoleOrCompany: parsed.data.reviewerRoleOrCompany || null,
    reviewText: parsed.data.reviewText,
    rating: parsed.data.rating ?? null,
    source: parsed.data.source || null,
    sourceUrl: parsed.data.sourceUrl || null,
    isActive: parsed.data.isActive,
    sortOrder: existingIndex >= 0 ? reviews[existingIndex].sortOrder : reviews.length
  };
  const nextReviews = [...reviews];

  if (existingIndex >= 0) {
    nextReviews[existingIndex] = review;
  } else {
    nextReviews.push(review);
  }

  try {
    await prisma.circleCard.update({
      where: { id: card.id },
      data: { contentBlocks: writeCircleCardReviewItems(card.contentBlocks, nextReviews) }
    });
    revalidateCircleCardPaths(card.slug);
    return {
      ok: true,
      notice: existingIndex >= 0 ? "Testimonial updated" : "Testimonial added",
      item: review
    };
  } catch {
    return inlineCircleCardReviewError(
      "review-save-failed",
      "The testimonial could not be saved."
    );
  }
}

export async function toggleCircleCardReviewItemInlineAction(input: {
  cardId: string;
  reviewItemId: string;
}): Promise<CircleCardReviewInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardReviewItemIdSchema.safeParse(input);

  if (!parsed.success) {
    return inlineCircleCardReviewError("review-invalid", "Check the testimonial and try again.");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    return inlineCircleCardReviewError("reviews-locked", "Reviews are included with Circle Card Pro.");
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card || card.cardType !== "BUSINESS") {
    return inlineCircleCardReviewError(
      card ? "reviews-business-card-required" : "card-not-found",
      card ? "Reviews can only be added to a Business Card." : "That Circle Card could not be found."
    );
  }

  const reviews = readCircleCardReviewItems(card.contentBlocks);
  const itemIndex = reviews.findIndex((item) => item.id === parsed.data.reviewItemId);
  if (itemIndex < 0) {
    return inlineCircleCardReviewError("review-not-found", "That testimonial could not be found.");
  }

  reviews[itemIndex] = { ...reviews[itemIndex], isActive: !reviews[itemIndex].isActive };
  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardReviewItems(card.contentBlocks, reviews) }
  });
  revalidateCircleCardPaths(card.slug);

  return {
    ok: true,
    notice: reviews[itemIndex].isActive ? "Testimonial shown" : "Testimonial hidden",
    item: reviews[itemIndex]
  };
}

export async function deleteCircleCardReviewItemInlineAction(input: {
  cardId: string;
  reviewItemId: string;
}): Promise<CircleCardReviewInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardReviewItemIdSchema.safeParse(input);

  if (!parsed.success) {
    return inlineCircleCardReviewError("review-invalid", "Check the testimonial and try again.");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    return inlineCircleCardReviewError("reviews-locked", "Reviews are included with Circle Card Pro.");
  }

  const card = await getOwnedCircleCardForBusinessBlocks(parsed.data.cardId, user.id);
  if (!card || card.cardType !== "BUSINESS") {
    return inlineCircleCardReviewError(
      card ? "reviews-business-card-required" : "card-not-found",
      card ? "Reviews can only be added to a Business Card." : "That Circle Card could not be found."
    );
  }

  const reviews = readCircleCardReviewItems(card.contentBlocks);
  const nextReviews = reviews.filter((item) => item.id !== parsed.data.reviewItemId);
  if (nextReviews.length === reviews.length) {
    return inlineCircleCardReviewError("review-not-found", "That testimonial could not be found.");
  }

  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardReviewItems(card.contentBlocks, nextReviews) }
  });
  revalidateCircleCardPaths(card.slug);

  return { ok: true, notice: "Testimonial deleted" };
}

export type CircleCardWalletTestimonialSubmitResult =
  | { ok: true; message: string }
  | { ok: false; error: string; message: string };

export type CircleCardWalletTestimonialModerationResult =
  | { ok: true; testimonialId: string; status: CircleCardWalletTestimonialStatus | "DELETED"; message: string }
  | { ok: false; error: string; message: string };

export async function submitCircleCardWalletTestimonialAction(
  formData: FormData
): Promise<CircleCardWalletTestimonialSubmitResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardWalletTestimonialSubmitSchema.safeParse({
    targetCardId: formData.get("targetCardId"),
    testimonialText: formData.get("testimonialText"),
    rating: formData.get("rating") ?? "",
    relationship: formData.get("relationship") ?? ""
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "wallet-testimonial-invalid",
      message: parsed.error.issues[0]?.message ?? "Check the testimonial and try again."
    };
  }

  const rateLimit = await consumeRateLimit({
    key: `circle-card:wallet-testimonial:${user.id}`,
    limit: 10,
    windowMs: CIRCLE_CARD_RELATIONSHIP_RATE_LIMIT_WINDOW_MS
  });
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "wallet-testimonial-rate-limited",
      message: "Please wait before sending another testimonial."
    };
  }

  const walletContact = await prisma.circleWalletContact.findFirst({
    where: {
      userId: user.id,
      cardId: parsed.data.targetCardId,
      card: {
        userId: { not: user.id },
        cardType: "BUSINESS",
        isPublished: true,
        archivedAt: null,
        user: { suspended: false }
      }
    },
    select: {
      id: true,
      card: {
        select: {
          id: true,
          userId: true,
          slug: true
        }
      }
    }
  });

  if (!walletContact?.card) {
    return {
      ok: false,
      error: "wallet-testimonial-target-ineligible",
      message: "Choose a live Business Circle Card saved in your Wallet."
    };
  }

  const existingPending = await prisma.circleCardWalletTestimonial.findFirst({
    where: {
      reviewerUserId: user.id,
      targetCardId: walletContact.card.id,
      status: "PENDING"
    },
    select: { id: true }
  });
  if (existingPending) {
    return {
      ok: false,
      error: "wallet-testimonial-pending-exists",
      message: "You already have a testimonial awaiting approval for this card."
    };
  }

  const [reviewerCard, reviewerAccount] = await Promise.all([
    getPrimaryCircleCardForUser(user.id),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true }
    })
  ]);
  const reviewerName =
    reviewerCard?.fullName || reviewerAccount?.name || reviewerAccount?.email?.split("@")[0] || "Circle Card member";
  const reviewerRoleOrCompany = reviewerCard?.businessName || null;

  try {
    await prisma.circleCardWalletTestimonial.create({
      data: {
        reviewerUserId: user.id,
        reviewerCardId: reviewerCard?.id ?? null,
        reviewerName,
        reviewerRoleOrCompany,
        targetCardId: walletContact.card.id,
        targetOwnerId: walletContact.card.userId,
        walletContactId: walletContact.id,
        testimonialText: parsed.data.testimonialText,
        rating: parsed.data.rating ?? null,
        relationship: parsed.data.relationship || null,
        status: "PENDING"
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ok: false,
        error: "wallet-testimonial-pending-exists",
        message: "You already have a testimonial awaiting approval for this card."
      };
    }

    return {
      ok: false,
      error: "wallet-testimonial-save-failed",
      message: "The testimonial could not be sent."
    };
  }

  revalidatePath("/dashboard/circle-card");
  return { ok: true, message: "Sent for approval." };
}

async function moderateCircleCardWalletTestimonial(input: {
  testimonialId: string;
  targetCardId: string;
  status: "APPROVED" | "REJECTED";
}): Promise<CircleCardWalletTestimonialModerationResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardWalletTestimonialModerationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "wallet-testimonial-invalid", message: "Check the testimonial and try again." };
  }

  const testimonial = await prisma.circleCardWalletTestimonial.findFirst({
    where: {
      id: parsed.data.testimonialId,
      targetCardId: parsed.data.targetCardId,
      targetOwnerId: user.id,
      targetCard: { archivedAt: null }
    },
    select: {
      id: true,
      status: true,
      targetCard: { select: { slug: true, cardType: true } }
    }
  });

  if (!testimonial || testimonial.targetCard.cardType !== "BUSINESS") {
    return { ok: false, error: "wallet-testimonial-not-found", message: "That testimonial could not be found." };
  }
  if (testimonial.status !== "PENDING") {
    return { ok: false, error: "wallet-testimonial-not-pending", message: "That testimonial has already been reviewed." };
  }

  const now = new Date();
  const updated = await prisma.circleCardWalletTestimonial.updateMany({
    where: { id: testimonial.id, status: "PENDING", targetOwnerId: user.id },
    data: {
      status: input.status,
      approvedAt: input.status === "APPROVED" ? now : null,
      rejectedAt: input.status === "REJECTED" ? now : null
    }
  });
  if (!updated.count) {
    return { ok: false, error: "wallet-testimonial-not-pending", message: "That testimonial has already been reviewed." };
  }

  revalidateCircleCardPaths(testimonial.targetCard.slug);
  return {
    ok: true,
    testimonialId: testimonial.id,
    status: input.status,
    message: input.status === "APPROVED" ? "Testimonial approved." : "Testimonial rejected."
  };
}

export async function approveCircleCardWalletTestimonialAction(input: {
  testimonialId: string;
  targetCardId: string;
}) {
  return moderateCircleCardWalletTestimonial({ ...input, status: "APPROVED" });
}

export async function rejectCircleCardWalletTestimonialAction(input: {
  testimonialId: string;
  targetCardId: string;
}) {
  return moderateCircleCardWalletTestimonial({ ...input, status: "REJECTED" });
}

export async function deleteCircleCardWalletTestimonialAction(input: {
  testimonialId: string;
  targetCardId: string;
}): Promise<CircleCardWalletTestimonialModerationResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardWalletTestimonialModerationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "wallet-testimonial-invalid", message: "Check the testimonial and try again." };
  }

  const testimonial = await prisma.circleCardWalletTestimonial.findFirst({
    where: {
      id: parsed.data.testimonialId,
      targetCardId: parsed.data.targetCardId,
      targetOwnerId: user.id
    },
    select: { id: true, targetCard: { select: { slug: true } } }
  });
  if (!testimonial) {
    return { ok: false, error: "wallet-testimonial-not-found", message: "That testimonial could not be found." };
  }

  await prisma.circleCardWalletTestimonial.delete({ where: { id: testimonial.id } });
  revalidateCircleCardPaths(testimonial.targetCard.slug);
  return { ok: true, testimonialId: testimonial.id, status: "DELETED", message: "Testimonial deleted." };
}

export async function saveCircleCardOpeningHoursAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const cardId = formData.get("cardId");
  const presetValue = formData.get("preset");
  const presetParsed = presetValue
    ? circleCardOpeningHoursPresetSchema.safeParse({ cardId, preset: presetValue })
    : null;
  const hoursParsed = presetValue
    ? null
    : circleCardOpeningHoursFormSchema.safeParse({
        cardId,
        days: Object.fromEntries(
          CIRCLE_CARD_WEEKDAYS.map(({ key }) => [
            key,
            {
              isOpen: formData.get(`${key}.isOpen`),
              openingTime: formData.get(`${key}.openingTime`) ?? "",
              closingTime: formData.get(`${key}.closingTime`) ?? "",
              note: formData.get(`${key}.note`) ?? ""
            }
          ])
        )
      });

  if ((presetParsed && !presetParsed.success) || (hoursParsed && !hoursParsed.success) || (!presetParsed && !hoursParsed)) {
    redirectWithError(returnPath, "opening-hours-invalid");
  }
  if (!canManageCircleCardBusinessBlocks(user)) {
    redirectWithError(returnPath, "opening-hours-locked");
  }

  const validCardId = presetParsed?.success
    ? presetParsed.data.cardId
    : hoursParsed?.success
      ? hoursParsed.data.cardId
      : "";
  const card = await getOwnedCircleCardForBusinessBlocks(validCardId, user.id);
  if (!card || card.cardType !== "BUSINESS") {
    redirectWithError(returnPath, card ? "opening-hours-business-card-required" : "card-not-found");
  }

  let openingHours: CircleCardOpeningHours;
  if (presetParsed?.success) {
    openingHours = createCircleCardOpeningHoursPreset(
      presetParsed.data.preset,
      readCircleCardOpeningHours(card.contentBlocks)
    );
  } else if (hoursParsed?.success) {
    openingHours = {
      days: Object.fromEntries(
        CIRCLE_CARD_WEEKDAYS.map(({ key }) => {
          const day = hoursParsed.data.days[key];
          return [key, {
            isOpen: day.isOpen,
            openingTime: day.isOpen ? day.openingTime || null : null,
            closingTime: day.isOpen ? day.closingTime || null : null,
            note: day.note || null
          }];
        })
      ) as CircleCardOpeningHours["days"]
    };
  } else {
    redirectWithError(returnPath, "opening-hours-invalid");
  }

  await prisma.circleCard.update({
    where: { id: card.id },
    data: { contentBlocks: writeCircleCardOpeningHours(card.contentBlocks, openingHours) }
  });

  revalidateCircleCardPaths(card.slug);
  redirectWithNotice(returnPath, presetParsed?.success ? "opening-hours-preset-applied" : "opening-hours-saved");
}

export async function moveCircleCardLinkAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardLinkMoveSchema.safeParse(readCircleCardLinkMoveFormData(formData));

  if (!parsed.success) {
    redirectWithError(returnPath, "custom-link-invalid");
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      id: parsed.data.cardId,
      userId: user.id
    },
    select: {
      id: true,
      slug: true,
      customLinks: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true
        }
      }
    }
  });

  if (!card) {
    redirectWithError(returnPath, "card-not-found");
  }

  const currentIndex = card.customLinks.findIndex((link) => link.id === parsed.data.linkId);

  if (currentIndex < 0) {
    redirectWithError(returnPath, "custom-link-not-found");
  }

  const targetIndex = parsed.data.direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= card.customLinks.length) {
    redirectWithNotice(returnPath, "custom-link-reordered");
  }

  const reorderedLinks = [...card.customLinks];
  const [movedLink] = reorderedLinks.splice(currentIndex, 1);
  reorderedLinks.splice(targetIndex, 0, movedLink);

  await prisma.$transaction(
    reorderedLinks.map((link, index) =>
      prisma.circleCardLink.update({
        where: { id: link.id },
        data: { sortOrder: index }
      })
    )
  );

  revalidateCircleCardPaths(card.slug);
  redirectWithNotice(returnPath, "custom-link-reordered");
}

export async function upsertCircleCardLinkInlineAction(
  formData: FormData
): Promise<CircleCardInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardLinkFormSchema.safeParse(readCircleCardLinkFormData(formData));

  if (!parsed.success) {
    return inlineCircleCardError("custom-link-invalid", "Check the link fields and try again.");
  }

  const values = parsed.data;
  const card = await prisma.circleCard.findFirst({
    where: {
      id: values.cardId,
      userId: user.id
    },
    select: {
      id: true,
      slug: true
    }
  });

  if (!card) {
    return inlineCircleCardError("card-not-found", "That Circle Card could not be found.");
  }

  const linkId = values.linkId || null;
  const existingLink = linkId
    ? await prisma.circleCardLink.findFirst({
        where: {
          id: linkId,
          cardId: card.id
        },
        select: {
          id: true,
          isActive: true,
          sortOrder: true,
          icon: true,
          accessCodeHash: true
        }
      })
    : null;

  if (linkId && !existingLink) {
    return inlineCircleCardError("custom-link-not-found", "That custom link could not be found.");
  }

  if (!linkId) {
    const linkCount = await prisma.circleCardLink.count({
      where: { cardId: card.id }
    });

    if (linkCount >= CIRCLE_CARD_CUSTOM_LINK_TOTAL_LIMIT) {
      return inlineCircleCardError(
        "custom-link-total-limit",
        "This Circle Card already has the maximum number of saved custom links."
      );
    }
  }

  const activeLimitExceeded = await circleCardCustomLinkActivationLimitExceeded({
    user,
    cardId: card.id,
    linkId,
    existingIsActive: existingLink?.isActive,
    wantsActive: values.isActive
  });

  if (activeLimitExceeded) {
    return inlineCircleCardError(
      "custom-link-active-limit",
      `Free Circle Cards can keep up to ${CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT} active custom links in this phase.`
    );
  }

  const sortOrder =
    values.sortOrder ??
    existingLink?.sortOrder ??
    (await prisma.circleCardLink.count({
      where: { cardId: card.id }
    }));
  const visibility = circleCardLinkVisibilityForType(values.type, values.visibility);
  const accessCodeHash =
    visibility === "PRIVATE_CODE"
      ? values.accessCodePlain
        ? await hashCircleCardAccessCode(values.accessCodePlain)
        : existingLink?.accessCodeHash ?? null
      : null;

  if (visibility === "PRIVATE_CODE" && !accessCodeHash) {
    return inlineCircleCardError(
      "custom-link-access-code-required",
      "Generate a 4-digit access code before saving this private link."
    );
  }

  const data = {
    type: values.type,
    label: values.label.trim(),
    url: nullableText(values.url),
    description: nullableText(values.description),
    icon: nullableText(values.icon) || existingLink?.icon || circleCardLinkIconForType(values.type),
    imageUrl: nullableText(values.imageUrl),
    fileUrl: nullableText(values.fileUrl),
    fileName: nullableText(values.fileName),
    fileMimeType: nullableText(values.fileMimeType),
    buttonText: nullableText(values.buttonText),
    expiresAt: values.expiresAt ?? null,
    actionMode: circleCardLinkActionModeForType(values.type, values.actionMode),
    visibility,
    accessCodeHash,
    accessCodeLastGeneratedAt:
      visibility === "PRIVATE_CODE" && values.accessCodePlain
        ? new Date()
        : visibility === "PRIVATE_CODE"
          ? undefined
          : null,
    accessCodeHint:
      visibility === "PRIVATE_CODE" ? nullableText(values.accessCodeHint) : null,
    sortOrder,
    isActive: values.isActive
  };

  try {
    const link = linkId
      ? await prisma.circleCardLink.update({
          where: { id: linkId },
          data,
          select: CIRCLE_CARD_LINK_DASHBOARD_SELECT
        })
      : await prisma.circleCardLink.create({
          data: {
            ...data,
            cardId: card.id
          },
          select: CIRCLE_CARD_LINK_DASHBOARD_SELECT
        });

    revalidateCircleCardPublicPaths(card.slug);

    return {
      ok: true,
      notice: linkId ? "Link saved." : "Link added.",
      link: serializeCircleCardDashboardLink(link)
    };
  } catch {
    return inlineCircleCardError("custom-link-save-failed", "The custom link could not be saved.");
  }
}

export async function toggleCircleCardLinkInlineAction(input: {
  cardId: string;
  linkId: string;
}): Promise<CircleCardInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardLinkIdSchema.safeParse(input);

  if (!parsed.success) {
    return inlineCircleCardError("custom-link-invalid", "Check the custom link and try again.");
  }

  const link = await prisma.circleCardLink.findFirst({
    where: {
      id: parsed.data.linkId,
      cardId: parsed.data.cardId,
      card: {
        userId: user.id
      }
    },
    select: {
      id: true,
      isActive: true,
      cardId: true,
      card: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!link) {
    return inlineCircleCardError("custom-link-not-found", "That custom link could not be found.");
  }

  const wantsActive = !link.isActive;
  const activeLimitExceeded = await circleCardCustomLinkActivationLimitExceeded({
    user,
    cardId: link.cardId,
    linkId: link.id,
    existingIsActive: link.isActive,
    wantsActive
  });

  if (activeLimitExceeded) {
    return inlineCircleCardError(
      "custom-link-active-limit",
      `Free Circle Cards can keep up to ${CIRCLE_CARD_FREE_ACTIVE_CUSTOM_LINK_LIMIT} active custom links in this phase.`
    );
  }

  const updatedLink = await prisma.circleCardLink.update({
    where: { id: link.id },
    data: {
      isActive: wantsActive
    },
    select: CIRCLE_CARD_LINK_DASHBOARD_SELECT
  });

  revalidateCircleCardPublicPaths(link.card.slug);

  return {
    ok: true,
    notice: wantsActive ? "Link activated." : "Link paused.",
    link: serializeCircleCardDashboardLink(updatedLink)
  };
}

export async function deleteCircleCardLinkInlineAction(input: {
  cardId: string;
  linkId: string;
}): Promise<CircleCardInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardLinkIdSchema.safeParse(input);

  if (!parsed.success) {
    return inlineCircleCardError("custom-link-invalid", "Check the custom link and try again.");
  }

  const link = await prisma.circleCardLink.findFirst({
    where: {
      id: parsed.data.linkId,
      cardId: parsed.data.cardId,
      card: {
        userId: user.id
      }
    },
    select: {
      id: true,
      card: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!link) {
    return inlineCircleCardError("custom-link-not-found", "That custom link could not be found.");
  }

  await prisma.circleCardLink.delete({
    where: { id: link.id }
  });

  revalidateCircleCardPublicPaths(link.card.slug);

  return {
    ok: true,
    notice: "Link deleted."
  };
}

export async function moveCircleCardLinkInlineAction(input: {
  cardId: string;
  linkId: string;
  direction: "up" | "down";
}): Promise<CircleCardInlineActionResult> {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardLinkMoveSchema.safeParse(input);

  if (!parsed.success) {
    return inlineCircleCardError("custom-link-invalid", "Check the custom link and try again.");
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      id: parsed.data.cardId,
      userId: user.id
    },
    select: {
      id: true,
      slug: true,
      customLinks: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true
        }
      }
    }
  });

  if (!card) {
    return inlineCircleCardError("card-not-found", "That Circle Card could not be found.");
  }

  const currentIndex = card.customLinks.findIndex((link) => link.id === parsed.data.linkId);

  if (currentIndex < 0) {
    return inlineCircleCardError("custom-link-not-found", "That custom link could not be found.");
  }

  const targetIndex = parsed.data.direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= card.customLinks.length) {
    return {
      ok: true,
      notice: "Links already in that order.",
      links: await readCircleCardDashboardLinks(card.id)
    };
  }

  const reorderedLinks = [...card.customLinks];
  const [movedLink] = reorderedLinks.splice(currentIndex, 1);
  reorderedLinks.splice(targetIndex, 0, movedLink);

  await prisma.$transaction(
    reorderedLinks.map((link, index) =>
      prisma.circleCardLink.update({
        where: { id: link.id },
        data: { sortOrder: index }
      })
    )
  );

  revalidateCircleCardPublicPaths(card.slug);

  return {
    ok: true,
    notice: "Links reordered.",
    links: await readCircleCardDashboardLinks(card.id)
  };
}

export async function completeCircleCardOnboardingAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = "/dashboard/circle-card/onboarding";
  const parsed = circleCardOnboardingSchema.safeParse(readCircleCardOnboardingFormData(formData));

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-onboarding");
  }

  const values = parsed.data;
  const existingCard = await prisma.circleCard.findFirst({
    where: {
      userId: user.id,
      archivedAt: null
    },
    select: { slug: true }
  });

  if (existingCard) {
    revalidateCircleCardPaths(existingCard.slug);
    redirect("/dashboard/circle-card?created=1");
  }

  const existingCardCount = await prisma.circleCard.count({
    where: {
      userId: user.id,
      archivedAt: null
    }
  });
  const accessLevel = resolveCircleCardAccessLevel({
    role: user.role,
    membershipTier: user.membershipTier,
    hasActiveSubscription: user.hasActiveSubscription
  });

  if (!canCreateCircleCard({ accessLevel, existingCardCount })) {
    redirectWithError(returnPath, "card-limit");
  }

  const slugBase = buildCircleCardSlugBase({
    slug: "",
    fullName: values.fullName,
    businessName: values.businessName
  });
  const slug = await resolveAvailableSlug({
    slugBase,
    userProvidedSlug: false
  });

  if (!slug) {
    redirectWithError(returnPath, "slug-taken");
  }

  const businessName = nullableText(values.businessName);
  const websiteUrl = nullableText(values.websiteUrl);
  const role = nullableText(values.role);
  const profileImageUrl = nullableText(values.profileImageUrl);
  const businessLogoUrl = nullableText(values.businessLogoUrl);
  const profileImagePositionX = nullableNumber(values.profileImagePositionX);
  const profileImagePositionY = nullableNumber(values.profileImagePositionY);
  const profileImageScale = nullableNumber(values.profileImageScale);
  const businessLogoPositionX = nullableNumber(values.businessLogoPositionX);
  const businessLogoPositionY = nullableNumber(values.businessLogoPositionY);
  const businessLogoScale = nullableNumber(values.businessLogoScale);
  const themeStorage = buildCircleCardThemeStorage();
  const resolvedTheme = themeStorage.theme;
  const shouldUpsertBusiness = Boolean(businessName || websiteUrl);
  const businessData = {
    ...(businessName ? { companyName: businessName } : {}),
    ...(websiteUrl ? { website: websiteUrl } : {})
  };

  let createdSlug: string;

  try {
    const card = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: values.fullName.trim(),
          ...(profileImageUrl ? { image: profileImageUrl } : {}),
          profile: {
            upsert: {
              create: {
                headline: role,
                website: websiteUrl,
                collaborationTags: [],
                ...(shouldUpsertBusiness
                  ? {
                      business: {
                        create: businessData
                      }
                    }
                  : {})
              },
              update: {
                headline: role,
                website: websiteUrl,
                ...(shouldUpsertBusiness
                  ? {
                      business: {
                        upsert: {
                          create: businessData,
                          update: businessData
                        }
                      }
                    }
                  : {})
              }
            }
          }
        }
      });

      return tx.circleCard.create({
        data: {
          slug,
          userId: user.id,
          isPrimary: true,
          isDefaultCard: true,
          displayOrder: 0,
          isPublished: values.isPublished,
          ...buildCircleCardDiscoverVisibilityData({
            showInDiscover: values.showInDiscover
          }),
          fullName: values.fullName.trim(),
          businessName,
          accountType: values.accountType,
          identityTags: values.identityTags,
          profileLayout: DEFAULT_CIRCLE_CARD_PROFILE_LAYOUT,
          role,
          tagline: nullableText(values.tagline),
          profileImageUrl,
          businessLogoUrl,
          profileImagePositionX,
          profileImagePositionY,
          profileImageScale,
          businessLogoPositionX,
          businessLogoPositionY,
          businessLogoScale,
          themePrimaryColor: themeStorage.values.themePrimaryColor,
          themeAccentColor: themeStorage.values.themeAccentColor,
          themeButtonColor: themeStorage.values.themeButtonColor,
          themeSurfaceStyle: themeStorage.values.themeSurfaceStyle,
          themePreset: themeStorage.values.themePreset,
          themeMetadata: buildCircleCardThemeMetadata(resolvedTheme) as Prisma.InputJsonValue,
          websiteUrl,
          socialLinks: {},
          contentBlocks: createEmptyCircleCardContentBlocks() as Prisma.InputJsonValue
        },
        select: { id: true, slug: true }
      });
    });
    createdSlug = card.slug;
    await createCircleCardActivity({
      userId: user.id,
      circleCardId: card.id,
      type: "CARD_CREATED",
      title: "Circle Card created",
      message: `${values.fullName.trim()}'s Circle Card was created.`,
      entityType: "CIRCLE_CARD",
      entityId: card.id,
      metadata: {
        source: "circle_card_onboarding"
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithError(returnPath, "slug-taken");
    }

    redirectWithError(returnPath, "card-save-failed");
  }

  revalidateCircleCardPaths(createdSlug);
  redirect("/dashboard/circle-card?created=1");
}

export async function saveCircleWalletContactAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/circle-card");
  const cardId = String(formData.get("cardId") || "");
  const source = String(formData.get("source") || "").trim();

  if (!cardId) {
    redirectWithError(returnPath, "missing-card");
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      id: cardId,
      isPublished: true
    },
    select: {
      id: true,
      slug: true,
      userId: true,
      fullName: true,
      businessName: true
    }
  });

  if (!card) {
    redirectWithError(returnPath, "card-not-found");
  }

  if (card.userId === user.id) {
    redirectWithNotice(returnPath, "own-card");
  }

  const existingSave = await prisma.circleWalletContact.findUnique({
    where: {
      userId_cardId: {
        userId: user.id,
        cardId: card.id
      }
    },
    select: { id: true }
  });

  if (existingSave) {
    revalidatePath("/dashboard/circle-card");
    revalidatePath(`/card/${card.slug}`);
    redirectWithNotice(returnPath, "card-already-saved");
  }

  const contact = await prisma.circleWalletContact.create({
    data: {
      userId: user.id,
      cardId: card.id
    },
    select: { id: true }
  });

  await Promise.all([
    trackCircleCardEvent({
      cardId: card.id,
      eventType: "WALLET_SAVE",
      userId: user.id,
      metadata: {
        source: source === "discover" ? "discover" : "circle_wallet"
      }
    }),
    source === "discover"
      ? trackCircleCardEvent({
          cardId: card.id,
          eventType: "DISCOVER_CARD_SAVED",
          userId: user.id,
          metadata: {
            source: "discover"
          }
        })
      : Promise.resolve({ stored: false as const }),
    createCircleCardActivity({
      userId: user.id,
      circleCardId: card.id,
      type: "CONTACT_SAVED",
      title: "Contact saved",
      message: `${circleCardDisplayName(card)} was saved to your Circle Wallet.`,
      entityType: "WALLET_CONTACT",
      entityId: contact.id,
      metadata: {
        source: source === "discover" ? "discover" : "circle_wallet",
        savedCardId: card.id
      }
    })
  ]);

  revalidatePath("/dashboard/circle-card");
  revalidatePath(`/card/${card.slug}`);
  redirectWithNotice(returnPath, "card-saved");
}

export async function spinToConnectCircleCardAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/circle-card");
  const cardId = String(formData.get("cardId") || "");

  if (!cardId) {
    redirectWithError(returnPath, "missing-card");
  }

  const [card, viewerPrimaryCard, existingConnectionCount] = await Promise.all([
    prisma.circleCard.findFirst({
      where: {
        id: cardId,
        isPublished: true,
        user: {
          suspended: false
        }
      },
      select: {
        id: true,
        slug: true,
        userId: true,
        fullName: true,
        businessName: true,
        profileLayout: true
      }
    }),
    getPrimaryCircleCardForUser(user.id),
    prisma.circleWalletContact.count({
      where: {
        userId: user.id,
        cardId: {
          not: null
        }
      }
    })
  ]);

  if (!card) {
    redirectWithError(returnPath, "card-not-found");
  }

  if (card.userId === user.id || viewerPrimaryCard?.id === card.id) {
    redirectWithNotice(returnPath, "own-card");
  }

  if (!viewerPrimaryCard) {
    await trackCircleCardEvent({
      cardId: card.id,
      eventType: "SPIN_REQUIRES_ACCOUNT",
      userId: user.id,
      metadata: {
        source: "spin_to_connect",
        reason: "missing_primary_card"
      }
    });
    redirectWithError(returnPath, "connection-primary-card-required");
  }

  const existingSave = await prisma.circleWalletContact.findUnique({
    where: {
      userId_cardId: {
        userId: user.id,
        cardId: card.id
      }
    },
    select: { id: true }
  });

  if (existingSave) {
    await trackCircleCardEvent({
      cardId: card.id,
      eventType: "SPIN_ALREADY_CONNECTED",
      userId: user.id,
      metadata: {
        source: "spin_to_connect",
        viewerCardId: viewerPrimaryCard.id
      }
    });
    revalidateCircleCardConnectionPaths([viewerPrimaryCard.slug, card.slug]);
    redirectWithSpinStatus(returnPath, "already");
  }

  const connectedAt = new Date();
  let contactId = "";

  try {
    const contact = await prisma.circleWalletContact.create({
      data: {
        userId: user.id,
        cardId: card.id,
        source: "CIRCLE_CARD",
        lastInteractionDate: connectedAt,
        relationshipContext: {
          acquisitionSource: "spin_to_connect",
          sourceCardSlug: card.slug,
          viewerCardId: viewerPrimaryCard.id,
          viewerCardSlug: viewerPrimaryCard.slug,
          connectedAt: connectedAt.toISOString(),
          trustedConnection: false,
          recommendedConnection: false,
          verifiedFounder: false,
          verifiedBusiness: false,
          bcnMember: false,
          relationshipScore: null,
          circleStrength: null
        } as Prisma.InputJsonObject
      },
      select: { id: true }
    });
    contactId = contact.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      await trackCircleCardEvent({
        cardId: card.id,
        eventType: "SPIN_ALREADY_CONNECTED",
        userId: user.id,
        metadata: {
          source: "spin_to_connect",
          viewerCardId: viewerPrimaryCard.id,
          reason: "duplicate"
        }
      });
      revalidateCircleCardConnectionPaths([viewerPrimaryCard.slug, card.slug]);
      redirectWithSpinStatus(returnPath, "already");
    }

    redirectWithError(returnPath, "card-save-failed");
  }

  const isFirstConnection = existingConnectionCount === 0;

  await Promise.all([
    trackCircleCardEvent({
      cardId: card.id,
      eventType: "WALLET_SAVE",
      userId: user.id,
      metadata: {
        source: "spin_to_connect",
        walletContactId: contactId,
        viewerCardId: viewerPrimaryCard.id
      }
    }),
    trackCircleCardEvent({
      cardId: card.id,
      eventType: "SPIN_CONNECTION_CREATED",
      userId: user.id,
      metadata: {
        source: "spin_to_connect",
        walletContactId: contactId,
        viewerCardId: viewerPrimaryCard.id,
        profileLayout: card.profileLayout
      }
    }),
    isFirstConnection
      ? trackCircleCardEvent({
          cardId: card.id,
          eventType: "FIRST_CONNECTION_CREATED",
          userId: user.id,
          metadata: {
            source: "spin_to_connect",
            walletContactId: contactId,
            viewerCardId: viewerPrimaryCard.id
          }
        })
      : Promise.resolve({ stored: false as const }),
    createCircleCardActivity({
      userId: user.id,
      circleCardId: card.id,
      type: "CONTACT_SAVED",
      title: isFirstConnection ? "Your Circle has begun" : "Circle joined",
      message: `You joined ${circleCardDisplayName(card)}'s Circle.`,
      entityType: "WALLET_CONTACT",
      entityId: contactId,
      metadata: {
        source: "spin_to_connect",
        savedCardId: card.id,
        viewerCardId: viewerPrimaryCard.id,
        firstConnection: isFirstConnection
      }
    })
  ]);

  revalidateCircleCardConnectionPaths([viewerPrimaryCard.slug, card.slug]);
  redirectWithSpinStatus(returnPath, isFirstConnection ? "first" : "connected");
}

function walletContactReturnPath(walletContactId: string) {
  return `/dashboard/circle-card/wallet?contactId=${encodeURIComponent(walletContactId)}`;
}

export async function saveBusinessCardScanWalletContactAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card?section=network#connect-hub");
  const parsed = circleWalletBusinessCardContactSchema.safeParse(
    readCircleWalletBusinessCardFormData(formData)
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "business-card-invalid");
  }

  const values = parsed.data;
  const email = normalizeCircleCardEmail(values.email);
  const websiteDomain = normalizeWebsiteDomain(values.websiteUrl);
  const [matches, duplicateContact] = await Promise.all([
    findBusinessCardCircleCardMatches({
      userId: user.id,
      email,
      websiteDomain
    }),
    findDuplicateBusinessCardWalletContact({
      userId: user.id,
      email,
      websiteDomain
    })
  ]);

  if (matches.length) {
    redirectWithNotice(
      `/dashboard/circle-card?section=network&connectCard=${encodeURIComponent(matches[0].slug)}#connect-hub`,
      "business-card-match-found"
    );
  }

  if (duplicateContact) {
    redirectWithNotice(walletContactReturnPath(duplicateContact.id), "business-card-duplicate");
  }

  const contact = await prisma.circleWalletContact.create({
    data: {
      userId: user.id,
      source: "BUSINESS_CARD_SCAN",
      fullName: nullableText(values.fullName),
      businessName: nullableText(values.businessName),
      role: nullableText(values.role),
      phone: nullableText(values.phone),
      mobilePhone: nullableText(values.mobilePhone),
      email,
      websiteUrl: nullableText(values.websiteUrl),
      websiteDomain,
      address: nullableText(values.address),
      socialLinks: buildCircleWalletBusinessCardSocialLinks({
        linkedin: values.linkedin,
        instagram: values.instagram,
        x: values.x,
        facebook: values.facebook,
        tiktok: values.tiktok,
        youtube: values.youtube
      }),
      originalCardImageUrl: nullableText(values.originalCardImageUrl),
      relationshipContext: {
        source: "business_card_scan",
        scannedAt: new Date().toISOString()
      }
    },
    select: {
      id: true
    }
  });

  await Promise.all([
    trackPrimaryCircleCardEvent({
      userId: user.id,
      eventType: "BUSINESS_CARD_CONTACT_CREATED",
      metadata: {
        source: "connect_hub",
        walletContactId: contact.id,
        hasEmail: Boolean(email),
        hasWebsite: Boolean(websiteDomain)
      }
    }),
    createCircleCardActivity({
      userId: user.id,
      circleCardId: null,
      type: "BUSINESS_CARD_CONTACT_CREATED",
      title: "Scanned contact created",
      message: `${values.fullName || "A scanned business card"} was saved to your Circle Wallet.`,
      entityType: "WALLET_CONTACT",
      entityId: contact.id,
      metadata: {
        source: "connect_hub",
        hasEmail: Boolean(email),
        hasWebsite: Boolean(websiteDomain)
      }
    })
  ]);

  revalidatePath("/dashboard/circle-card");
  redirectWithNotice(walletContactReturnPath(contact.id), "business-card-contact-created");
}

export async function saveMatchedBusinessCardCircleCardAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const parsed = circleWalletMatchedCardActionSchema.safeParse(
    readCircleWalletMatchedCardFormData(formData)
  );
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=network#connect-hub"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "business-card-invalid");
  }

  const card = await prisma.circleCard.findFirst({
    where: {
      id: parsed.data.cardId,
      isPublished: true,
      user: {
        suspended: false
      }
    },
    select: {
      id: true,
      slug: true,
      userId: true,
      fullName: true,
      businessName: true
    }
  });

  if (!card) {
    redirectWithError(returnPath, "connection-card-not-found");
  }

  if (card.userId === user.id) {
    redirectWithNotice(returnPath, "own-card");
  }

  const existingSave = await prisma.circleWalletContact.findUnique({
    where: {
      userId_cardId: {
        userId: user.id,
        cardId: card.id
      }
    },
    select: { id: true }
  });

  if (existingSave) {
    revalidateCircleCardConnectionPaths([card.slug]);
    redirectWithNotice(returnPath, "card-already-saved");
  }

  const contact = await prisma.circleWalletContact.create({
    data: {
      userId: user.id,
      cardId: card.id,
      source: "CIRCLE_CARD"
    },
    select: {
      id: true
    }
  });

  await Promise.all([
    trackCircleCardEvent({
      cardId: card.id,
      eventType: "WALLET_SAVE",
      userId: user.id,
      metadata: {
        source: "business_card_scan_match"
      }
    }),
    trackPrimaryCircleCardEvent({
      userId: user.id,
      eventType: "BUSINESS_CARD_CONTACT_CREATED",
      metadata: {
        source: "business_card_match",
        walletContactId: contact.id,
        matchedCardId: card.id
      }
    }),
    createCircleCardActivity({
      userId: user.id,
      circleCardId: card.id,
      type: "BUSINESS_CARD_CONTACT_CREATED",
      title: "Scanned contact created",
      message: `${circleCardDisplayName(card)} was saved from a scanned business card match.`,
      entityType: "WALLET_CONTACT",
      entityId: contact.id,
      metadata: {
        source: "business_card_match",
        matchedCardId: card.id
      }
    })
  ]);

  revalidateCircleCardConnectionPaths([card.slug]);
  redirectWithNotice(returnPath, "card-saved");
}

export async function saveMatchedBusinessCardAndSendConnectionRequestAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const parsed = circleWalletMatchedCardActionSchema.safeParse(
    readCircleWalletMatchedCardFormData(formData)
  );
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=network#connect-hub"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "business-card-invalid");
  }

  const [requesterCard, recipientCard] = await Promise.all([
    getPrimaryCircleCardForUser(user.id),
    prisma.circleCard.findFirst({
      where: {
        id: parsed.data.cardId,
        isPublished: true,
        user: {
          suspended: false
        }
      },
      select: {
        id: true,
        slug: true,
        userId: true,
        fullName: true,
        businessName: true
      }
    })
  ]);

  if (!requesterCard) {
    redirectWithError(returnPath, "connection-primary-card-required");
  }

  if (!recipientCard) {
    redirectWithError(returnPath, "connection-card-not-found");
  }

  if (recipientCard.userId === user.id || recipientCard.id === requesterCard.id) {
    redirectWithNotice(returnPath, "own-card");
  }

  const [savedContact, activeRequest] = await Promise.all([
    prisma.circleWalletContact.findUnique({
      where: {
        userId_cardId: {
          userId: user.id,
          cardId: recipientCard.id
        }
      },
      select: { id: true }
    }),
    findActiveCircleCardConnectionRequest({
      requesterCardId: requesterCard.id,
      recipientCardId: recipientCard.id
    })
  ]);

  let createdWalletContactId: string | null = null;

  if (!savedContact) {
    const contact = await prisma.circleWalletContact.create({
      data: {
        userId: user.id,
        cardId: recipientCard.id,
        source: "CIRCLE_CARD"
      },
      select: { id: true }
    });
    createdWalletContactId = contact.id;
  }

  if (activeRequest?.status === "ACCEPTED") {
    revalidateCircleCardConnectionPaths([requesterCard.slug, recipientCard.slug]);
    redirectWithNotice(returnPath, "connection-already-connected");
  }

  if (activeRequest?.status === "PENDING") {
    revalidateCircleCardConnectionPaths([requesterCard.slug, recipientCard.slug]);
    redirectWithNotice(
      returnPath,
      activeRequest.requesterId === user.id
        ? "connection-request-pending"
        : "connection-request-incoming"
    );
  }

  let connectionRequestId = "";

  try {
    const connectionRequest = await prisma.circleCardConnectionRequest.create({
      data: {
        requesterId: user.id,
        requesterCardId: requesterCard.id,
        recipientId: recipientCard.userId,
        recipientCardId: recipientCard.id,
        message: nullableText(parsed.data.message)
      },
      select: { id: true }
    });
    connectionRequestId = connectionRequest.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirectWithNotice(returnPath, "connection-request-pending");
    }

    redirectWithError(returnPath, "connection-request-failed");
  }

  await Promise.all([
    createdWalletContactId
      ? trackCircleCardEvent({
          cardId: recipientCard.id,
          eventType: "WALLET_SAVE",
          userId: user.id,
          metadata: {
            source: "business_card_scan_match"
          }
        })
      : Promise.resolve({ stored: false as const }),
    createdWalletContactId
      ? trackPrimaryCircleCardEvent({
          userId: user.id,
          eventType: "BUSINESS_CARD_CONTACT_CREATED",
          metadata: {
            source: "business_card_match_request",
            walletContactId: createdWalletContactId,
            matchedCardId: recipientCard.id
          }
        })
      : Promise.resolve({ stored: false as const }),
    createdWalletContactId
      ? createCircleCardActivity({
          userId: user.id,
          circleCardId: recipientCard.id,
          type: "BUSINESS_CARD_CONTACT_CREATED",
          title: "Scanned contact created",
          message: `${circleCardDisplayName(recipientCard)} was saved from a scanned business card match.`,
          entityType: "WALLET_CONTACT",
          entityId: createdWalletContactId,
          metadata: {
            source: "business_card_match_request",
            matchedCardId: recipientCard.id
          }
        })
      : Promise.resolve({ stored: false as const }),
    trackCircleCardEvent({
      cardId: recipientCard.id,
      eventType: "CONNECTION_REQUEST_SENT",
      userId: user.id,
      metadata: {
        source: "business_card_scan_match",
        requesterCardId: requesterCard.id
      }
    }),
    createCircleCardActivity({
      userId: user.id,
      circleCardId: requesterCard.id,
      type: "CONNECTION_REQUEST_SENT",
      title: "Connection request sent",
      message: `You sent a connection request to ${circleCardDisplayName(recipientCard)}.`,
      entityType: "CONNECTION_REQUEST",
      entityId: connectionRequestId,
      metadata: {
        source: "business_card_scan_match",
        recipientCardId: recipientCard.id
      }
    }),
    createCircleCardNotification({
      userId: recipientCard.userId,
      circleCardId: recipientCard.id,
      type: "CONNECTION_REQUEST",
      title: "New connection request",
      message: `${circleCardDisplayName(requesterCard)} wants to connect with you on Circle Card.`,
      entityType: "CONNECTION_REQUEST",
      entityId: connectionRequestId
    })
  ]);

  revalidateCircleCardConnectionPaths([requesterCard.slug, recipientCard.slug]);
  redirectWithNotice(returnPath, "connection-request-sent");
}

export async function generateBusinessCardClaimLinkAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const parsed = circleWalletContactIdSchema.safeParse(readCircleWalletContactIdFormData(formData));
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card/wallet"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "wallet-contact-invalid");
  }

  const contact = await prisma.circleWalletContact.findFirst({
    where: {
      id: parsed.data.walletContactId,
      userId: user.id,
      source: "BUSINESS_CARD_SCAN"
    },
    select: {
      id: true,
      email: true,
      claimToken: true
    }
  });

  if (!contact) {
    redirectWithError(returnPath, "wallet-contact-not-found");
  }

  if (!contact.email) {
    redirectWithError(returnPath, "claim-link-email-required");
  }

  const claimToken = contact.claimToken || randomBytes(32).toString("hex");

  await prisma.circleWalletContact.update({
    where: { id: contact.id },
    data: {
      claimToken,
      claimTokenGeneratedAt: new Date()
    }
  });

  await trackPrimaryCircleCardEvent({
    userId: user.id,
    eventType: "CLAIM_LINK_GENERATED",
    metadata: {
      source: "circle_wallet_business_card_scan",
      walletContactId: contact.id
    }
  });

  revalidatePath("/dashboard/circle-card");
  redirectWithNotice(returnPath, "claim-link-generated");
}

export async function resolveCircleCardLinkAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const rawLookup = String(formData.get("cardLookup") || "");
  const slug = resolveCircleCardLookupSlug(rawLookup);
  const primaryCard = await getPrimaryCircleCardForUser(user.id);

  async function trackFailedResolve(reason: string) {
    if (!primaryCard) {
      return;
    }

    await trackCircleCardEvent({
      cardId: primaryCard.id,
      eventType: "CARD_LINK_RESOLVE_FAILED",
      userId: user.id,
      metadata: {
        source: "connect_hub",
        reason
      }
    });
  }

  if (!slug) {
    await trackFailedResolve("invalid_input");
    redirect("/dashboard/circle-card?section=network&error=card-link-invalid#connect-hub");
  }

  const resolvedCard = await prisma.circleCard.findFirst({
    where: {
      slug,
      isPublished: true,
      user: {
        suspended: false
      }
    },
    select: {
      id: true,
      slug: true,
      userId: true
    }
  });

  if (!resolvedCard) {
    await trackFailedResolve("not_found");
    redirect("/dashboard/circle-card?section=network&error=card-link-not-found#connect-hub");
  }

  await trackCircleCardEvent({
    cardId: primaryCard?.id ?? resolvedCard.id,
    eventType: "CARD_LINK_RESOLVED",
    userId: user.id,
    metadata: {
      source: "connect_hub",
      resolvedSlug: resolvedCard.slug,
      ownCard: resolvedCard.userId === user.id
    }
  });

  redirect(`/dashboard/circle-card?section=network&connectCard=${encodeURIComponent(resolvedCard.slug)}#connect-hub`);
}

export async function sendCircleCardConnectionRequestAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const source = String(formData.get("source") || "").trim();
  const parsed = circleCardConnectionRequestFormSchema.safeParse({
    recipientCardId: formData.get("recipientCardId"),
    message: formData.get("message")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "connection-invalid");
  }

  await enforceCircleCardRelationshipRateLimit({
    userId: user.id,
    bucket: "connection",
    limit: 30,
    returnPath,
    error: "connection-rate-limited"
  });

  const [requesterCard, recipientCard] = await Promise.all([
    getPrimaryCircleCardForUser(user.id),
    prisma.circleCard.findFirst({
      where: {
        id: parsed.data.recipientCardId,
        isPublished: true,
        user: {
          suspended: false
        }
      },
      select: {
        id: true,
        slug: true,
        userId: true,
        fullName: true,
        businessName: true
      }
    })
  ]);

  if (!requesterCard) {
    redirectWithError(returnPath, "connection-primary-card-required");
  }

  if (!recipientCard) {
    redirectWithError(returnPath, "connection-card-not-found");
  }

  if (recipientCard.userId === user.id || recipientCard.id === requesterCard.id) {
    redirectWithNotice(returnPath, "own-card");
  }

  const savedContact = await prisma.circleWalletContact.findUnique({
    where: {
      userId_cardId: {
        userId: user.id,
        cardId: recipientCard.id
      }
    },
    select: { id: true }
  });

  if (!savedContact) {
    redirectWithError(returnPath, "connection-save-first");
  }

  const activeRequest = await findActiveCircleCardConnectionRequest({
    requesterCardId: requesterCard.id,
    recipientCardId: recipientCard.id
  });

  if (activeRequest?.status === "ACCEPTED") {
    redirectWithNotice(returnPath, "connection-already-connected");
  }

  if (activeRequest?.status === "PENDING") {
    redirectWithNotice(
      returnPath,
      activeRequest.requesterId === user.id
        ? "connection-request-pending"
        : "connection-request-incoming"
    );
  }

  let connectionRequestId = "";

  try {
    const connectionRequest = await prisma.circleCardConnectionRequest.create({
      data: {
        requesterId: user.id,
        requesterCardId: requesterCard.id,
        recipientId: recipientCard.userId,
        recipientCardId: recipientCard.id,
        message: nullableText(parsed.data.message)
      },
      select: { id: true }
    });
    connectionRequestId = connectionRequest.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirectWithNotice(returnPath, "connection-request-pending");
    }

    redirectWithError(returnPath, "connection-request-failed");
  }

  await trackCircleCardEvent({
    cardId: recipientCard.id,
    eventType: "CONNECTION_REQUEST_SENT",
    userId: user.id,
    metadata: {
      source: source === "discover" ? "discover" : "circle_card_connection",
      requesterCardId: requesterCard.id
    }
  });

  await createCircleCardNotification({
    userId: recipientCard.userId,
    circleCardId: recipientCard.id,
    type: "CONNECTION_REQUEST",
    title: "New connection request",
    message: `${circleCardDisplayName(requesterCard)} wants to connect with you on Circle Card.`,
    entityType: "CONNECTION_REQUEST",
    entityId: connectionRequestId
  });

  await createCircleCardActivity({
    userId: user.id,
    circleCardId: requesterCard.id,
    type: "CONNECTION_REQUEST_SENT",
    title: "Connection request sent",
    message: `You sent a connection request to ${circleCardDisplayName(recipientCard)}.`,
    entityType: "CONNECTION_REQUEST",
    entityId: connectionRequestId,
    metadata: {
      source: source === "discover" ? "discover" : "circle_card_connection",
      recipientCardId: recipientCard.id
    }
  });

  if (source === "discover") {
    await trackCircleCardEvent({
      cardId: recipientCard.id,
      eventType: "DISCOVER_CONNECTION_REQUEST_SENT",
      userId: user.id,
      metadata: {
        source: "discover",
        requesterCardId: requesterCard.id
      }
    });
  }

  revalidateCircleCardConnectionPaths([requesterCard.slug, recipientCard.slug]);
  redirectWithNotice(returnPath, "connection-request-sent");
}

export async function acceptCircleCardConnectionRequestAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardConnectionRequestIdSchema.safeParse({
    requestId: formData.get("requestId")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "connection-invalid");
  }

  const request = await prisma.circleCardConnectionRequest.findFirst({
    where: {
      id: parsed.data.requestId,
      recipientId: user.id,
      status: "PENDING"
    },
    select: {
      id: true,
      requesterId: true,
      requesterCardId: true,
      recipientId: true,
      recipientCardId: true,
      requesterCard: {
        select: {
          slug: true,
          fullName: true,
          businessName: true
        }
      },
      recipientCard: {
        select: {
          slug: true,
          fullName: true,
          businessName: true
        }
      }
    }
  });

  if (!request) {
    redirectWithError(returnPath, "connection-request-not-found");
  }

  let walletSaveResult: {
    createdRequesterWalletSave: boolean;
    createdRecipientWalletSave: boolean;
  };

  try {
    walletSaveResult = await prisma.$transaction(async (tx) => {
      const [requesterWalletSave, recipientWalletSave] = await Promise.all([
        tx.circleWalletContact.findUnique({
          where: {
            userId_cardId: {
              userId: request.requesterId,
              cardId: request.recipientCardId
            }
          },
          select: { id: true }
        }),
        tx.circleWalletContact.findUnique({
          where: {
            userId_cardId: {
              userId: request.recipientId,
              cardId: request.requesterCardId
            }
          },
          select: { id: true }
        })
      ]);
      const updated = await tx.circleCardConnectionRequest.updateMany({
        where: {
          id: request.id,
          recipientId: user.id,
          status: "PENDING"
        },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date()
        }
      });

      if (updated.count !== 1) {
        throw new Error("Connection request is no longer pending.");
      }

      await Promise.all([
        tx.circleWalletContact.upsert({
          where: {
            userId_cardId: {
              userId: request.requesterId,
              cardId: request.recipientCardId
            }
          },
          create: {
            userId: request.requesterId,
            cardId: request.recipientCardId
          },
          update: {}
        }),
        tx.circleWalletContact.upsert({
          where: {
            userId_cardId: {
              userId: request.recipientId,
              cardId: request.requesterCardId
            }
          },
          create: {
            userId: request.recipientId,
            cardId: request.requesterCardId
          },
          update: {}
        })
      ]);

      return {
        createdRequesterWalletSave: !requesterWalletSave,
        createdRecipientWalletSave: !recipientWalletSave
      };
    });
  } catch {
    redirectWithError(returnPath, "connection-request-not-found");
  }

  await Promise.all([
    trackCircleCardEvent({
      cardId: request.recipientCardId,
      eventType: "CONNECTION_REQUEST_ACCEPTED",
      userId: user.id,
      metadata: {
        source: "circle_card_connection",
        requestId: request.id,
        requesterCardId: request.requesterCardId
      }
    }),
    walletSaveResult.createdRequesterWalletSave
      ? trackCircleCardEvent({
          cardId: request.recipientCardId,
          eventType: "WALLET_SAVE",
          userId: request.requesterId,
          metadata: {
            source: "circle_card_connection_accept"
          }
        })
      : Promise.resolve({ stored: false as const }),
    walletSaveResult.createdRecipientWalletSave
      ? trackCircleCardEvent({
          cardId: request.requesterCardId,
          eventType: "WALLET_SAVE",
          userId: request.recipientId,
          metadata: {
            source: "circle_card_connection_accept"
          }
        })
      : Promise.resolve({ stored: false as const }),
    createCircleCardNotification({
      userId: request.requesterId,
      circleCardId: request.requesterCardId,
      type: "CONNECTION_ACCEPTED",
      title: "Connection accepted",
      message: `${circleCardDisplayName(request.recipientCard)} accepted your Circle Card connection request.`,
      entityType: "CONNECTION_REQUEST",
      entityId: request.id
    }),
    createCircleCardActivity({
      userId: request.requesterId,
      circleCardId: request.requesterCardId,
      type: "CONNECTION_ACCEPTED",
      title: "Connection accepted",
      message: `${circleCardDisplayName(request.recipientCard)} accepted your connection request.`,
      entityType: "CONNECTION_REQUEST",
      entityId: request.id,
      metadata: {
        source: "circle_card_connection",
        otherCardId: request.recipientCardId
      }
    }),
    createCircleCardActivity({
      userId: request.recipientId,
      circleCardId: request.recipientCardId,
      type: "CONNECTION_ACCEPTED",
      title: "Connection accepted",
      message: `You accepted ${circleCardDisplayName(request.requesterCard)}'s connection request.`,
      entityType: "CONNECTION_REQUEST",
      entityId: request.id,
      metadata: {
        source: "circle_card_connection",
        otherCardId: request.requesterCardId
      }
    })
  ]);

  revalidateCircleCardConnectionPaths([request.requesterCard.slug, request.recipientCard.slug]);
  redirectWithNotice(returnPath, "connection-request-accepted");
}

export async function declineCircleCardConnectionRequestAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardConnectionRequestIdSchema.safeParse({
    requestId: formData.get("requestId")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "connection-invalid");
  }

  const request = await prisma.circleCardConnectionRequest.findFirst({
    where: {
      id: parsed.data.requestId,
      recipientId: user.id,
      status: "PENDING"
    },
    select: {
      id: true,
      requesterCardId: true,
      recipientCardId: true,
      requesterCard: {
        select: {
          slug: true
        }
      },
      recipientCard: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!request) {
    redirectWithError(returnPath, "connection-request-not-found");
  }

  const updated = await prisma.circleCardConnectionRequest.updateMany({
    where: {
      id: request.id,
      recipientId: user.id,
      status: "PENDING"
    },
    data: {
      status: "DECLINED",
      respondedAt: new Date()
    }
  });

  if (updated.count !== 1) {
    redirectWithError(returnPath, "connection-request-not-found");
  }

  await trackCircleCardEvent({
    cardId: request.recipientCardId,
    eventType: "CONNECTION_REQUEST_DECLINED",
    userId: user.id,
    metadata: {
      source: "circle_card_connection",
      requestId: request.id,
      requesterCardId: request.requesterCardId
    }
  });

  revalidateCircleCardConnectionPaths([request.requesterCard.slug, request.recipientCard.slug]);
  redirectWithNotice(returnPath, "connection-request-declined");
}

export async function cancelCircleCardConnectionRequestAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardConnectionRequestIdSchema.safeParse({
    requestId: formData.get("requestId")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "connection-invalid");
  }

  const request = await prisma.circleCardConnectionRequest.findFirst({
    where: {
      id: parsed.data.requestId,
      requesterId: user.id,
      status: "PENDING"
    },
    select: {
      id: true,
      recipientCardId: true,
      requesterCard: {
        select: {
          slug: true
        }
      },
      recipientCard: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!request) {
    redirectWithError(returnPath, "connection-request-not-found");
  }

  const updated = await prisma.circleCardConnectionRequest.updateMany({
    where: {
      id: request.id,
      requesterId: user.id,
      status: "PENDING"
    },
    data: {
      status: "CANCELLED"
    }
  });

  if (updated.count !== 1) {
    redirectWithError(returnPath, "connection-request-not-found");
  }

  await trackCircleCardEvent({
    cardId: request.recipientCardId,
    eventType: "CONNECTION_REQUEST_CANCELLED",
    userId: user.id,
    metadata: {
      source: "circle_card_connection",
      requestId: request.id
    }
  });

  revalidateCircleCardConnectionPaths([request.requesterCard.slug, request.recipientCard.slug]);
  redirectWithNotice(returnPath, "connection-request-cancelled");
}

export async function createCircleCardIntroductionAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardIntroductionFormSchema.safeParse({
    personAWalletContactId: formData.get("personAWalletContactId"),
    personBWalletContactId: formData.get("personBWalletContactId"),
    reason: formData.get("reason"),
    returnPath: formData.get("returnPath")
  });
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=network#introductions"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "introduction-invalid");
  }

  await enforceCircleCardRelationshipRateLimit({
    userId: user.id,
    bucket: "introduction",
    limit: 20,
    returnPath,
    error: "introduction-rate-limited"
  });

  const values = parsed.data;

  if (values.personAWalletContactId === values.personBWalletContactId) {
    redirectWithError(returnPath, "introduction-same-contact");
  }

  const [primaryCard, walletContacts] = await Promise.all([
    getPrimaryCircleCardForUser(user.id),
    prisma.circleWalletContact.findMany({
      where: {
        userId: user.id,
        id: {
          in: [values.personAWalletContactId, values.personBWalletContactId]
        },
        cardId: {
          not: null
        }
      },
      select: {
        id: true,
        card: {
          select: {
            id: true,
            slug: true,
            userId: true,
            fullName: true,
            isPublished: true,
            user: {
              select: {
                suspended: true
              }
            }
          }
        }
      }
    })
  ]);

  if (!primaryCard) {
    redirectWithError(returnPath, "introduction-primary-card-required");
  }

  const walletContactById = new Map(walletContacts.map((contact) => [contact.id, contact]));
  const personAContact = walletContactById.get(values.personAWalletContactId);
  const personBContact = walletContactById.get(values.personBWalletContactId);

  if (!personAContact?.card || !personBContact?.card) {
    redirectWithError(returnPath, "introduction-wallet-required");
  }

  if (!personAContact.card.isPublished || !personBContact.card.isPublished) {
    redirectWithError(returnPath, "introduction-wallet-required");
  }

  if (personAContact.card.user.suspended || personBContact.card.user.suspended) {
    redirectWithError(returnPath, "introduction-wallet-required");
  }

  if (
    personAContact.card.id === personBContact.card.id ||
    personAContact.card.userId === personBContact.card.userId
  ) {
    redirectWithError(returnPath, "introduction-same-contact");
  }

  if (
    personAContact.card.id === primaryCard.id ||
    personBContact.card.id === primaryCard.id ||
    personAContact.card.userId === user.id ||
    personBContact.card.userId === user.id
  ) {
    redirectWithError(returnPath, "introduction-self");
  }

  const duplicateIntroduction = await prisma.circleCardIntroduction.findFirst({
    where: {
      introducerCardId: primaryCard.id,
      status: {
        in: [...CIRCLE_CARD_INTRODUCTION_ACTIVE_STATUSES]
      },
      OR: [
        {
          personACardId: personAContact.card.id,
          personBCardId: personBContact.card.id
        },
        {
          personACardId: personBContact.card.id,
          personBCardId: personAContact.card.id
        }
      ]
    },
    select: {
      id: true
    }
  });

  if (duplicateIntroduction) {
    redirectWithError(returnPath, "introduction-duplicate");
  }

  const introduction = await prisma.circleCardIntroduction.create({
    data: {
      introducerUserId: user.id,
      introducerCardId: primaryCard.id,
      personAUserId: personAContact.card.userId,
      personACardId: personAContact.card.id,
      personBUserId: personBContact.card.userId,
      personBCardId: personBContact.card.id,
      reason: values.reason
    },
    select: {
      id: true
    }
  });

  await Promise.all([
    trackCircleCardEvent({
      cardId: primaryCard.id,
      eventType: "INTRODUCTION_CREATED",
      userId: user.id,
      metadata: {
        source: "circle_card_introductions",
        introductionId: introduction.id,
        personAWalletContactId: personAContact.id,
        personBWalletContactId: personBContact.id,
        personACardId: personAContact.card.id,
        personBCardId: personBContact.card.id
      }
    }),
    createCircleCardActivity({
      userId: user.id,
      circleCardId: primaryCard.id,
      type: "INTRODUCTION_CREATED",
      title: "Introduction created",
      message: `You introduced ${personAContact.card.fullName} and ${personBContact.card.fullName}.`,
      entityType: "INTRODUCTION",
      entityId: introduction.id,
      metadata: {
        source: "circle_card_introductions",
        personACardId: personAContact.card.id,
        personBCardId: personBContact.card.id
      }
    }),
    createCircleCardNotification({
      userId: personAContact.card.userId,
      circleCardId: personAContact.card.id,
      type: "INTRODUCTION_RECEIVED",
      title: "New introduction",
      message: `${circleCardDisplayName(primaryCard)} introduced you to ${personBContact.card.fullName}.`,
      entityType: "INTRODUCTION",
      entityId: introduction.id
    }),
    createCircleCardNotification({
      userId: personBContact.card.userId,
      circleCardId: personBContact.card.id,
      type: "INTRODUCTION_RECEIVED",
      title: "New introduction",
      message: `${circleCardDisplayName(primaryCard)} introduced you to ${personAContact.card.fullName}.`,
      entityType: "INTRODUCTION",
      entityId: introduction.id
    })
  ]);

  revalidatePath("/dashboard/circle-card");
  redirectWithNotice(returnPath, "introduction-created");
}

export async function acceptCircleCardIntroductionAction(formData: FormData) {
  const parsed = circleCardIntroductionIdSchema.safeParse({
    introductionId: formData.get("introductionId"),
    returnPath: formData.get("returnPath")
  });
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=network#introductions"
  );
  const user = await requireCircleCardActionUser();

  if (!parsed.success) {
    redirectWithError(returnPath, "introduction-invalid");
  }

  const introduction = await prisma.circleCardIntroduction.findFirst({
    where: {
      id: parsed.data.introductionId,
      status: {
        in: [...CIRCLE_CARD_INTRODUCTION_ACTIVE_STATUSES]
      },
      OR: [{ personAUserId: user.id }, { personBUserId: user.id }]
    },
    select: {
      id: true,
      introducerUserId: true,
      introducerCardId: true,
      personAUserId: true,
      personACardId: true,
      personBUserId: true,
      personBCardId: true,
      personAAcceptedAt: true,
      personBAcceptedAt: true,
      introducerCard: {
        select: {
          slug: true,
          fullName: true,
          businessName: true
        }
      },
      personACard: {
        select: {
          slug: true,
          fullName: true,
          businessName: true
        }
      },
      personBCard: {
        select: {
          slug: true,
          fullName: true,
          businessName: true
        }
      }
    }
  });

  if (!introduction) {
    redirectWithError(returnPath, "introduction-not-found");
  }

  const actorIsPersonA = introduction.personAUserId === user.id;
  const actorAlreadyAccepted = actorIsPersonA
    ? introduction.personAAcceptedAt
    : introduction.personBAcceptedAt;

  if (actorAlreadyAccepted) {
    redirectWithNotice(returnPath, "introduction-already-accepted");
  }

  let responseResult: {
    nextStatus: "ACCEPTED" | "COMPLETED";
    connectionResult: Awaited<ReturnType<typeof ensureAcceptedIntroductionConnection>>;
  };

  try {
    responseResult = await prisma.$transaction(async (tx) => {
      const current = await tx.circleCardIntroduction.findFirst({
        where: {
          id: introduction.id,
          status: {
            in: [...CIRCLE_CARD_INTRODUCTION_ACTIVE_STATUSES]
          },
          OR: [{ personAUserId: user.id }, { personBUserId: user.id }]
        },
        select: {
          id: true,
          personAUserId: true,
          personACardId: true,
          personBUserId: true,
          personBCardId: true,
          personAAcceptedAt: true,
          personBAcceptedAt: true
        }
      });

      if (!current) {
        throw new Error("Introduction is no longer active.");
      }

      const currentActorIsPersonA = current.personAUserId === user.id;
      const currentActorAccepted = currentActorIsPersonA
        ? current.personAAcceptedAt
        : current.personBAcceptedAt;

      if (currentActorAccepted) {
        throw new Error("Introduction has already been accepted by this user.");
      }

      const otherPersonAccepted = currentActorIsPersonA
        ? Boolean(current.personBAcceptedAt)
        : Boolean(current.personAAcceptedAt);
      const nextStatus = otherPersonAccepted ? "COMPLETED" : "ACCEPTED";
      const now = new Date();

      await tx.circleCardIntroduction.update({
        where: { id: current.id },
        data: currentActorIsPersonA
          ? {
              personAAcceptedAt: now,
              status: nextStatus,
              respondedAt: now
            }
          : {
              personBAcceptedAt: now,
              status: nextStatus,
              respondedAt: now
            }
      });

      const requesterUserId = currentActorIsPersonA ? current.personAUserId : current.personBUserId;
      const requesterCardId = currentActorIsPersonA ? current.personACardId : current.personBCardId;
      const recipientUserId = currentActorIsPersonA ? current.personBUserId : current.personAUserId;
      const recipientCardId = currentActorIsPersonA ? current.personBCardId : current.personACardId;
      const connectionResult = await ensureAcceptedIntroductionConnection(tx, {
        personAUserId: current.personAUserId,
        personACardId: current.personACardId,
        personBUserId: current.personBUserId,
        personBCardId: current.personBCardId,
        requesterUserId,
        requesterCardId,
        recipientUserId,
        recipientCardId,
        now
      });

      return {
        nextStatus,
        connectionResult
      };
    });
  } catch {
    redirectWithError(returnPath, "introduction-not-found");
  }

  const analyticsEvents: Array<Promise<unknown>> = [
    trackCircleCardEvent({
      cardId: introduction.introducerCardId,
      eventType: "INTRODUCTION_ACCEPTED",
      userId: user.id,
      metadata: {
        source: "circle_card_introductions",
        introductionId: introduction.id,
        personACardId: introduction.personACardId,
        personBCardId: introduction.personBCardId,
        status: responseResult.nextStatus,
        createdConnection: responseResult.connectionResult.createdConnection,
        acceptedPendingConnection: responseResult.connectionResult.acceptedPendingConnection
      }
    })
  ];

  if (responseResult.nextStatus === "COMPLETED") {
    analyticsEvents.push(
      trackCircleCardEvent({
        cardId: introduction.introducerCardId,
        eventType: "INTRODUCTION_COMPLETED",
        userId: user.id,
        metadata: {
          source: "circle_card_introductions",
          introductionId: introduction.id,
          personACardId: introduction.personACardId,
          personBCardId: introduction.personBCardId
        }
      })
    );
  }

  if (responseResult.connectionResult.createdPersonAWalletSave) {
    analyticsEvents.push(
      trackCircleCardEvent({
        cardId: introduction.personBCardId,
        eventType: "WALLET_SAVE",
        userId: introduction.personAUserId,
        metadata: {
          source: "circle_card_introduction_accept",
          introductionId: introduction.id
        }
      })
    );
  }

  if (responseResult.connectionResult.createdPersonBWalletSave) {
    analyticsEvents.push(
      trackCircleCardEvent({
        cardId: introduction.personACardId,
        eventType: "WALLET_SAVE",
        userId: introduction.personBUserId,
        metadata: {
          source: "circle_card_introduction_accept",
          introductionId: introduction.id
        }
      })
    );
  }

  const actorCard = actorIsPersonA ? introduction.personACard : introduction.personBCard;
  const otherCard = actorIsPersonA ? introduction.personBCard : introduction.personACard;
  const actorCardId = actorIsPersonA ? introduction.personACardId : introduction.personBCardId;

  analyticsEvents.push(
    createCircleCardActivity({
      userId: user.id,
      circleCardId: actorCardId,
      type: "INTRODUCTION_ACCEPTED",
      title: "Introduction accepted",
      message: `You accepted an introduction to ${circleCardDisplayName(otherCard)}.`,
      entityType: "INTRODUCTION",
      entityId: introduction.id,
      metadata: {
        source: "circle_card_introductions",
        status: responseResult.nextStatus,
        otherCardId: actorIsPersonA ? introduction.personBCardId : introduction.personACardId
      }
    })
  );

  if (responseResult.nextStatus === "COMPLETED") {
    analyticsEvents.push(
      createCircleCardActivity({
        userId: introduction.introducerUserId,
        circleCardId: introduction.introducerCardId,
        type: "INTRODUCTION_COMPLETED",
        title: "Introduction completed",
        message: `${introduction.personACard.fullName} and ${introduction.personBCard.fullName} both accepted your introduction.`,
        entityType: "INTRODUCTION",
        entityId: introduction.id,
        metadata: {
          source: "circle_card_introductions",
          personACardId: introduction.personACardId,
          personBCardId: introduction.personBCardId
        }
      })
    );
  }

  if (introduction.introducerUserId !== user.id) {
    analyticsEvents.push(
      createCircleCardActivity({
        userId: introduction.introducerUserId,
        circleCardId: introduction.introducerCardId,
        type: "INTRODUCTION_ACCEPTED",
        title: "Introduction accepted",
        message: `${circleCardDisplayName(actorCard)} accepted your introduction.`,
        entityType: "INTRODUCTION",
        entityId: introduction.id,
        metadata: {
          source: "circle_card_introductions",
          status: responseResult.nextStatus
        }
      }),
      createCircleCardNotification({
        userId: introduction.introducerUserId,
        circleCardId: introduction.introducerCardId,
        type: "INTRODUCTION_ACCEPTED",
        title: "Introduction accepted",
        message: `${circleCardDisplayName(actorCard)} accepted your introduction.`,
        entityType: "INTRODUCTION",
        entityId: introduction.id
      })
    );
  }

  await Promise.all(analyticsEvents);

  revalidateCircleCardConnectionPaths([
    introduction.introducerCard.slug,
    introduction.personACard.slug,
    introduction.personBCard.slug
  ]);
  redirectWithNotice(
    returnPath,
    responseResult.nextStatus === "COMPLETED" ? "introduction-completed" : "introduction-accepted"
  );
}

export async function declineCircleCardIntroductionAction(formData: FormData) {
  const parsed = circleCardIntroductionIdSchema.safeParse({
    introductionId: formData.get("introductionId"),
    returnPath: formData.get("returnPath")
  });
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=network#introductions"
  );
  const user = await requireCircleCardActionUser();

  if (!parsed.success) {
    redirectWithError(returnPath, "introduction-invalid");
  }

  const introduction = await prisma.circleCardIntroduction.findFirst({
    where: {
      id: parsed.data.introductionId,
      status: {
        in: [...CIRCLE_CARD_INTRODUCTION_ACTIVE_STATUSES]
      },
      OR: [{ personAUserId: user.id }, { personBUserId: user.id }]
    },
    select: {
      id: true,
      introducerUserId: true,
      introducerCardId: true,
      personAUserId: true,
      personACardId: true,
      personBUserId: true,
      personBCardId: true,
      personAAcceptedAt: true,
      personBAcceptedAt: true,
      introducerCard: {
        select: {
          slug: true,
          fullName: true,
          businessName: true
        }
      },
      personACard: {
        select: {
          slug: true,
          fullName: true,
          businessName: true
        }
      },
      personBCard: {
        select: {
          slug: true,
          fullName: true,
          businessName: true
        }
      }
    }
  });

  if (!introduction) {
    redirectWithError(returnPath, "introduction-not-found");
  }

  const actorIsPersonA = introduction.personAUserId === user.id;
  const actorAlreadyAccepted = actorIsPersonA
    ? introduction.personAAcceptedAt
    : introduction.personBAcceptedAt;

  if (actorAlreadyAccepted) {
    redirectWithError(returnPath, "introduction-already-accepted");
  }

  const updated = await prisma.circleCardIntroduction.updateMany({
    where: {
      id: introduction.id,
      status: {
        in: [...CIRCLE_CARD_INTRODUCTION_ACTIVE_STATUSES]
      },
      OR: [{ personAUserId: user.id }, { personBUserId: user.id }],
      ...(actorIsPersonA ? { personAAcceptedAt: null } : { personBAcceptedAt: null })
    },
    data: {
      status: "DECLINED",
      respondedAt: new Date()
    }
  });

  if (updated.count !== 1) {
    redirectWithError(returnPath, "introduction-not-found");
  }

  const actorCard = actorIsPersonA ? introduction.personACard : introduction.personBCard;

  await Promise.all([
    trackCircleCardEvent({
      cardId: introduction.introducerCardId,
      eventType: "INTRODUCTION_DECLINED",
      userId: user.id,
      metadata: {
        source: "circle_card_introductions",
        introductionId: introduction.id,
        personACardId: introduction.personACardId,
        personBCardId: introduction.personBCardId
      }
    }),
    createCircleCardActivity({
      userId: user.id,
      circleCardId: actorIsPersonA ? introduction.personACardId : introduction.personBCardId,
      type: "INTRODUCTION_DECLINED",
      title: "Introduction declined",
      message: `You declined an introduction from ${circleCardDisplayName(introduction.introducerCard)}.`,
      entityType: "INTRODUCTION",
      entityId: introduction.id,
      metadata: {
        source: "circle_card_introductions",
        introducerCardId: introduction.introducerCardId
      }
    }),
    introduction.introducerUserId !== user.id
      ? createCircleCardActivity({
          userId: introduction.introducerUserId,
          circleCardId: introduction.introducerCardId,
          type: "INTRODUCTION_DECLINED",
          title: "Introduction declined",
          message: `${circleCardDisplayName(actorCard)} declined your introduction.`,
          entityType: "INTRODUCTION",
          entityId: introduction.id,
          metadata: {
            source: "circle_card_introductions",
            actorCardId: actorIsPersonA ? introduction.personACardId : introduction.personBCardId
          }
        })
      : Promise.resolve({ stored: false as const }),
    introduction.introducerUserId !== user.id
      ? createCircleCardNotification({
          userId: introduction.introducerUserId,
          circleCardId: introduction.introducerCardId,
          type: "INTRODUCTION_DECLINED",
          title: "Introduction declined",
          message: `${circleCardDisplayName(actorCard)} declined your introduction.`,
          entityType: "INTRODUCTION",
          entityId: introduction.id
        })
      : Promise.resolve({ stored: false as const })
  ]);

  revalidateCircleCardConnectionPaths([
    introduction.introducerCard.slug,
    introduction.personACard.slug,
    introduction.personBCard.slug
  ]);
  redirectWithNotice(returnPath, "introduction-declined");
}

export async function cancelCircleCardIntroductionAction(formData: FormData) {
  const parsed = circleCardIntroductionIdSchema.safeParse({
    introductionId: formData.get("introductionId"),
    returnPath: formData.get("returnPath")
  });
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=network#introductions"
  );
  const user = await requireCircleCardActionUser();

  if (!parsed.success) {
    redirectWithError(returnPath, "introduction-invalid");
  }

  const introduction = await prisma.circleCardIntroduction.findFirst({
    where: {
      id: parsed.data.introductionId,
      introducerUserId: user.id,
      status: {
        in: [...CIRCLE_CARD_INTRODUCTION_ACTIVE_STATUSES]
      }
    },
    select: {
      id: true,
      introducerCard: {
        select: {
          slug: true
        }
      },
      personACard: {
        select: {
          slug: true
        }
      },
      personBCard: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!introduction) {
    redirectWithError(returnPath, "introduction-not-found");
  }

  const updated = await prisma.circleCardIntroduction.updateMany({
    where: {
      id: introduction.id,
      introducerUserId: user.id,
      status: {
        in: [...CIRCLE_CARD_INTRODUCTION_ACTIVE_STATUSES]
      }
    },
    data: {
      status: "CANCELLED",
      respondedAt: new Date()
    }
  });

  if (updated.count !== 1) {
    redirectWithError(returnPath, "introduction-not-found");
  }

  revalidateCircleCardConnectionPaths([
    introduction.introducerCard.slug,
    introduction.personACard.slug,
    introduction.personBCard.slug
  ]);
  redirectWithNotice(returnPath, "introduction-cancelled");
}

export async function createCircleCardReferralAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardReferralFormSchema.safeParse(readCircleCardReferralFormData(formData));
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=business#referrals"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "referral-invalid");
  }

  await enforceCircleCardRelationshipRateLimit({
    userId: user.id,
    bucket: "referral",
    limit: 30,
    returnPath,
    error: "referral-rate-limited"
  });

  const values = parsed.data;
  const primaryCard = await getPrimaryCircleCardForUser(user.id);

  if (!primaryCard) {
    redirectWithError(returnPath, "referral-primary-card-required");
  }

  let recipientCard: {
    id: string;
    slug: string;
    userId: string;
    fullName: string;
    businessName: string | null;
    isPublished: boolean;
    user: {
      suspended: boolean;
    };
  } | null = null;

  if (values.recipientWalletContactId) {
    const walletContact = await prisma.circleWalletContact.findFirst({
      where: {
        id: values.recipientWalletContactId,
        userId: user.id
      },
      select: {
        id: true,
        card: {
          select: {
            id: true,
            slug: true,
            userId: true,
            fullName: true,
            businessName: true,
            isPublished: true,
            user: {
              select: {
                suspended: true
              }
            }
          }
        }
      }
    });

    if (!walletContact) {
      redirectWithError(returnPath, "wallet-contact-not-found");
    }

    recipientCard = walletContact.card;
  }

  if (!recipientCard && values.recipientCardId) {
    recipientCard = await prisma.circleCard.findFirst({
      where: {
        id: values.recipientCardId,
        isPublished: true,
        user: {
          suspended: false
        }
      },
      select: {
        id: true,
        slug: true,
        userId: true,
        fullName: true,
        businessName: true,
        isPublished: true,
        user: {
          select: {
            suspended: true
          }
        }
      }
    });

    if (!recipientCard) {
      redirectWithError(returnPath, "referral-recipient-not-found");
    }
  }

  if (recipientCard && (!recipientCard.isPublished || recipientCard.user.suspended)) {
    redirectWithError(returnPath, "referral-recipient-not-found");
  }

  if (recipientCard && (recipientCard.userId === user.id || recipientCard.id === primaryCard.id)) {
    redirectWithError(returnPath, "referral-self");
  }

  const referral = await prisma.circleCardReferral.create({
    data: {
      referrerUserId: user.id,
      referrerCardId: primaryCard.id,
      recipientUserId: recipientCard?.userId ?? null,
      recipientCardId: recipientCard?.id ?? null,
      referredContactName: values.referredContactName,
      referredContactBusiness: nullableText(values.referredContactBusiness),
      referredContactEmail: normalizeCircleCardEmail(values.referredContactEmail),
      referredContactPhone: nullableText(values.referredContactPhone),
      referredContactWebsite: nullableText(values.referredContactWebsite),
      reason: values.reason,
      estimatedValue: nullableMoney(values.estimatedValue),
      visibility: values.visibility
    },
    select: {
      id: true
    }
  });

  await Promise.all([
    trackCircleCardEvent({
      cardId: recipientCard?.id ?? primaryCard.id,
      eventType: "REFERRAL_CREATED",
      userId: user.id,
      metadata: {
        source: values.source || "circle_card_referrals",
        referralId: referral.id,
        referrerCardId: primaryCard.id,
        recipientCardId: recipientCard?.id ?? null,
        visibility: values.visibility,
        hasEstimatedValue: Boolean(values.estimatedValue)
      }
    }),
    createCircleCardActivity({
      userId: user.id,
      circleCardId: primaryCard.id,
      type: "REFERRAL_CREATED",
      title: "Referral created",
      message: recipientCard
        ? `You sent ${circleCardDisplayName(recipientCard)} a referral for ${values.referredContactName}.`
        : `You created a referral for ${values.referredContactName}.`,
      entityType: "REFERRAL",
      entityId: referral.id,
      metadata: {
        source: values.source || "circle_card_referrals",
        recipientCardId: recipientCard?.id ?? null,
        visibility: values.visibility,
        hasEstimatedValue: Boolean(values.estimatedValue)
      }
    }),
    recipientCard
      ? createCircleCardActivity({
          userId: recipientCard.userId,
          circleCardId: recipientCard.id,
          type: "REFERRAL_RECEIVED",
          title: "Referral received",
          message: `${circleCardDisplayName(primaryCard)} sent you a referral for ${values.referredContactName}.`,
          entityType: "REFERRAL",
          entityId: referral.id,
          metadata: {
            source: values.source || "circle_card_referrals",
            referrerCardId: primaryCard.id,
            visibility: values.visibility
          }
        })
      : Promise.resolve({ stored: false as const }),
    recipientCard
      ? createCircleCardNotification({
          userId: recipientCard.userId,
          circleCardId: recipientCard.id,
          type: "REFERRAL_RECEIVED",
          title: "New referral received",
          message: `${circleCardDisplayName(primaryCard)} sent you a referral for ${values.referredContactName}.`,
          entityType: "REFERRAL",
          entityId: referral.id
        })
      : Promise.resolve({ stored: false as const })
  ]);

  revalidateCircleCardConnectionPaths([primaryCard.slug, recipientCard?.slug]);
  redirectWithNotice(returnPath, "referral-created");
}

export async function updateCircleCardReferralStatusAction(formData: FormData) {
  const parsed = circleCardReferralStatusSchema.safeParse(
    readCircleCardReferralStatusFormData(formData)
  );
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=business#referrals"
  );
  const user = await requireCircleCardActionUser();

  if (!parsed.success) {
    redirectWithError(returnPath, "referral-invalid");
  }

  const values = parsed.data;
  const referral = await prisma.circleCardReferral.findFirst({
    where: {
      id: values.referralId,
      OR: [{ referrerUserId: user.id }, { recipientUserId: user.id }]
    },
    select: {
      id: true,
      referrerUserId: true,
      referrerCardId: true,
      recipientUserId: true,
      recipientCardId: true,
      status: true,
      visibility: true,
      referrerCard: {
        select: {
          slug: true,
          fullName: true,
          businessName: true
        }
      },
      recipientCard: {
        select: {
          slug: true,
          fullName: true,
          businessName: true
        }
      }
    }
  });

  if (!referral) {
    redirectWithError(returnPath, "referral-not-found");
  }

  const isReferrer = referral.referrerUserId === user.id;
  const isRecipient = referral.recipientUserId === user.id;
  const isManualReferrer = isReferrer && !referral.recipientUserId;
  const now = new Date();
  const nextStatus = values.status;
  const openStatuses = new Set<string>(CIRCLE_CARD_REFERRAL_OPEN_STATUSES);
  const canCancel = isReferrer && referral.status === "SENT" && nextStatus === "CANCELLED";
  const canRespond =
    isRecipient &&
    referral.status === "SENT" &&
    (nextStatus === "ACCEPTED" || nextStatus === "DECLINED");
  const canComplete =
    (isRecipient || isManualReferrer) &&
    openStatuses.has(referral.status) &&
    (nextStatus === "WON" || nextStatus === "LOST");

  if (!canCancel && !canRespond && !canComplete) {
    redirectWithError(returnPath, "referral-status-not-allowed");
  }

  const nextVisibility = values.visibility || referral.visibility;
  const updated = await prisma.circleCardReferral.updateMany({
    where: {
      id: referral.id,
      status: referral.status
    },
    data: {
      status: nextStatus,
      ...(nextStatus === "ACCEPTED" || nextStatus === "DECLINED"
        ? { respondedAt: now }
        : {}),
      ...(nextStatus === "WON" || nextStatus === "LOST"
        ? {
            respondedAt: now,
            completedAt: now,
            actualValue: nullableMoney(values.actualValue),
            visibility: nextVisibility
          }
        : {})
    }
  });

  if (updated.count !== 1) {
    redirectWithError(returnPath, "referral-not-found");
  }

  const referralStatusNotificationType =
    nextStatus === "ACCEPTED"
      ? "REFERRAL_ACCEPTED"
      : nextStatus === "WON"
        ? "REFERRAL_WON"
        : nextStatus === "LOST"
          ? "REFERRAL_LOST"
          : null;
  const referralStatusLabel =
    nextStatus === "ACCEPTED" ? "accepted" : nextStatus === "WON" ? "marked won" : "marked lost";

  await Promise.all([
    trackCircleCardEvent({
      cardId: referral.recipientCardId ?? referral.referrerCardId,
      eventType: circleCardReferralEventTypeForStatus(nextStatus),
      userId: user.id,
      metadata: {
        source: "circle_card_referrals",
        referralId: referral.id,
        referrerCardId: referral.referrerCardId,
        recipientCardId: referral.recipientCardId,
        status: nextStatus,
        visibility: nextVisibility,
        hasActualValue: Boolean(values.actualValue)
      }
    }),
    referralStatusNotificationType
      ? createCircleCardActivity({
          userId: user.id,
          circleCardId: isRecipient && referral.recipientCardId ? referral.recipientCardId : referral.referrerCardId,
          type: referralStatusNotificationType,
          title: `Referral ${referralStatusLabel}`,
          message: `You ${referralStatusLabel} this referral.`,
          entityType: "REFERRAL",
          entityId: referral.id,
          metadata: {
            source: "circle_card_referrals",
            status: nextStatus,
            visibility: nextVisibility,
            hasActualValue: Boolean(values.actualValue)
          }
        })
      : Promise.resolve({ stored: false as const }),
    referralStatusNotificationType && referral.referrerUserId !== user.id
      ? createCircleCardActivity({
          userId: referral.referrerUserId,
          circleCardId: referral.referrerCardId,
          type: referralStatusNotificationType,
          title: `Referral ${referralStatusLabel}`,
          message: `${referral.recipientCard ? circleCardDisplayName(referral.recipientCard) : "A referral recipient"} ${referralStatusLabel} your referral.`,
          entityType: "REFERRAL",
          entityId: referral.id,
          metadata: {
            source: "circle_card_referrals",
            status: nextStatus,
            visibility: nextVisibility,
            hasActualValue: Boolean(values.actualValue)
          }
        })
      : Promise.resolve({ stored: false as const }),
    referralStatusNotificationType && referral.referrerUserId !== user.id
      ? createCircleCardNotification({
          userId: referral.referrerUserId,
          circleCardId: referral.referrerCardId,
          type: referralStatusNotificationType,
          title: `Referral ${referralStatusLabel}`,
          message: `${referral.recipientCard ? circleCardDisplayName(referral.recipientCard) : "A referral recipient"} ${referralStatusLabel} your referral.`,
          entityType: "REFERRAL",
          entityId: referral.id
        })
      : Promise.resolve({ stored: false as const })
  ]);

  revalidateCircleCardConnectionPaths([referral.referrerCard.slug, referral.recipientCard?.slug]);
  redirectWithNotice(returnPath, circleCardReferralNoticeForStatus(nextStatus));
}

export async function createCircleCardOpportunityAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const parsed = circleCardOpportunityCreateSchema.safeParse(
    readCircleCardOpportunityCreateFormData(formData)
  );
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=business#opportunities"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "opportunity-invalid");
  }

  const values = parsed.data;
  const primaryCard = await getPrimaryCircleCardForUser(user.id);

  if (!primaryCard) {
    redirectWithError(returnPath, "opportunity-primary-card-required");
  }

  const walletContact = values.walletContactId
    ? await prisma.circleWalletContact.findFirst({
        where: {
          id: values.walletContactId,
          userId: user.id
        },
        select: { id: true }
      })
    : null;

  if (values.walletContactId && !walletContact) {
    redirectWithError(returnPath, "wallet-contact-not-found");
  }

  const now = new Date();
  const nextFollowUpAt = parseCircleWalletDateInput(values.nextFollowUpAt);
  const opportunity = await prisma.opportunity.create({
    data: {
      userId: user.id,
      circleCardId: primaryCard.id,
      walletContactId: walletContact?.id ?? null,
      title: values.title,
      description: nullableText(values.description),
      status: values.status,
      potentialValue: nullableMoney(values.potentialValue),
      currency: values.currency,
      sourceType: values.sourceType,
      lastActivityAt: now,
      nextFollowUpAt,
      notes: nullableText(values.notes),
      ...opportunityClosedAtData({
        previousStatus: "LEAD",
        nextStatus: values.status,
        now
      })
    },
    select: {
      id: true
    }
  });

  const analyticsEvents: Array<Promise<unknown>> = [
    trackCircleCardEvent({
      cardId: primaryCard.id,
      eventType: "OPPORTUNITY_CREATED",
      userId: user.id,
      metadata: {
        source: "circle_card_opportunities",
        opportunityId: opportunity.id,
        walletContactId: walletContact?.id ?? null,
        status: values.status,
        sourceType: values.sourceType,
        hasPotentialValue: Boolean(values.potentialValue)
      }
    }),
    createCircleCardActivity({
      userId: user.id,
      circleCardId: primaryCard.id,
      type: "OPPORTUNITY_CREATED",
      title: "Opportunity created",
      message: `${values.title} was added to your opportunity pipeline.`,
      entityType: "OPPORTUNITY",
      entityId: opportunity.id,
      metadata: {
        source: "circle_card_opportunities",
        walletContactId: walletContact?.id ?? null,
        status: values.status,
        sourceType: values.sourceType,
        hasPotentialValue: Boolean(values.potentialValue)
      }
    })
  ];

  if (nextFollowUpAt) {
    analyticsEvents.push(
      trackCircleCardEvent({
        cardId: primaryCard.id,
        eventType: "OPPORTUNITY_FOLLOWUP_SET",
        userId: user.id,
        metadata: {
          source: "circle_card_opportunities",
          opportunityId: opportunity.id,
          sourceType: values.sourceType
        }
      })
    );
  }

  await Promise.all(analyticsEvents);

  revalidatePath("/dashboard/circle-card");
  redirectWithNotice(returnPath, "opportunity-created");
}

export async function updateCircleCardOpportunityAction(formData: FormData) {
  const parsed = circleCardOpportunityUpdateSchema.safeParse(
    readCircleCardOpportunityUpdateFormData(formData)
  );
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=business#opportunities"
  );
  const user = await requireCircleCardActionUser();

  if (!parsed.success) {
    redirectWithError(returnPath, "opportunity-invalid");
  }

  const values = parsed.data;
  const opportunity = await prisma.opportunity.findFirst({
    where: {
      id: values.opportunityId,
      userId: user.id
    },
    select: {
      id: true,
      circleCardId: true,
      status: true,
      closedAt: true,
      nextFollowUpAt: true
    }
  });

  if (!opportunity) {
    redirectWithError(returnPath, "opportunity-not-found");
  }

  const now = new Date();
  const nextFollowUpAt = parseCircleWalletDateInput(values.nextFollowUpAt);
  const lastActivityAt = parseCircleWalletDateInput(values.lastActivityAt);
  const statusChanged = opportunity.status !== values.status;
  const followUpChanged = dateOnlyKey(opportunity.nextFollowUpAt) !== dateOnlyKey(nextFollowUpAt);

  await prisma.opportunity.update({
    where: { id: opportunity.id },
    data: {
      title: values.title,
      description: nullableText(values.description),
      status: values.status,
      potentialValue: nullableMoney(values.potentialValue),
      currency: values.currency,
      sourceType: values.sourceType,
      lastActivityAt,
      nextFollowUpAt,
      notes: nullableText(values.notes),
      ...opportunityClosedAtData({
        previousStatus: opportunity.status,
        nextStatus: values.status,
        existingClosedAt: opportunity.closedAt,
        now
      })
    }
  });

  const terminalOpportunityActivityType =
    statusChanged && values.status === "WON"
      ? "OPPORTUNITY_WON"
      : statusChanged && values.status === "LOST"
        ? "OPPORTUNITY_LOST"
        : null;

  const analyticsEvents: Array<Promise<unknown>> = [
    trackCircleCardEvent({
      cardId: opportunity.circleCardId,
      eventType: "OPPORTUNITY_UPDATED",
      userId: user.id,
      metadata: {
        source: "circle_card_opportunities",
        opportunityId: opportunity.id,
        status: values.status,
        sourceType: values.sourceType,
        hasPotentialValue: Boolean(values.potentialValue)
      }
    })
  ];

  if (!terminalOpportunityActivityType) {
    analyticsEvents.push(createCircleCardActivity({
      userId: user.id,
      circleCardId: opportunity.circleCardId,
      type: "OPPORTUNITY_UPDATED",
      title: "Opportunity updated",
      message: `${values.title} was updated in your opportunity pipeline.`,
      entityType: "OPPORTUNITY",
      entityId: opportunity.id,
      metadata: {
        source: "circle_card_opportunities",
        status: values.status,
        sourceType: values.sourceType,
        hasPotentialValue: Boolean(values.potentialValue)
      }
    }));
  }

  if (followUpChanged && nextFollowUpAt) {
    analyticsEvents.push(
      trackCircleCardEvent({
        cardId: opportunity.circleCardId,
        eventType: "OPPORTUNITY_FOLLOWUP_SET",
        userId: user.id,
        metadata: {
          source: "circle_card_opportunities",
          opportunityId: opportunity.id,
          sourceType: values.sourceType
        }
      })
    );
  }

  if (statusChanged && values.status === "WON") {
    analyticsEvents.push(
      trackCircleCardEvent({
        cardId: opportunity.circleCardId,
        eventType: "OPPORTUNITY_WON",
        userId: user.id,
        metadata: {
          source: "circle_card_opportunities",
          opportunityId: opportunity.id,
          sourceType: values.sourceType
        }
      }),
      createCircleCardActivity({
        userId: user.id,
        circleCardId: opportunity.circleCardId,
        type: "OPPORTUNITY_WON",
        title: "Opportunity won",
        message: `${values.title} was marked won.`,
        entityType: "OPPORTUNITY",
        entityId: opportunity.id,
        metadata: {
          source: "circle_card_opportunities",
          sourceType: values.sourceType
        }
      })
    );
  }

  if (statusChanged && values.status === "LOST") {
    analyticsEvents.push(
      trackCircleCardEvent({
        cardId: opportunity.circleCardId,
        eventType: "OPPORTUNITY_LOST",
        userId: user.id,
        metadata: {
          source: "circle_card_opportunities",
          opportunityId: opportunity.id,
          sourceType: values.sourceType
        }
      }),
      createCircleCardActivity({
        userId: user.id,
        circleCardId: opportunity.circleCardId,
        type: "OPPORTUNITY_LOST",
        title: "Opportunity lost",
        message: `${values.title} was marked lost.`,
        entityType: "OPPORTUNITY",
        entityId: opportunity.id,
        metadata: {
          source: "circle_card_opportunities",
          sourceType: values.sourceType
        }
      })
    );
  }

  await Promise.all(analyticsEvents);

  revalidatePath("/dashboard/circle-card");
  redirectWithNotice(returnPath, circleCardOpportunityNoticeForStatus(values.status));
}

export async function updateCircleCardOpportunityStatusAction(formData: FormData) {
  const parsed = circleCardOpportunityStatusSchema.safeParse(
    readCircleCardOpportunityStatusFormData(formData)
  );
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card?section=business#opportunities"
  );
  const user = await requireCircleCardActionUser();

  if (!parsed.success) {
    redirectWithError(returnPath, "opportunity-invalid");
  }

  const values = parsed.data;
  const opportunity = await prisma.opportunity.findFirst({
    where: {
      id: values.opportunityId,
      userId: user.id
    },
    select: {
      id: true,
      circleCardId: true,
      title: true,
      status: true,
      closedAt: true,
      sourceType: true
    }
  });

  if (!opportunity) {
    redirectWithError(returnPath, "opportunity-not-found");
  }

  const now = new Date();
  const statusChanged = opportunity.status !== values.status;

  await prisma.opportunity.update({
    where: { id: opportunity.id },
    data: {
      status: values.status,
      lastActivityAt: now,
      ...opportunityClosedAtData({
        previousStatus: opportunity.status,
        nextStatus: values.status,
        existingClosedAt: opportunity.closedAt,
        now
      })
    }
  });

  const terminalOpportunityActivityType =
    statusChanged && values.status === "WON"
      ? "OPPORTUNITY_WON"
      : statusChanged && values.status === "LOST"
        ? "OPPORTUNITY_LOST"
        : null;

  const analyticsEvents: Array<Promise<unknown>> = [
    trackCircleCardEvent({
      cardId: opportunity.circleCardId,
      eventType: "OPPORTUNITY_UPDATED",
      userId: user.id,
      metadata: {
        source: "circle_card_opportunities",
        opportunityId: opportunity.id,
        status: values.status,
        sourceType: opportunity.sourceType
      }
    })
  ];

  if (!terminalOpportunityActivityType) {
    analyticsEvents.push(createCircleCardActivity({
      userId: user.id,
      circleCardId: opportunity.circleCardId,
      type: "OPPORTUNITY_UPDATED",
      title: "Opportunity updated",
      message: `${opportunity.title} moved to ${values.status.toLowerCase().replace(/_/g, " ")}.`,
      entityType: "OPPORTUNITY",
      entityId: opportunity.id,
      metadata: {
        source: "circle_card_opportunities",
        status: values.status,
        sourceType: opportunity.sourceType
      }
    }));
  }

  if (statusChanged && values.status === "WON") {
    analyticsEvents.push(
      trackCircleCardEvent({
        cardId: opportunity.circleCardId,
        eventType: "OPPORTUNITY_WON",
        userId: user.id,
        metadata: {
          source: "circle_card_opportunities",
          opportunityId: opportunity.id,
          sourceType: opportunity.sourceType
        }
      }),
      createCircleCardActivity({
        userId: user.id,
        circleCardId: opportunity.circleCardId,
        type: "OPPORTUNITY_WON",
        title: "Opportunity won",
        message: `${opportunity.title} was marked won.`,
        entityType: "OPPORTUNITY",
        entityId: opportunity.id,
        metadata: {
          source: "circle_card_opportunities",
          sourceType: opportunity.sourceType
        }
      })
    );
  }

  if (statusChanged && values.status === "LOST") {
    analyticsEvents.push(
      trackCircleCardEvent({
        cardId: opportunity.circleCardId,
        eventType: "OPPORTUNITY_LOST",
        userId: user.id,
        metadata: {
          source: "circle_card_opportunities",
          opportunityId: opportunity.id,
          sourceType: opportunity.sourceType
        }
      }),
      createCircleCardActivity({
        userId: user.id,
        circleCardId: opportunity.circleCardId,
        type: "OPPORTUNITY_LOST",
        title: "Opportunity lost",
        message: `${opportunity.title} was marked lost.`,
        entityType: "OPPORTUNITY",
        entityId: opportunity.id,
        metadata: {
          source: "circle_card_opportunities",
          sourceType: opportunity.sourceType
        }
      })
    );
  }

  await Promise.all(analyticsEvents);

  revalidatePath("/dashboard/circle-card");
  redirectWithNotice(returnPath, circleCardOpportunityNoticeForStatus(values.status));
}

export async function removeCircleWalletContactAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const walletContactId = String(formData.get("walletContactId") || "");
  const cardId = String(formData.get("cardId") || "");

  if (!cardId && !walletContactId) {
    redirectWithError(returnPath, "missing-card");
  }

  const savedContact = await prisma.circleWalletContact.findFirst({
    where: walletContactId
      ? {
          id: walletContactId,
          userId: user.id
        }
      : {
          userId: user.id,
          cardId
        },
    select: {
      id: true,
      cardId: true,
      card: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!savedContact) {
    redirectWithNotice(returnPath, "card-removed");
  }

  const removedRecommendations = await prisma.circleCardRecommendation.updateMany({
    where: {
      walletContactId: savedContact.id,
      recommenderUserId: user.id,
      status: {
        not: "REMOVED"
      }
    },
    data: {
      status: "REMOVED"
    }
  });

  await prisma.circleWalletContact.delete({
    where: {
      id: savedContact.id
    }
  });

  if (savedContact.cardId) {
    await trackCircleCardEvent({
      cardId: savedContact.cardId,
      eventType: "WALLET_REMOVE",
      userId: user.id,
      metadata: {
        source: "circle_wallet"
      }
    });
  } else {
    await trackPrimaryCircleCardEvent({
      userId: user.id,
      eventType: "WALLET_REMOVE",
      metadata: {
        source: "circle_wallet_business_card_scan",
        walletContactId: savedContact.id
      }
    });
  }

  if (removedRecommendations.count > 0) {
    if (savedContact.cardId) {
      await trackCircleCardEvent({
        cardId: savedContact.cardId,
        eventType: "RECOMMENDATION_REMOVED",
        userId: user.id,
        metadata: {
          source: "circle_wallet_contact_removed",
          walletContactId: savedContact.id,
          count: removedRecommendations.count
        }
      });
    } else {
      await trackPrimaryCircleCardEvent({
        userId: user.id,
        eventType: "RECOMMENDATION_REMOVED",
        metadata: {
          source: "circle_wallet_contact_removed",
          walletContactId: savedContact.id,
          count: removedRecommendations.count
        }
      });
    }
  }

  revalidatePath("/dashboard/circle-card");
  if (savedContact.card?.slug) {
    revalidatePath(`/card/${savedContact.card.slug}`);
  }
  redirectWithNotice(returnPath, "card-removed");
}

export async function toggleCircleWalletFavouriteAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const walletContactId = String(formData.get("walletContactId") || "");

  if (!walletContactId) {
    redirectWithError(returnPath, "wallet-contact-missing");
  }

  const savedContact = await prisma.circleWalletContact.findFirst({
    where: {
      id: walletContactId,
      userId: user.id
    },
    select: {
      id: true,
      favourite: true,
      card: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!savedContact) {
    redirectWithError(returnPath, "wallet-contact-not-found");
  }

  await prisma.circleWalletContact.update({
    where: { id: savedContact.id },
    data: {
      favourite: !savedContact.favourite
    }
  });

  revalidatePath("/dashboard/circle-card");
  if (savedContact.card?.slug) {
    revalidatePath(`/card/${savedContact.card.slug}`);
  }
  redirectWithNotice(returnPath, savedContact.favourite ? "favourite-removed" : "favourite-added");
}

export async function updateCircleWalletContactDetailsAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleWalletContactDetailsSchema.safeParse({
    walletContactId: formData.get("walletContactId"),
    notes: formData.get("notes"),
    metAt: formData.get("metAt"),
    followUpDate: formData.get("followUpDate"),
    lastInteractionDate: formData.get("lastInteractionDate"),
    lastInteractionQuick: formData.get("lastInteractionQuick") || "",
    category: formData.get("category"),
    tagsInput: formData.get("tagsInput")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "wallet-contact-invalid");
  }

  const [savedContact, primaryCard] = await Promise.all([
    prisma.circleWalletContact.findFirst({
      where: {
        id: parsed.data.walletContactId,
        userId: user.id
      },
      select: {
        id: true,
        fullName: true,
        businessName: true,
        notes: true,
        followUpDate: true,
        category: true,
        card: {
          select: {
            slug: true
          }
        }
      }
    }),
    prisma.circleCard.findFirst({
      where: {
        userId: user.id,
        archivedAt: null
      },
      orderBy: [{ isDefaultCard: "desc" }, { isPrimary: "desc" }, { displayOrder: "asc" }],
      select: {
        id: true
      }
    })
  ]);

  if (!savedContact) {
    redirectWithError(returnPath, "wallet-contact-not-found");
  }

  const nextNotes = nullableText(parsed.data.notes);
  const nextFollowUpDate = parseCircleWalletDateInput(parsed.data.followUpDate);
  const nextLastInteractionDate = resolveCircleWalletLastInteractionDate({
    dateInput: parsed.data.lastInteractionDate,
    quick: parsed.data.lastInteractionQuick
  });
  const nextCategory = nullableText(parsed.data.category);

  await prisma.circleWalletContact.update({
    where: { id: savedContact.id },
    data: {
      notes: nextNotes,
      metAt: nullableText(parsed.data.metAt),
      followUpDate: nextFollowUpDate,
      lastInteractionDate: nextLastInteractionDate,
      category: nextCategory,
      tags: parseCircleWalletTagsInput(parsed.data.tagsInput)
    }
  });

  const previousFollowUp = savedContact.followUpDate?.toISOString().slice(0, 10) ?? null;
  const nextFollowUp = nextFollowUpDate?.toISOString().slice(0, 10) ?? null;
  const relationshipEvents = [
    savedContact.notes !== nextNotes ? "CONTACT_NOTE_UPDATED" : null,
    previousFollowUp !== nextFollowUp ? "CONTACT_FOLLOWUP_SET" : null,
    savedContact.category !== nextCategory ? "CONTACT_CATEGORY_SET" : null
  ].filter((eventType): eventType is "CONTACT_NOTE_UPDATED" | "CONTACT_FOLLOWUP_SET" | "CONTACT_CATEGORY_SET" =>
    Boolean(eventType)
  );

  if (primaryCard && relationshipEvents.length) {
    await Promise.all([
      ...relationshipEvents.map((eventType) =>
        trackCircleCardEvent({
          cardId: primaryCard.id,
          eventType,
          userId: user.id,
          metadata: {
            source: "circle_wallet_personal_crm",
            walletContactId: savedContact.id
          }
        })
      ),
      createCircleCardActivity({
        userId: user.id,
        circleCardId: primaryCard.id,
        type: "CONTACT_UPDATED",
        title: "Contact updated",
        message: `${savedContact.fullName || savedContact.businessName || "A Circle Wallet contact"} was updated.`,
        entityType: "WALLET_CONTACT",
        entityId: savedContact.id,
        metadata: {
          source: "circle_wallet_personal_crm",
          changedFields: relationshipEvents
        }
      })
    ]);
  }

  revalidatePath("/dashboard/circle-card");
  if (savedContact.card?.slug) {
    revalidatePath(`/card/${savedContact.card.slug}`);
  }
  redirectWithNotice(returnPath, "relationship-updated");
}

export async function upsertCircleCardRecommendationAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card/wallet");
  const parsed = circleCardRecommendationFormSchema.safeParse(
    readCircleCardRecommendationFormData(formData)
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "recommendation-invalid");
  }

  const values = parsed.data;
  const [primaryCard, walletContact] = await Promise.all([
    getPrimaryCircleCardForUser(user.id),
    prisma.circleWalletContact.findFirst({
      where: {
        id: values.walletContactId,
        userId: user.id
      },
      select: {
        id: true,
        source: true,
        cardId: true,
        fullName: true,
        businessName: true,
        card: {
          select: {
            id: true,
            slug: true,
            userId: true,
            fullName: true,
            businessName: true,
            isPublished: true,
            user: {
              select: {
                suspended: true
              }
            }
          }
        }
      }
    })
  ]);

  if (!primaryCard) {
    redirectWithError(returnPath, "recommendation-primary-card-required");
  }

  if (!walletContact) {
    redirectWithError(returnPath, "wallet-contact-not-found");
  }

  if (walletContact.card && (walletContact.card.userId === user.id || walletContact.card.id === primaryCard.id)) {
    redirectWithError(returnPath, "recommendation-self");
  }

  if (values.visibility === "PUBLIC" && !walletContact.card) {
    redirectWithError(returnPath, "recommendation-public-card-required");
  }

  if (values.visibility === "PUBLIC" && walletContact.card?.user.suspended) {
    redirectWithError(returnPath, "recommendation-public-card-required");
  }

  const recommendationId = values.recommendationId || null;
  const existingRecommendation = recommendationId
    ? await prisma.circleCardRecommendation.findFirst({
        where: {
          id: recommendationId,
          recommenderUserId: user.id,
          status: {
            not: "REMOVED"
          }
        },
        select: {
          id: true,
          walletContactId: true,
          visibility: true
        }
      })
    : null;

  if (recommendationId && !existingRecommendation) {
    redirectWithError(returnPath, "recommendation-not-found");
  }

  if (existingRecommendation?.walletContactId && existingRecommendation.walletContactId !== walletContact.id) {
    redirectWithError(returnPath, "recommendation-not-found");
  }

  if (values.visibility === "PUBLIC" && walletContact.card?.id) {
    const duplicatePublicRecommendation = await prisma.circleCardRecommendation.findFirst({
      where: {
        recommenderCardId: primaryCard.id,
        recommendedCardId: walletContact.card.id,
        category: values.category,
        visibility: "PUBLIC",
        status: "ACTIVE",
        ...(recommendationId ? { NOT: { id: recommendationId } } : {})
      },
      select: {
        id: true
      }
    });

    if (duplicatePublicRecommendation) {
      redirectWithError(returnPath, "recommendation-duplicate");
    }
  }

  const targetCardId = walletContact.card?.id ?? primaryCard.id;
  const eventType = recommendationId ? "RECOMMENDATION_UPDATED" : "RECOMMENDATION_CREATED";
  const recommendationData = {
    recommenderUserId: user.id,
    recommenderCardId: primaryCard.id,
    recommendedCardId: walletContact.card?.id ?? null,
    recommendedUserId: walletContact.card?.userId ?? null,
    walletContactId: walletContact.id,
    category: values.category,
    reason: nullableText(values.reason),
    visibility: values.visibility,
    status: "ACTIVE" as const
  };

  const savedRecommendation = recommendationId
    ? await prisma.circleCardRecommendation.update({
      where: { id: recommendationId },
      data: recommendationData,
      select: { id: true }
    })
    : await prisma.circleCardRecommendation.create({
      data: recommendationData,
      select: { id: true }
    });

  const shouldNotifyRecommendedUser =
    values.visibility === "PUBLIC" &&
    Boolean(walletContact.card?.userId) &&
    walletContact.card?.userId !== user.id &&
    (!recommendationId || existingRecommendation?.visibility !== "PUBLIC");

  await Promise.all([
    trackCircleCardEvent({
      cardId: targetCardId,
      eventType,
      userId: user.id,
      metadata: {
        source: "circle_wallet_recommendations",
        walletContactId: walletContact.id,
        recommenderCardId: primaryCard.id,
        category: values.category,
        visibility: values.visibility,
        visibilityLabel: circleCardRecommendationVisibilityLabel(values.visibility)
      }
    }),
    !recommendationId
      ? createCircleCardActivity({
          userId: user.id,
          circleCardId: primaryCard.id,
          type: "RECOMMENDATION_CREATED",
          title: "Recommendation created",
          message: `You recommended ${walletContact.card ? circleCardDisplayName(walletContact.card) : walletContact.fullName || walletContact.businessName || "a Circle Wallet contact"} for ${values.category}.`,
          entityType: "RECOMMENDATION",
          entityId: savedRecommendation.id,
          metadata: {
            source: "circle_wallet_recommendations",
            walletContactId: walletContact.id,
            recommendedCardId: walletContact.card?.id ?? null,
            category: values.category,
            visibility: values.visibility
          }
        })
      : Promise.resolve({ stored: false as const }),
    shouldNotifyRecommendedUser && walletContact.card
      ? createCircleCardActivity({
          userId: walletContact.card.userId,
          circleCardId: walletContact.card.id,
          type: "RECOMMENDATION_RECEIVED",
          title: "Recommendation received",
          message: `${circleCardDisplayName(primaryCard)} publicly recommended you for ${values.category}.`,
          entityType: "RECOMMENDATION",
          entityId: savedRecommendation.id,
          metadata: {
            source: "circle_wallet_recommendations",
            recommenderCardId: primaryCard.id,
            category: values.category
          }
        })
      : Promise.resolve({ stored: false as const }),
    shouldNotifyRecommendedUser && walletContact.card
      ? createCircleCardNotification({
          userId: walletContact.card.userId,
          circleCardId: walletContact.card.id,
          type: "RECOMMENDATION_RECEIVED",
          title: "New public recommendation",
          message: `${circleCardDisplayName(primaryCard)} publicly recommended you for ${values.category}.`,
          entityType: "RECOMMENDATION",
          entityId: savedRecommendation.id
        })
      : Promise.resolve({ stored: false as const })
  ]);

  revalidatePath("/dashboard/circle-card");
  if (walletContact.card?.slug) {
    revalidatePath(`/card/${walletContact.card.slug}`);
  }
  redirectWithNotice(returnPath, recommendationId ? "recommendation-updated" : "recommendation-created");
}

export async function updateCircleCardRecommendationStatusAction(formData: FormData) {
  const parsed = circleCardRecommendationStatusSchema.safeParse(
    readCircleCardRecommendationStatusFormData(formData)
  );
  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : formData.get("returnPath"),
    "/dashboard/circle-card/wallet"
  );
  const user = await requireCircleCardActionUser();

  if (!parsed.success) {
    redirectWithError(returnPath, "recommendation-invalid");
  }

  const recommendation = await prisma.circleCardRecommendation.findFirst({
    where: {
      id: parsed.data.recommendationId,
      recommenderUserId: user.id,
      status: {
        not: "REMOVED"
      }
    },
    select: {
      id: true,
      category: true,
      visibility: true,
      recommenderCardId: true,
      recommendedCardId: true,
      walletContactId: true,
      recommendedCard: {
        select: {
          slug: true
        }
      }
    }
  });

  if (!recommendation) {
    redirectWithError(returnPath, "recommendation-not-found");
  }

  await prisma.circleCardRecommendation.update({
    where: { id: recommendation.id },
    data: {
      status: parsed.data.status
    }
  });

  await trackCircleCardEvent({
    cardId: recommendation.recommendedCardId ?? recommendation.recommenderCardId,
    eventType: parsed.data.status === "REMOVED" ? "RECOMMENDATION_REMOVED" : "RECOMMENDATION_UPDATED",
    userId: user.id,
    metadata: {
      source: "circle_wallet_recommendations",
      walletContactId: recommendation.walletContactId,
      recommenderCardId: recommendation.recommenderCardId,
      category: recommendation.category,
      visibility: recommendation.visibility,
      status: parsed.data.status
    }
  });

  revalidatePath("/dashboard/circle-card");
  if (recommendation.recommendedCard?.slug) {
    revalidatePath(`/card/${recommendation.recommendedCard.slug}`);
  }
  redirectWithNotice(
    returnPath,
    parsed.data.status === "REMOVED" ? "recommendation-removed" : "recommendation-hidden"
  );
}

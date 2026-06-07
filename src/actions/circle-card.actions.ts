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
  buildCircleWalletBusinessCardSocialLinks,
  CIRCLE_CARD_FILE_LINK_TYPES,
  circleCardConnectionRequestFormSchema,
  circleCardConnectionRequestIdSchema,
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
  normalizeWebsiteDomain,
  parseCircleWalletDateInput,
  parseCircleWalletTagsInput,
  resolveCircleCardLookupSlug,
  resolveCircleWalletLastInteractionDate
} from "@/lib/circle-card/schema";
import {
  circleCardRecommendationFormSchema,
  circleCardRecommendationStatusSchema,
  circleCardRecommendationVisibilityLabel
} from "@/lib/circle-card/recommendations";
import {
  canCreateCircleCard,
  isCircleCardFreeAccount,
  resolveCircleCardAccessLevel
} from "@/lib/circle-card/permissions";
import { hasEntitledSubscription } from "@/lib/membership/access";
import { prisma } from "@/lib/prisma";
import {
  findBusinessCardCircleCardMatches,
  findDuplicateBusinessCardWalletContact,
  trackCircleCardEvent
} from "@/server/circle-card";
import { hashCircleCardAccessCode } from "@/server/circle-card/link-access.service";

const CIRCLE_CARD_FORM_FIELDS = [
  "cardId",
  "slug",
  "fullName",
  "businessName",
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
  "isPublished"
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
  "role",
  "tagline",
  "websiteUrl",
  "isPublished"
] as const;

const CIRCLE_CARD_LINK_FORM_FIELDS = [
  "cardId",
  "linkId",
  "type",
  "label",
  "url",
  "description",
  "icon",
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

const FREE_ACTIVE_CUSTOM_LINK_LIMIT = 5;
const CIRCLE_CARD_CUSTOM_LINK_TOTAL_LIMIT = 24;
const CIRCLE_CARD_PRIVATE_LINK_TYPES = new Set<string>(CIRCLE_CARD_FILE_LINK_TYPES);

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

function resolveReturnPath(value: FormDataEntryValue | null | undefined, fallback: string) {
  return safeRedirectPath(typeof value === "string" ? value : null, fallback);
}

function readCircleCardFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_FORM_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
}

function readCircleCardOnboardingFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_ONBOARDING_FIELDS.map((field) => [field, formData.get(field) ?? ""])
  );
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
      isPrimary: true
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      userId: true
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

function isFreeCircleCardActionUser(user: CircleCardActionUser) {
  return isCircleCardFreeAccount({
    role: user.role,
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

async function enforceCircleCardCustomLinkActivationLimit(input: {
  user: CircleCardActionUser;
  cardId: string;
  linkId?: string | null;
  existingIsActive?: boolean;
  wantsActive: boolean;
  returnPath: string;
}) {
  if (!input.wantsActive || input.existingIsActive || !isFreeCircleCardActionUser(input.user)) {
    return;
  }

  const activeLinkCount = await prisma.circleCardLink.count({
    where: {
      cardId: input.cardId,
      isActive: true,
      ...(input.linkId ? { NOT: { id: input.linkId } } : {})
    }
  });

  if (activeLinkCount >= FREE_ACTIVE_CUSTOM_LINK_LIMIT) {
    redirectWithError(input.returnPath, "custom-link-active-limit");
  }
}

export async function upsertCircleCardAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleCardFormSchema.safeParse(readCircleCardFormData(formData));

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-card");
  }

  const values = parsed.data;
  const cardId = values.cardId || null;
  const existingCard = cardId
    ? await prisma.circleCard.findFirst({
        where: {
          id: cardId,
          userId: user.id
        },
        select: {
          id: true,
          slug: true
        }
      })
    : null;

  if (cardId && !existingCard) {
    redirectWithError(returnPath, "card-not-found");
  }

  if (!cardId) {
    const existingCardCount = await prisma.circleCard.count({
      where: { userId: user.id }
    });
    const accessLevel = resolveCircleCardAccessLevel({
      role: user.role,
      membershipTier: user.membershipTier,
      hasActiveSubscription: user.hasActiveSubscription
    });

    if (!canCreateCircleCard({ accessLevel, existingCardCount })) {
      redirectWithError(returnPath, "card-limit");
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
    redirectWithError(returnPath, "slug-taken");
  }

  const socialLinks = buildCircleCardSocialLinks(values);
  const data = {
    slug,
    fullName: values.fullName.trim(),
    businessName: nullableText(values.businessName),
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
    websiteUrl: nullableText(values.websiteUrl),
    email: nullableText(values.email),
    phone: nullableText(values.phone),
    location: nullableText(values.location),
    socialLinks,
    isPublished: values.isPublished
  };

  try {
    if (cardId) {
      await prisma.circleCard.update({
        where: { id: cardId },
        data
      });

      revalidateCircleCardPaths(existingCard?.slug);
      revalidateCircleCardPaths(slug);
      redirectWithNotice(returnPath, "card-updated");
    }

    const cardCount = await prisma.circleCard.count({
      where: { userId: user.id }
    });
    const card = await prisma.circleCard.create({
      data: {
        ...data,
        userId: user.id,
        isPrimary: cardCount === 0
      },
      select: { slug: true }
    });

    revalidateCircleCardPaths(card.slug);
    redirectWithNotice(returnPath, "card-created");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithError(returnPath, "slug-taken");
    }

    redirectWithError(returnPath, "card-save-failed");
  }
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

export async function completeCircleCardOnboardingAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = "/dashboard/circle-card/onboarding";
  const parsed = circleCardOnboardingSchema.safeParse(readCircleCardOnboardingFormData(formData));

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid-onboarding");
  }

  const values = parsed.data;
  const existingCard = await prisma.circleCard.findFirst({
    where: { userId: user.id },
    select: { slug: true }
  });

  if (existingCard) {
    revalidateCircleCardPaths(existingCard.slug);
    redirect("/dashboard/circle-card?created=1");
  }

  const existingCardCount = await prisma.circleCard.count({
    where: { userId: user.id }
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
          isPublished: values.isPublished,
          fullName: values.fullName.trim(),
          businessName,
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
          websiteUrl,
          socialLinks: {}
        },
        select: { slug: true }
      });
    });
    createdSlug = card.slug;
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
      userId: true
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

  await prisma.circleWalletContact.create({
    data: {
      userId: user.id,
      cardId: card.id
    }
  });

  await trackCircleCardEvent({
    cardId: card.id,
    eventType: "WALLET_SAVE",
    userId: user.id,
    metadata: {
      source: source === "discover" ? "discover" : "circle_wallet"
    }
  });

  if (source === "discover") {
    await trackCircleCardEvent({
      cardId: card.id,
      eventType: "DISCOVER_CARD_SAVED",
      userId: user.id,
      metadata: {
        source: "discover"
      }
    });
  }

  revalidatePath("/dashboard/circle-card");
  revalidatePath(`/card/${card.slug}`);
  redirectWithNotice(returnPath, "card-saved");
}

function walletContactReturnPath(walletContactId: string) {
  return `/dashboard/circle-card?contactId=${encodeURIComponent(walletContactId)}#wallet`;
}

export async function saveBusinessCardScanWalletContactAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card#connect-hub");
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
      `/dashboard/circle-card?connectCard=${encodeURIComponent(matches[0].slug)}#connect-hub`,
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

  await trackPrimaryCircleCardEvent({
    userId: user.id,
    eventType: "BUSINESS_CARD_CONTACT_CREATED",
    metadata: {
      source: "connect_hub",
      walletContactId: contact.id,
      hasEmail: Boolean(email),
      hasWebsite: Boolean(websiteDomain)
    }
  });

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
    "/dashboard/circle-card#connect-hub"
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
      userId: true
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
    "/dashboard/circle-card#connect-hub"
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
        userId: true
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

  try {
    await prisma.circleCardConnectionRequest.create({
      data: {
        requesterId: user.id,
        requesterCardId: requesterCard.id,
        recipientId: recipientCard.userId,
        recipientCardId: recipientCard.id,
        message: nullableText(parsed.data.message)
      }
    });
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
    trackCircleCardEvent({
      cardId: recipientCard.id,
      eventType: "CONNECTION_REQUEST_SENT",
      userId: user.id,
      metadata: {
        source: "business_card_scan_match",
        requesterCardId: requesterCard.id
      }
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
    "/dashboard/circle-card#wallet"
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
    redirect("/dashboard/circle-card?error=card-link-invalid#connect-hub");
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
    redirect("/dashboard/circle-card?error=card-link-not-found#connect-hub");
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

  redirect(`/dashboard/circle-card?connectCard=${encodeURIComponent(resolvedCard.slug)}#connect-hub`);
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
        userId: true
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

  try {
    await prisma.circleCardConnectionRequest.create({
      data: {
        requesterId: user.id,
        requesterCardId: requesterCard.id,
        recipientId: recipientCard.userId,
        recipientCardId: recipientCard.id,
        message: nullableText(parsed.data.message)
      }
    });
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
      : Promise.resolve({ stored: false as const })
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
        isPrimary: true
      },
      orderBy: [{ updatedAt: "desc" }],
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
    await Promise.all(
      relationshipEvents.map((eventType) =>
        trackCircleCardEvent({
          cardId: primaryCard.id,
          eventType,
          userId: user.id,
          metadata: {
            source: "circle_wallet_personal_crm",
            walletContactId: savedContact.id
          }
        })
      )
    );
  }

  revalidatePath("/dashboard/circle-card");
  if (savedContact.card?.slug) {
    revalidatePath(`/card/${savedContact.card.slug}`);
  }
  redirectWithNotice(returnPath, "relationship-updated");
}

export async function upsertCircleCardRecommendationAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card#wallet");
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
          walletContactId: true
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

  if (recommendationId) {
    await prisma.circleCardRecommendation.update({
      where: { id: recommendationId },
      data: recommendationData
    });
  } else {
    await prisma.circleCardRecommendation.create({
      data: recommendationData
    });
  }

  await trackCircleCardEvent({
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
  });

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
    "/dashboard/circle-card#wallet"
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

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createEmptyCircleCardContentBlocks } from "@/lib/circle-card/content-blocks";
import { calculateFirstCircleCardReadiness } from "@/lib/circle-card/first-card-readiness";
import { isSafeCircleCardImageUrl } from "@/lib/circle-card/image-url";
import { buildCircleCardSlugBase, normalizeCircleCardUrl } from "@/lib/circle-card/schema";
import { buildCircleCardThemeMetadata, buildCircleCardThemeStorage } from "@/lib/circle-card/theme";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/security/logging";
import { requireCircleCardUser } from "@/lib/session";
import { removeOwnedCircleCardImageUpload } from "@/server/circle-card/upload.service";

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().default("");
const optionalEmail = z.union([z.literal(""), z.string().trim().email().max(254)]).default("");
const optionalWebsite = optionalText(500).refine(
  (value) => !value || /^https?:\/\//i.test(normalizeCircleCardUrl(value)),
  "Enter a valid website address."
);
const optionalImage = optionalText(1000).refine(
  (value) => !value || isSafeCircleCardImageUrl(value),
  "Use an uploaded image or a valid image address."
);

const firstCardDraftSchema = z.object({
  cardId: optionalText(80),
  cardType: z.enum(["PERSONAL", "CREATOR", "BUSINESS"]),
  fullName: z.string().trim().min(2).max(120),
  profileImageUrl: optionalImage,
  businessLogoUrl: optionalImage,
  profileImagePositionX: z.number().min(0).max(100).default(50),
  profileImagePositionY: z.number().min(0).max(100).default(50),
  profileImageScale: z.number().min(1).max(3).default(1),
  businessLogoPositionX: z.number().min(0).max(100).default(50),
  businessLogoPositionY: z.number().min(0).max(100).default(50),
  businessLogoScale: z.number().min(1).max(3).default(1),
  businessName: optionalText(140),
  role: optionalText(120),
  tagline: optionalText(180),
  email: optionalEmail,
  phone: optionalText(48),
  websiteUrl: optionalWebsite
});

export type FirstCardDraftInput = z.input<typeof firstCardDraftSchema>;

export type FirstCardSaveResult =
  | {
      ok: true;
      cardId: string;
      slug: string;
      completionPercentage: number;
      completedEssentials: number;
      previewReady: boolean;
      publishReady: boolean;
      published: boolean;
    }
  | { ok: false; message: string; uploadsDiscarded?: true };

function nullable(value: string) {
  return value.trim() || null;
}

function profileLayoutForCardType(cardType: "PERSONAL" | "CREATOR" | "BUSINESS") {
  if (cardType === "CREATOR") return "CREATOR" as const;
  if (cardType === "BUSINESS") return "BUSINESS" as const;
  return "CLASSIC" as const;
}

async function availableSlug(fullName: string, businessName: string) {
  const base = buildCircleCardSlugBase({ slug: "", fullName, businessName });

  for (let suffix = 0; suffix < 25; suffix += 1) {
    const candidate = suffix ? `${base}-${suffix + 1}` : base;
    const exists = await prisma.circleCard.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

async function readOwnedStarterCard(userId: string, cardId?: string) {
  return prisma.circleCard.findFirst({
    where: {
      userId,
      archivedAt: null,
      ...(cardId ? { id: cardId } : {})
    },
    orderBy: [{ isDefaultCard: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      isPublished: true,
      profileImageUrl: true,
      businessLogoUrl: true
    }
  });
}

export async function saveFirstCard(
  input: FirstCardDraftInput,
  publish: boolean
): Promise<FirstCardSaveResult> {
  const session = await requireCircleCardUser();
  const parsed = firstCardDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your card details and try again." };
  }

  const values = parsed.data;
  let card = await readOwnedStarterCard(session.user.id, values.cardId);
  if (card?.isPublished) {
    return { ok: false, message: "This card is already published. Use the full editor to change it." };
  }

  const data = {
    cardType: values.cardType,
    profileLayout: profileLayoutForCardType(values.cardType),
    fullName: values.fullName,
    profileImageUrl: nullable(values.profileImageUrl),
    businessLogoUrl: nullable(values.businessLogoUrl),
    profileImagePositionX: values.profileImagePositionX,
    profileImagePositionY: values.profileImagePositionY,
    profileImageScale: values.profileImageScale,
    businessLogoPositionX: values.businessLogoPositionX,
    businessLogoPositionY: values.businessLogoPositionY,
    businessLogoScale: values.businessLogoScale,
    businessName: nullable(values.businessName),
    role: nullable(values.role),
    tagline: nullable(values.tagline),
    email: nullable(values.email),
    phone: nullable(values.phone),
    websiteUrl: values.websiteUrl ? normalizeCircleCardUrl(values.websiteUrl) : null
  };

  try {
    if (!card) {
      const slug = await availableSlug(values.fullName, values.businessName);
      const themeStorage = buildCircleCardThemeStorage();
      const created = await prisma.$transaction(async (tx) => {
        const existing = await tx.circleCard.findFirst({
          where: { userId: session.user.id, archivedAt: null },
          orderBy: [{ isDefaultCard: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            slug: true,
            isPublished: true,
            profileImageUrl: true,
            businessLogoUrl: true
          }
        });
        if (existing) return existing;

        return tx.circleCard.create({
          data: {
            ...data,
            slug,
            userId: session.user.id,
            isPrimary: true,
            isDefaultCard: true,
            displayOrder: 0,
            accountType: "INDIVIDUAL",
            isPublished: false,
            showInDiscover: false,
            identityTags: [],
            themePrimaryColor: themeStorage.values.themePrimaryColor,
            themeAccentColor: themeStorage.values.themeAccentColor,
            themeButtonColor: themeStorage.values.themeButtonColor,
            themeSurfaceStyle: themeStorage.values.themeSurfaceStyle,
            themePreset: themeStorage.values.themePreset,
            themeMetadata: buildCircleCardThemeMetadata(themeStorage.theme) as Prisma.InputJsonValue,
            socialLinks: {},
            contentBlocks: createEmptyCircleCardContentBlocks() as Prisma.InputJsonValue
          },
          select: {
            id: true,
            slug: true,
            isPublished: true,
            profileImageUrl: true,
            businessLogoUrl: true
          }
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      card = created;
    }

    await prisma.circleCard.update({ where: { id: card.id }, data });
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: values.fullName, ...(data.profileImageUrl ? { image: data.profileImageUrl } : {}) }
    });

    const savedCard = await prisma.circleCard.findUnique({
      where: { id: card.id },
      select: {
        cardType: true,
        fullName: true,
        profileImageUrl: true,
        businessLogoUrl: true,
        role: true,
        businessName: true,
        tagline: true,
        about: true,
        email: true,
        phone: true,
        websiteUrl: true,
        socialLinks: true,
        isPublished: true,
        _count: { select: { customLinks: { where: { isActive: true } } } }
      }
    });
    const readiness = calculateFirstCircleCardReadiness(
      savedCard
        ? { ...savedCard, activeCustomLinkCount: savedCard._count.customLinks }
        : { ...data, socialLinks: {}, isPublished: false }
    );
    if (publish && !readiness.publishReady) {
      return { ok: false, message: "Add the missing essentials before publishing your Circle Card." };
    }

    if (publish) {
      await prisma.circleCard.update({ where: { id: card.id }, data: { isPublished: true } });
    }

    revalidatePath("/dashboard/circle-card/onboarding");
    revalidatePath("/dashboard/circle-card");
    revalidatePath(`/card/${card.slug}`);

    return {
      ok: true,
      cardId: card.id,
      slug: card.slug,
      completionPercentage: readiness.completionPercentage,
      completedEssentials: readiness.completedEssentials,
      previewReady: readiness.previewReady,
      publishReady: readiness.publishReady,
      published: publish
    };
  } catch (error) {
    logServerError("circle-card-onboarding-save-failed", error, {
      userId: session.user.id,
      cardId: card?.id || values.cardId || undefined,
      cardType: values.cardType,
      publish,
      hasProfileImage: Boolean(values.profileImageUrl),
      hasBusinessLogo: Boolean(values.businessLogoUrl),
      profileImageIsManagedUpload: values.profileImageUrl.startsWith("/uploads/circle-card/"),
      businessLogoIsManagedUpload: values.businessLogoUrl.startsWith("/uploads/circle-card/")
    });
    const persistedImages = card
      ? await prisma.circleCard.findUnique({
          where: { id: card.id },
          select: { profileImageUrl: true, businessLogoUrl: true }
        }).catch(() => null)
      : null;
    const cleanupCandidates = [
      {
        value: values.profileImageUrl,
        previous: card?.profileImageUrl,
        persisted: persistedImages?.profileImageUrl
      },
      {
        value: values.businessLogoUrl,
        previous: card?.businessLogoUrl,
        persisted: persistedImages?.businessLogoUrl
      }
    ].filter(
      (image) =>
        image.value.startsWith("/uploads/circle-card/") &&
        image.value !== image.previous &&
        image.value !== image.persisted
    );
    const cleanupResults = await Promise.all(
      cleanupCandidates.map((image) =>
        removeOwnedCircleCardImageUpload(image.value, session.user.id).catch((cleanupError) => {
          logServerError("circle-card-onboarding-upload-cleanup-failed", cleanupError, {
            userId: session.user.id,
            cardId: card?.id || values.cardId || undefined
          });
          return false;
        })
      )
    );
    if (cleanupResults.some(Boolean)) {
      return {
        ok: false,
        uploadsDiscarded: true,
        message: "We could not save that yet. Your other details are still here; please choose the image again."
      };
    }
    return { ok: false, message: "We couldn’t save that yet. Your details are still here—try again." };
  }
}

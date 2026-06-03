"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/utils";
import {
  buildCircleCardSlugBase,
  buildCircleCardSocialLinks,
  circleCardFormSchema,
  nullableText
} from "@/lib/circle-card/schema";
import {
  canCreateCircleCard,
  resolveCircleCardAccessLevel
} from "@/lib/circle-card/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const CIRCLE_CARD_FORM_FIELDS = [
  "cardId",
  "slug",
  "fullName",
  "businessName",
  "role",
  "tagline",
  "about",
  "profileImageUrl",
  "websiteUrl",
  "email",
  "phone",
  "location",
  "linkedinUrl",
  "instagramUrl",
  "xUrl",
  "facebookUrl",
  "youtubeUrl",
  "isPublished"
] as const;

function appendQueryParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
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

export async function upsertCircleCardAction(formData: FormData) {
  const session = await requireUser();
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
          userId: session.user.id
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
      where: { userId: session.user.id }
    });
    const accessLevel = resolveCircleCardAccessLevel({
      role: session.user.role,
      membershipTier: session.user.membershipTier
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
      where: { userId: session.user.id }
    });
    const card = await prisma.circleCard.create({
      data: {
        ...data,
        userId: session.user.id,
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

export async function saveCircleWalletContactAction(formData: FormData) {
  const session = await requireUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/circle-card");
  const cardId = String(formData.get("cardId") || "");

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

  if (card.userId === session.user.id) {
    redirectWithNotice(returnPath, "own-card");
  }

  await prisma.circleWalletContact.upsert({
    where: {
      userId_cardId: {
        userId: session.user.id,
        cardId: card.id
      }
    },
    create: {
      userId: session.user.id,
      cardId: card.id
    },
    update: {
      savedAt: new Date()
    }
  });

  revalidatePath("/dashboard/circle-card");
  revalidatePath(`/card/${card.slug}`);
  redirectWithNotice(returnPath, "card-saved");
}

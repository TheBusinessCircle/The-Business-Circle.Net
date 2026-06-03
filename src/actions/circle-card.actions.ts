"use server";

import type { MembershipTier, Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { safeRedirectPath } from "@/lib/auth/utils";
import {
  buildCircleCardSlugBase,
  buildCircleCardSocialLinks,
  circleCardFormSchema,
  circleCardOnboardingSchema,
  circleWalletContactDetailsSchema,
  nullableText,
  parseCircleWalletTagsInput
} from "@/lib/circle-card/schema";
import {
  canCreateCircleCard,
  resolveCircleCardAccessLevel
} from "@/lib/circle-card/permissions";
import { hasEntitledSubscription } from "@/lib/membership/access";
import { prisma } from "@/lib/prisma";
import { trackCircleCardEvent } from "@/server/circle-card";

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
  "tiktokUrl",
  "instagramUrl",
  "xUrl",
  "facebookUrl",
  "youtubeUrl",
  "isPublished"
] as const;

const CIRCLE_CARD_ONBOARDING_FIELDS = [
  "profileImageUrl",
  "fullName",
  "businessName",
  "role",
  "tagline",
  "websiteUrl",
  "isPublished"
] as const;

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

function readCircleCardOnboardingFormData(formData: FormData) {
  return Object.fromEntries(
    CIRCLE_CARD_ONBOARDING_FIELDS.map((field) => [field, formData.get(field) ?? ""])
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
      source: "circle_wallet"
    }
  });

  revalidatePath("/dashboard/circle-card");
  revalidatePath(`/card/${card.slug}`);
  redirectWithNotice(returnPath, "card-saved");
}

export async function removeCircleWalletContactAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const cardId = String(formData.get("cardId") || "");

  if (!cardId) {
    redirectWithError(returnPath, "missing-card");
  }

  const savedContact = await prisma.circleWalletContact.findUnique({
    where: {
      userId_cardId: {
        userId: user.id,
        cardId
      }
    },
    select: {
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

  await prisma.circleWalletContact.delete({
    where: {
      userId_cardId: {
        userId: user.id,
        cardId
      }
    }
  });

  await trackCircleCardEvent({
    cardId,
    eventType: "WALLET_REMOVE",
    userId: user.id,
    metadata: {
      source: "circle_wallet"
    }
  });

  revalidatePath("/dashboard/circle-card");
  revalidatePath(`/card/${savedContact.card.slug}`);
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
  revalidatePath(`/card/${savedContact.card.slug}`);
  redirectWithNotice(returnPath, savedContact.favourite ? "favourite-removed" : "favourite-added");
}

export async function updateCircleWalletContactDetailsAction(formData: FormData) {
  const user = await requireCircleCardActionUser();
  const returnPath = resolveReturnPath(formData.get("returnPath"), "/dashboard/circle-card");
  const parsed = circleWalletContactDetailsSchema.safeParse({
    walletContactId: formData.get("walletContactId"),
    notes: formData.get("notes"),
    tagsInput: formData.get("tagsInput")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "wallet-contact-invalid");
  }

  const savedContact = await prisma.circleWalletContact.findFirst({
    where: {
      id: parsed.data.walletContactId,
      userId: user.id
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

  if (!savedContact) {
    redirectWithError(returnPath, "wallet-contact-not-found");
  }

  await prisma.circleWalletContact.update({
    where: { id: savedContact.id },
    data: {
      notes: nullableText(parsed.data.notes),
      tags: parseCircleWalletTagsInput(parsed.data.tagsInput)
    }
  });

  revalidatePath("/dashboard/circle-card");
  revalidatePath(`/card/${savedContact.card.slug}`);
  redirectWithNotice(returnPath, "relationship-updated");
}

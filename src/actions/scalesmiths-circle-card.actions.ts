"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeSafeCircleCardImageUrl } from "@/lib/circle-card/image-url";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCircleCardUser } from "@/lib/session";
import { requireAdmin } from "@/lib/session";
import { claimScaleSmithsPartnerLinkChallenge, issueScaleSmithsPartnerLinkChallenge } from "@/server/circle-card/scalesmiths-link.service";
import { updateScaleSmithsBrandTemplate } from "@/server/circle-card/scalesmiths-brand.service";

const workspacePath = "/dashboard/circle-card/scalesmiths";

export async function setCircleCardPublicProfileVisibilityAction(formData: FormData) {
  if (process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") notFound();

  const session = await requireCircleCardUser();
  const cardId = formData.get("cardId");
  const desired = formData.get("visible");
  if (typeof cardId !== "string" || cardId.length > 128 ||
      (desired !== "true" && desired !== "false")) {
    throw new Error("Invalid card visibility request");
  }

  const card = await prisma.circleCard.findFirst({
    where: { id: cardId, userId: session.user.id, archivedAt: null },
    select: { id: true }
  });
  if (!card) throw new Error("Card not found");

  await prisma.circleCard.update({
    where: { id: card.id },
    data: { showOnPublicProfile: desired === "true" }
  });
  revalidatePath(workspacePath);
  revalidatePath("/dashboard/circle-card");
}

// This action only controls presentation in the card chooser.
// It never changes isPublished, Stripe state, Pro access, or the card's ownership.

const partnerIdentitySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  about: z.string().trim().max(1600),
  profileImageUrl: z.string().trim().max(2048),
  email: z.union([z.literal(""), z.string().trim().email().max(320)]),
  phone: z.string().trim().max(48).regex(/^[0-9+().\s-]*$/),
  location: z.string().trim().max(160)
}).strict();

export async function updateScaleSmithsPartnerIdentityAction(formData: FormData) {
  if (process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") notFound();
  const session = await requireCircleCardUser();
  const membership = await prisma.circleCardScaleSmithsPartner.findUnique({
    where: { userId: session.user.id },
    select: { partnerCardId: true, status: true }
  });
  if (!membership?.partnerCardId || membership.status !== "ACTIVE") {
    throw new Error("Active ScaleSmiths partner membership required");
  }
  const fields = Object.fromEntries([
    "fullName", "about", "profileImageUrl",
    "email", "phone", "location"
  ].map((field) => [field, formData.get(field) ?? ""]));
  const values = partnerIdentitySchema.parse(fields);
  const picture = values.profileImageUrl
    ? normalizeSafeCircleCardImageUrl(values.profileImageUrl)
    : null;
  if (values.profileImageUrl && !picture) throw new Error("Invalid profile image URL");
  const ownedCard = await prisma.circleCard.findFirst({
    where: { id: membership.partnerCardId, userId: session.user.id, archivedAt: null },
    select: { id: true, slug: true }
  });
  if (!ownedCard) throw new Error("Partner card unavailable");

  await prisma.circleCard.update({
    where: { id: ownedCard.id },
    data: {
      fullName: values.fullName,
      about: values.about || null,
      profileImageUrl: picture,
      email: values.email || null,
      phone: values.phone || null,
      location: values.location || null
    }
  });
  revalidatePath(workspacePath);
  revalidatePath(`/card/${ownedCard.slug}`);
}

export type ScaleSmithsAdminLinkState = {
  message: string;
  token: string | null;
  expiresAt: string | null;
};

export async function createScaleSmithsPartnerLinkAction(
  _previous: ScaleSmithsAdminLinkState,
  formData: FormData
): Promise<ScaleSmithsAdminLinkState> {
  if (process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") notFound();
  const admin = await requireAdmin();
  const targetCircleCardUserId = formData.get("circleCardUserId");
  const externalPartnerId = formData.get("externalPartnerId");
  if (typeof targetCircleCardUserId !== "string" || targetCircleCardUserId.length > 128 ||
      typeof externalPartnerId !== "string" || externalPartnerId.length > 128) {
    return { message: "Enter the exact partner ID and Circle Card user ID.", token: null, expiresAt: null };
  }
  try {
    const challenge = await issueScaleSmithsPartnerLinkChallenge({
      adminUserId: admin.user.id,
      targetCircleCardUserId,
      externalPartnerId
    });
    return {
      message: "One-time account-link token issued. Deliver it privately to the intended partner.",
      token: challenge.token,
      expiresAt: challenge.expiresAt.toISOString()
    };
  } catch {
    return {
      message: "Could not issue this link. Check the authenticated account and whether the partner is already linked.",
      token: null, expiresAt: null
    };
  }
}

export type ScaleSmithsClaimLinkState = { message: string; linked: boolean };

export async function claimScaleSmithsPartnerLinkAction(
  _previous: ScaleSmithsClaimLinkState,
  formData: FormData
): Promise<ScaleSmithsClaimLinkState> {
  if (process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") notFound();
  const session = await requireCircleCardUser();
  const externalPartnerId = formData.get("externalPartnerId");
  const token = formData.get("token");
  if (typeof externalPartnerId !== "string" || typeof token !== "string") {
    return { linked: false, message: "Enter the partner ID and your private link token." };
  }
  try {
    await claimScaleSmithsPartnerLinkChallenge({
      authenticatedCircleCardUserId: session.user.id,
      externalPartnerId,
      token
    });
    revalidatePath(workspacePath);
    return { linked: true, message: "Account linked. ScaleSmiths approval is the next step." };
  } catch {
    return { linked: false, message: "Link unsuccessful. Verify the token is unused, unexpired and issued for this account." };
  }
}

export type ScaleSmithsBrandUpdateState = {
  message: string;
  version: number | null;
  updatedCards: number | null;
};

export async function updateScaleSmithsBrandTemplateAction(
  _previous: ScaleSmithsBrandUpdateState,
  formData: FormData
): Promise<ScaleSmithsBrandUpdateState> {
  if (process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") notFound();
  const admin = await requireAdmin();
  const tagline = formData.get("tagline");
  const businessLogoUrl = formData.get("businessLogoUrl");
  const websiteUrl = formData.get("websiteUrl");
  if (typeof tagline !== "string" || typeof businessLogoUrl !== "string" ||
      typeof websiteUrl !== "string") {
    return { message: "Invalid brand settings.", version: null, updatedCards: null };
  }
  try {
    const updated = await updateScaleSmithsBrandTemplate({
      adminUserId: admin.user.id,
      tagline, businessLogoUrl, websiteUrl
    });
    return {
      message: "Brand updated across assigned partner cards.",
      version: updated.version,
      updatedCards: updated.updatedCards
    };
  } catch {
    return {
      message: "Brand update refused. Check that the URL and logo asset meet the security rules.",
      version: null, updatedCards: null
    };
  }
}

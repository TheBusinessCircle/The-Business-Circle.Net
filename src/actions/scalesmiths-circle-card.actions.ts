"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeSafeCircleCardImageUrl } from "@/lib/circle-card/image-url";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCircleCardUser } from "@/lib/session";

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
  tagline: z.string().trim().max(180),
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
    "fullName", "tagline", "about", "profileImageUrl",
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
      tagline: values.tagline || null,
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

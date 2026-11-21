"use server";

import { revalidatePath } from "next/cache";
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

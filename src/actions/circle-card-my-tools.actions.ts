"use server";

import { revalidatePath } from "next/cache";
import { requireCircleCardUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { selectCircleCardIdsWithinPlan } from "@/lib/circle-card/plan-policy";
import { isMyToolId, updateMyToolsShelf } from "@/lib/circle-card/my-tools";
import { loadCircleCardAccessForUser } from "@/server/circle-card";

export async function setCircleCardMyToolPinnedAction(formData: FormData): Promise<void> {
  const session = await requireCircleCardUser();
  const userId = session.user.id;
  const cardId = formData.get("cardId");
  const toolId = formData.get("toolId");
  const operation = formData.get("operation");

  if (
    typeof cardId !== "string" ||
    !/^cm[a-z0-9]{10,36}$/i.test(cardId) ||
    !isMyToolId(toolId) ||
    (operation !== "pin" && operation !== "unpin")
  ) {
    throw new Error("Invalid My Tools request.");
  }

  const [allCards, access] = await Promise.all([
    prisma.circleCard.findMany({
      where: { userId, archivedAt: null },
      orderBy: [
        { isDefaultCard: "desc" }, { isPrimary: "desc" },
        { displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }
      ],
      select: {
        id: true, isDefaultCard: true, isPrimary: true,
        displayOrder: true, createdAt: true
      }
    }),
    loadCircleCardAccessForUser(userId)
  ]);

  // A cancelled Pro subscription cannot use a saved second card to bypass
  // plan limits. Pinning never activates a Pro feature or publishes content.
  if (!selectCircleCardIdsWithinPlan(allCards, access.limits.circleCards).has(cardId)) {
    throw new Error("This card is not available on your current plan.");
  }

  await prisma.$transaction(async (tx) => {
    const card = await tx.circleCard.findFirst({
      where: { id: cardId, userId, archivedAt: null },
      select: { id: true, contentBlocks: true }
    });
    if (!card) {
      throw new Error("Card not found.");
    }
    await tx.circleCard.update({
      where: { id: card.id },
      data: { contentBlocks: updateMyToolsShelf(card.contentBlocks, toolId, operation) }
    });
  });

  revalidatePath("/dashboard/circle-card/tools");
}

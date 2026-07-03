import "server-only";

import { prisma } from "@/lib/prisma";

export async function getCircleTrustOwnerModeration(cardId: string, ownerUserId: string) {
  const card = await prisma.circleCard.findFirst({
    where: { id: cardId, userId: ownerUserId },
    select: { id: true }
  });

  if (!card) {
    return null;
  }

  const [pendingTestimonials, pendingConcerns] = await Promise.all([
    prisma.circleCardWalletTestimonial.findMany({
      where: {
        targetCardId: card.id,
        targetOwnerId: ownerUserId,
        status: "PENDING"
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        reviewerName: true,
        reviewerRoleOrCompany: true,
        testimonialText: true,
        rating: true,
        relationship: true,
        createdAt: true
      }
    }),
    prisma.circleCardReport.findMany({
      where: {
        cardId: card.id,
        reportedUserId: ownerUserId,
        status: { in: ["OPEN", "REVIEWING"] }
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true
      }
    })
  ]);

  return { pendingTestimonials, pendingConcerns };
}

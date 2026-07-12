import "server-only";

import { isCircleCardWithinPlan } from "@/lib/circle-card/plan-policy";
import { prisma } from "@/lib/prisma";
import { loadCircleCardAccessForUsers } from "@/server/circle-card/billing.service";

type PublicCircleCardTarget = {
  id: string;
  userId: string;
};

type OwnerPlanCard = {
  id: string;
  userId: string;
  isDefaultCard: boolean;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: Date;
  isPublished: boolean;
  user: {
    suspended: boolean;
  };
};

function groupOwnerCards(cards: readonly OwnerPlanCard[]) {
  const byOwner = new Map<string, OwnerPlanCard[]>();

  for (const card of cards) {
    const current = byOwner.get(card.userId);
    if (current) {
      current.push(card);
    } else {
      byOwner.set(card.userId, [card]);
    }
  }

  return byOwner;
}

/**
 * Applies the authoritative per-owner card limit to public relationship targets.
 * Owner cards are loaded in one query and access is loaded exactly once per distinct owner.
 */
export async function filterPublicCircleCardTargetsWithinOwnerPlans<
  T extends PublicCircleCardTarget
>(targets: readonly T[]): Promise<T[]> {
  const ownerIds = [...new Set(targets.map((target) => target.userId))];
  if (!ownerIds.length) return [];

  const [ownerCards, accessByOwner] = await Promise.all([
    prisma.circleCard.findMany({
      where: {
        userId: { in: ownerIds },
        archivedAt: null
      },
      select: {
        id: true,
        userId: true,
        isDefaultCard: true,
        isPrimary: true,
        displayOrder: true,
        createdAt: true,
        isPublished: true,
        user: {
          select: {
            suspended: true
          }
        }
      }
    }),
    loadCircleCardAccessForUsers(ownerIds)
  ]);

  const cardsByOwner = groupOwnerCards(ownerCards);

  return targets.filter((target) => {
    const access = accessByOwner.get(target.userId);
    if (!access) return false;

    const ownerCardsForPlan = cardsByOwner.get(target.userId) ?? [];
    const authoritativeTarget = ownerCardsForPlan.find((card) => card.id === target.id);
    if (!authoritativeTarget?.isPublished || authoritativeTarget.user.suspended) return false;

    return isCircleCardWithinPlan(
      target.id,
      ownerCardsForPlan,
      access.limits.circleCards
    );
  });
}

export async function isPublicCircleCardTargetWithinOwnerPlan(
  target: PublicCircleCardTarget
) {
  const allowed = await filterPublicCircleCardTargetsWithinOwnerPlans([target]);
  return allowed.length === 1;
}

import "server-only";

import type { CircleCardNotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CreateCircleCardNotificationInput = {
  userId: string | null | undefined;
  circleCardId?: string | null;
  type: CircleCardNotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
};

function utcDateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export async function createCircleCardNotification(input: CreateCircleCardNotificationInput) {
  if (!input.userId) {
    return { stored: false as const };
  }

  try {
    await prisma.circleCardNotification.create({
      data: {
        userId: input.userId,
        circleCardId: input.circleCardId ?? null,
        type: input.type,
        title: input.title.slice(0, 160),
        message: input.message.slice(0, 360),
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null
      }
    });

    return { stored: true as const };
  } catch {
    return { stored: false as const };
  }
}

export async function getCircleCardNotificationUnreadCount(userId: string) {
  return prisma.circleCardNotification.count({
    where: {
      userId,
      isRead: false
    }
  });
}

export async function createDueOpportunityNotificationsForUser(userId: string, now = new Date()) {
  const today = utcDateOnly(now);
  const dueOpportunities = await prisma.opportunity.findMany({
    where: {
      userId,
      status: {
        notIn: ["WON", "LOST"]
      },
      nextFollowUpAt: {
        lte: today
      }
    },
    select: {
      id: true,
      circleCardId: true,
      title: true,
      nextFollowUpAt: true
    }
  });

  if (!dueOpportunities.length) {
    return { created: 0 };
  }

  let created = 0;

  for (const opportunity of dueOpportunities) {
    const duplicate = await prisma.circleCardNotification.findFirst({
      where: {
        userId,
        type: "OPPORTUNITY_FOLLOWUP_DUE",
        entityType: "OPPORTUNITY",
        entityId: opportunity.id,
        createdAt: {
          gte: opportunity.nextFollowUpAt ?? today
        }
      },
      select: { id: true }
    });

    if (duplicate) {
      continue;
    }

    const result = await createCircleCardNotification({
      userId,
      circleCardId: opportunity.circleCardId,
      type: "OPPORTUNITY_FOLLOWUP_DUE",
      title: "Opportunity follow-up due",
      message: `${opportunity.title} needs a follow-up.`,
      entityType: "OPPORTUNITY",
      entityId: opportunity.id
    });

    if (result.stored) {
      created += 1;
    }
  }

  return { created };
}

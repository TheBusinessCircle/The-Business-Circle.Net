import "server-only";

import type { CircleCardActivityType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CreateCircleCardActivityInput = {
  userId: string | null | undefined;
  circleCardId?: string | null;
  type: CircleCardActivityType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

type CreateCircleCardActivityForCardOwnerInput = Omit<
  CreateCircleCardActivityInput,
  "userId" | "circleCardId"
> & {
  cardId: string | null | undefined;
  skipUserId?: string | null;
};

export async function createCircleCardActivity(input: CreateCircleCardActivityInput) {
  if (!input.userId) {
    return { stored: false as const };
  }

  try {
    await prisma.circleCardActivity.create({
      data: {
        userId: input.userId,
        circleCardId: input.circleCardId ?? null,
        type: input.type,
        title: input.title.slice(0, 160),
        message: input.message.slice(0, 360),
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        ...(input.metadata !== undefined ? { metadata: input.metadata ?? Prisma.JsonNull } : {})
      }
    });

    return { stored: true as const };
  } catch {
    return { stored: false as const };
  }
}

export async function createCircleCardActivityForCardOwner(input: CreateCircleCardActivityForCardOwnerInput) {
  if (!input.cardId) {
    return { stored: false as const };
  }

  const card = await prisma.circleCard.findUnique({
    where: { id: input.cardId },
    select: {
      id: true,
      userId: true
    }
  });

  if (!card || (input.skipUserId && card.userId === input.skipUserId)) {
    return { stored: false as const };
  }

  return createCircleCardActivity({
    userId: card.userId,
    circleCardId: card.id,
    type: input.type,
    title: input.title,
    message: input.message,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { CIRCLE_CARD_PLAN_ORDER, selectCircleCardsWithinPlan } from "@/lib/circle-card/plan-policy";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/security/logging";
import { requireCircleCardUser } from "@/lib/session";
import { loadCircleCardAccessForUser } from "@/server/circle-card/billing.service";

const spinRevealUpdate = z.object({
  cardId: z.string().min(1).max(120),
  enabled: z.boolean()
});

export async function setCircleCardSpinRevealAction(input: unknown) {
  const session = await requireCircleCardUser();
  const parsed = spinRevealUpdate.safeParse(input);
  if (!parsed.success || getRuntimeBrand().key !== "circle-card") {
    return { ok: false as const, message: "This card is unavailable." };
  }

  const { cardId, enabled } = parsed.data;
  const ownerId = session.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [card] = await tx.$queryRaw<{ slug: string }[]>`
        SELECT slug FROM "CircleCard"
        WHERE id = ${cardId} AND "userId" = ${ownerId}
          AND "archivedAt" IS NULL AND "isPublished" = TRUE
        FOR UPDATE
      `;
      if (!card) return { ok: false as const, message: "Publish an active card to use Spin Reveal." };

      const access = await loadCircleCardAccessForUser(ownerId, new Date());
      if (!access.hasProAccess) {
        return { ok: false as const, message: "Spin Reveal is available with Circle Card Pro." };
      }

      const ownedCards = await tx.circleCard.findMany({
        where: { userId: ownerId, archivedAt: null },
        orderBy: [...CIRCLE_CARD_PLAN_ORDER],
        select: { id: true, isDefaultCard: true, isPrimary: true, displayOrder: true, createdAt: true }
      });
      if (!selectCircleCardsWithinPlan(ownedCards, access.limits.circleCards).some(({ id }) => id === cardId)) {
        return { ok: false as const, message: "This card is outside your current plan allowance." };
      }

      const updated = await tx.$executeRaw`
        UPDATE "CircleCard"
        SET "contentBlocks" = jsonb_set("contentBlocks", '{spinRevealEnabled}', to_jsonb(${enabled}::boolean), true)
        WHERE id = ${cardId} AND jsonb_typeof("contentBlocks") = 'object'
      `;
      if (updated !== 1) return { ok: false as const, message: "Couldn't save Spin Reveal for this card." };

      return { ok: true as const, slug: card.slug };
    });

    if (!result.ok) return result;

    revalidatePath("/app/share");
    revalidatePath(`/card/${result.slug}`);
    return { ok: true as const, enabled };
  } catch (error) {
    logServerError("circle-card-spin-reveal-save", error);
    return { ok: false as const, message: "Couldn't save Spin Reveal. Try again." };
  }
}

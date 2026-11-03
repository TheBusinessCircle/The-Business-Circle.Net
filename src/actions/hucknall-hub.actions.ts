"use server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HUCKNALL_HUB_CARD_ID } from "@/lib/circle-card/hucknall-content";
import { HUCKNALL_HUB_PATH, isBusinessDirectoryCategory, isHucknallBusinessPostcode, normalizeBusinessPostcode } from "@/lib/circle-card/local-hubs";
import { buildCircleCardDiscoverVisibilityData } from "@/lib/circle-card/privacy";
import { isPublicCircleCardTargetWithinOwnerPlan } from "@/server/circle-card/plan-policy.service";

const JOIN = `${HUCKNALL_HUB_PATH}/join`;
const schema = z.object({ cardId: z.string().cuid(), postcode: z.string().max(10),
  category: z.string().max(40).refine(isBusinessDirectoryCategory), discover: z.boolean() });

export async function saveHucknallMembershipAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?from=${encodeURIComponent(JOIN)}`);
  const result = schema.safeParse({ cardId: formData.get("cardId"), postcode: formData.get("postcode"),
    category: formData.get("category"), discover: formData.get("discover") === "on" });
  if (!result.success) redirect(`${JOIN}?error=details`);
  const { cardId, postcode, category, discover } = result.data;
  if (cardId === HUCKNALL_HUB_CARD_ID || !isHucknallBusinessPostcode(postcode)) redirect(`${JOIN}?error=postcode`);
  const card = await prisma.circleCard.findFirst({
    where: { id: cardId, userId: session.user.id, cardType: "BUSINESS", isPublished: true, archivedAt: null,
      user: { suspended: false } },
    select: { id: true, userId: true, slug: true, showInDiscover: true, discoverOptedInAt: true }
  });
  if (!card || !await isPublicCircleCardTargetWithinOwnerPlan(card)) redirect(`${JOIN}?error=card`);
  await prisma.circleCard.update({ where: { id: card.id }, data: {
    businessPostcode: normalizeBusinessPostcode(postcode), businessCategory: category,
    ...buildCircleCardDiscoverVisibilityData({ showInDiscover: discover, previousShowInDiscover: card.showInDiscover,
      previousDiscoverOptedInAt: card.discoverOptedInAt })
  } });
  revalidatePath(HUCKNALL_HUB_PATH);
  revalidatePath(`/card/${card.slug}`);
  revalidatePath(JOIN);
  redirect(`${JOIN}?saved=1`);
}

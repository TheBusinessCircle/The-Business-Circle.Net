import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getScaleSmithsBrandForDb } from "@/server/circle-card/scalesmiths-brand.service";

function assertStagingEnabled() {
  if (process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") {
    throw new Error("ScaleSmiths partner card provisioning is disabled");
  }
}

// Called only AFTER a verified partner link and an authenticated, founder-approved
// ScaleSmiths instruction. No external route or event consumer is enabled yet.
export async function activateVerifiedScaleSmithsPartner(input: {
  externalPartnerId: string;
  displayName: string;
  approvedAt: Date;
}) {
  assertStagingEnabled();
  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > 180) throw new Error("Invalid display name");
  return prisma.$transaction(async (tx) => {
    const member = await tx.circleCardScaleSmithsPartner.findUnique({
      where: { externalPartnerId: input.externalPartnerId }
    });
    if (!member || !member.linkedAt || member.status === "ENDED") {
      throw new Error("Partner must be linked and eligible for approval");
    }

    const brand = await getScaleSmithsBrandForDb(tx);
    let partnerCardId = member.partnerCardId;
    if (!partnerCardId) {
      // Do not clone a founder card: create a fresh card owned by this user.
      const card = await tx.circleCard.create({
        data: {
          userId: member.userId,
          slug: "scalesmiths-" + randomUUID().replace(/-/g, "").slice(0, 16),
          cardType: "BUSINESS",
          fullName: displayName,
          ...brand,
          accountType: "INDIVIDUAL",
          role: "Independent ScaleSmiths Partner",
          isPublished: true,
          showInDiscover: false,
          showOnPublicProfile: true
        },
        select: { id: true }
      });
      partnerCardId = card.id;
    } else {
      const existingCard = await tx.circleCard.findFirst({
        where: { id: partnerCardId, userId: member.userId, archivedAt: null },
        select: { id: true }
      });
      if (!existingCard) throw new Error("Assigned partner card is missing or belongs to another account");
      await tx.circleCard.update({
        where: { id: partnerCardId },
        data: { isPublished: true, showOnPublicProfile: true, fullName: displayName, ...brand }
      });
    }

    await tx.circleCard.updateMany({
      where: { userId: member.userId, archivedAt: null },
      data: { isDefaultCard: false, isPrimary: false }
    });
    await tx.circleCard.updateMany({
      where: { userId: member.userId, cardType: "PERSONAL", archivedAt: null, id: { not: partnerCardId } },
      data: { showOnPublicProfile: false }
    });
    await tx.circleCard.update({
      where: { id: partnerCardId },
      data: { isDefaultCard: true, isPrimary: true }
    });

    await tx.circleCardScaleSmithsPartner.update({
      where: { id: member.id },
      data: {
        status: "ACTIVE",
        displayName,
        partnerCardId,
        approvedAt: input.approvedAt,
        endedAt: null,
        sponsoredProStartsAt: input.approvedAt,
        sponsoredProEndsAt: null
      }
    });

    return { externalPartnerId: member.externalPartnerId, partnerCardId };
  });
}

export async function deactivateScaleSmithsPartner(input: {
  externalPartnerId: string;
  state: "SUSPENDED" | "ENDED";
  effectiveAt: Date;
}) {
  assertStagingEnabled();
  return prisma.$transaction(async (tx) => {
    const member = await tx.circleCardScaleSmithsPartner.findUnique({
      where: { externalPartnerId: input.externalPartnerId }
    });
    if (!member) throw new Error("Unknown partner ID");

    await tx.circleCardScaleSmithsPartner.update({
      where: { id: member.id },
      data: {
        status: input.state,
        sponsoredProEndsAt: input.effectiveAt,
        ...(input.state === "ENDED" ? { endedAt: input.effectiveAt } : {})
      }
    });

    if (member.partnerCardId) {
      await tx.circleCard.updateMany({
        where: { id: member.partnerCardId, userId: member.userId },
        data: {
          isPublished: false, isDefaultCard: false, isPrimary: false,
          showOnPublicProfile: false, showInDiscover: false, discoverOptedInAt: null
        }
      });
    }

    // Restore a remaining published card as the account default without deleting
    // or changing visibility preferences on any personal/business card.
    const nextCard = await tx.circleCard.findFirst({
      where: {
        userId: member.userId, archivedAt: null, isPublished: true,
        ...(member.partnerCardId ? { id: { not: member.partnerCardId } } : {})
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true }
    });
    if (nextCard) {
      await tx.circleCard.update({
        where: { id: nextCard.id },
        data: { isDefaultCard: true, isPrimary: true }
      });
    }

    // No CircleCardSubscription, Stripe or unrelated CircleCardAccessGrant writes.
    return { externalPartnerId: member.externalPartnerId, state: input.state };
  });
}

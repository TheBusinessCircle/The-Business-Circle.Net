import { prisma } from "@/lib/prisma";
import {
  createScaleSmithsLinkToken, hashScaleSmithsLinkToken,
  isValidScaleSmithsExternalId, linkChallengeIsUsable,
  SCALESMITHS_LINK_CHALLENGE_TTL_MS
} from "@/lib/circle-card/scalesmiths/link-token";

function assertPreviewEnabled() {
  if (process.env.CIRCLE_CARD_SCALESMITHS_PREVIEW !== "true") {
    throw new Error("ScaleSmiths linking is disabled");
  }
}

// Internal service only: there is intentionally NO externally accessible route yet.
// Caller must obtain authenticated actor and target user IDs from Circle Card sessions.
export async function issueScaleSmithsPartnerLinkChallenge(input: {
  adminUserId: string;
  targetCircleCardUserId: string;
  externalPartnerId: string;
  now?: Date;
}) {
  assertPreviewEnabled();
  if (!isValidScaleSmithsExternalId(input.externalPartnerId)) {
    throw new Error("Invalid external partner identifier");
  }
  const [admin, target, existingPartner, existingUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.adminUserId }, select: { role: true, suspended: true } }),
    prisma.user.findUnique({ where: { id: input.targetCircleCardUserId }, select: { id: true, suspended: true } }),
    prisma.circleCardScaleSmithsPartner.findUnique({ where: { externalPartnerId: input.externalPartnerId }, select: { id: true } }),
    prisma.circleCardScaleSmithsPartner.findUnique({ where: { userId: input.targetCircleCardUserId }, select: { id: true } })
  ]);
  if (!admin || admin.role !== "ADMIN" || admin.suspended) throw new Error("Admin permission required");
  if (!target || target.suspended) throw new Error("Target Circle Card user unavailable");
  if (existingPartner || existingUser) throw new Error("Partner or Circle Card user already linked");

  const now = input.now ?? new Date();
  const token = createScaleSmithsLinkToken();
  const expiresAt = new Date(now.getTime() + SCALESMITHS_LINK_CHALLENGE_TTL_MS);

  await prisma.circleCardScaleSmithsLinkChallenge.create({
    data: {
      userId: input.targetCircleCardUserId,
      externalPartnerId: input.externalPartnerId,
      tokenHash: hashScaleSmithsLinkToken(token),
      expiresAt
    }
  });

  // Only the recipient's trusted account-linking flow should ever receive this raw token.
  return { token, expiresAt };
}

export async function claimScaleSmithsPartnerLinkChallenge(input: {
  authenticatedCircleCardUserId: string;
  externalPartnerId: string;
  token: string;
  now?: Date;
}) {
  assertPreviewEnabled();
  if (!isValidScaleSmithsExternalId(input.externalPartnerId) ||
      !/^[0-9a-f]{64}$/.test(input.token)) {
    throw new Error("Invalid account-linking request");
  }

  const now = input.now ?? new Date();
  const tokenHash = hashScaleSmithsLinkToken(input.token);
  return prisma.$transaction(async (tx) => {
    const challenge = await tx.circleCardScaleSmithsLinkChallenge.findUnique({
      where: { tokenHash }
    });
    if (!challenge || !linkChallengeIsUsable({
      expectedUserId: input.authenticatedCircleCardUserId,
      expectedPartnerId: input.externalPartnerId,
      challengeUserId: challenge.userId,
      challengePartnerId: challenge.externalPartnerId,
      expiresAt: challenge.expiresAt,
      consumedAt: challenge.consumedAt,
      now
    })) {
      throw new Error("Link challenge invalid, used or expired");
    }

    const claimed = await tx.circleCardScaleSmithsLinkChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now }
    });
    if (claimed.count !== 1) throw new Error("Link challenge already consumed");

    // Both columns have UNIQUE indexes. A racing or conflicting claim fails atomically.
    const membership = await tx.circleCardScaleSmithsPartner.create({
      data: {
        externalPartnerId: input.externalPartnerId,
        userId: input.authenticatedCircleCardUserId,
        displayName: "Pending ScaleSmiths verification",
        status: "PENDING",
        linkedAt: now
      },
      select: { id: true, status: true, externalPartnerId: true }
    });
    return membership;
  });
}

import "server-only";
import { db } from "@/lib/db";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";

/** No subscription requirement for direct BCN conversations. Never used for group rooms. */
export async function connectedPairCanTalk(firstId: string, secondId: string) {
  if (
    !isBcnV2Enabled() ||
    firstId === secondId ||
    process.env.PRIVATE_MESSAGING_ENABLED === "false"
  )
    return false;
  const users = await db.user.findMany({
    where: {
      id: { in: [firstId, secondId] },
      suspended: false,
      emailVerified: { not: null },
      OR: [{ acceptedRulesAt: { not: null } }, { role: "ADMIN" }],
    },
    select: { id: true },
  });
  if (users.length !== 2) return false;
  const block = await db.directMessageBlock.findFirst({
    where: {
      OR: [
        { blockerId: firstId, blockedUserId: secondId },
        { blockerId: secondId, blockedUserId: firstId },
      ],
    },
    select: { id: true },
  });
  if (block) return false;
  const thread = await db.directMessageThread.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: firstId } } },
        { participants: { some: { userId: secondId } } },
      ],
    },
    select: { id: true },
  });
  return Boolean(thread);
}

/** Configuration readiness is not a network or camera test. A staging call is still required. */
export function bcnDirectCallsConfigured() {
  if (!isBcnV2Enabled() || process.env.BCN_DIRECT_CALLS_ENABLED !== "true")
    return false;
  try {
    const url = new URL(process.env.LIVEKIT_URL || "");
    return (
      ["wss:", "https:"].includes(url.protocol) &&
      Boolean(
        process.env.LIVEKIT_API_KEY?.trim() &&
        process.env.LIVEKIT_API_SECRET?.trim(),
      )
    );
  } catch {
    return false;
  }
}

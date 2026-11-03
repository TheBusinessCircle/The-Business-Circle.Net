import "server-only";
import { prisma } from "@/lib/prisma";
import { CIRCLE_CARD_DISCOVER_VISIBLE_WHERE } from "@/lib/circle-card/privacy";
import { directoryCircleTrustScore, getLocalHubPath, isBusinessDirectoryCategory,
    sortLocalHubBusinesses, type LocalHubBusiness } from "@/lib/circle-card/local-hubs";
import { getPublicCircleCard } from "@/server/circle-card/public-card.service";

export async function getHucknallHubBusinesses(): Promise<LocalHubBusiness[]> {
  const candidates = await prisma.circleCard.findMany({
    where: { ...CIRCLE_CARD_DISCOVER_VISIBLE_WHERE, cardType: "BUSINESS",
      businessPostcode: { startsWith: "NG15 " }, user: { suspended: false } },
    select: { id: true, slug: true, cardType: true, businessPostcode: true,
      businessCategory: true, isPublished: true, showInDiscover: true, archivedAt: true },
    orderBy: { id: "asc" }
  });
  const businesses: LocalHubBusiness[] = [];
  // Use the canonical public-card loader for entitlement, moderation, media and Trust rules.
  // Bound concurrent database work and rank the complete eligible set, never a truncated sample.
  for (let offset = 0; offset < candidates.length; offset += 10) {
    const batch = candidates.slice(offset, offset + 10).filter(candidate => getLocalHubPath(candidate));
    const cards = await Promise.all(batch.map(candidate => getPublicCircleCard(candidate.slug)));
    for (let index = 0; index < batch.length; index += 1) {
      const card = cards[index];
      if (!card || card.isDemo) continue;
      const candidate = batch[index];
      const stillEligible = await prisma.circleCard.findFirst({
        where: { id: card.id, ...CIRCLE_CARD_DISCOVER_VISIBLE_WHERE, cardType: "BUSINESS",
          businessPostcode: { startsWith: "NG15 " }, user: { suspended: false } }, select: { id: true }
      });
      if (!stillEligible) continue;
      businesses.push({ id: card.id, slug: card.slug, name: card.businessName || card.fullName,
        description: card.tagline,
        imageUrl: card.businessLogoUrl || card.profileImageUrl || null,
        category: candidate.businessCategory && isBusinessDirectoryCategory(candidate.businessCategory)
          ? candidate.businessCategory : "other",
        trustScore: directoryCircleTrustScore(card.trust),
        verifiedTestimonials: card.trust.verifiedTestimonialCount });
    }
  }
  return sortLocalHubBusinesses(businesses);
}

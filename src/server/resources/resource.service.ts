import { MembershipTier, ResourceTier, ResourceType } from "@prisma/client";
import { db } from "@/lib/db";
import { getAccessibleResourceTiers } from "@/server/resources/resource-policy";

export type PublishedResourceSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  publishedAt: Date | null;
  updatedAt: Date;
};

export async function listLatestPublishedResources(
  membershipTier: MembershipTier,
  take = 6
): Promise<PublishedResourceSummary[]> {
  const visibleTiers = getAccessibleResourceTiers(membershipTier);

  return db.resource.findMany({
    where: {
      status: "PUBLISHED",
      tier: {
        in: visibleTiers
      }
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      tier: true,
      category: true,
      type: true,
      publishedAt: true,
      updatedAt: true
    }
  });
}

export async function getPublishedResourceBySlug(slug: string, membershipTier: MembershipTier) {
  const visibleTiers = getAccessibleResourceTiers(membershipTier);

  return db.resource.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      tier: {
        in: visibleTiers
      }
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      tier: true,
      category: true,
      type: true,
      publishedAt: true,
      updatedAt: true,
      createdAt: true
    }
  });
}

export async function getRelatedPublishedResources(
  resource: {
    id: string;
    tier: ResourceTier;
    category: string;
    type: ResourceType;
  },
  membershipTier: MembershipTier,
  take = 3
) {
  const visibleTiers = getAccessibleResourceTiers(membershipTier);

  const candidates = await db.resource.findMany({
    where: {
      status: "PUBLISHED",
      tier: {
        in: visibleTiers
      },
      id: {
        not: resource.id
      },
      OR: [
        { category: resource.category },
        { type: resource.type },
        { tier: resource.tier }
      ]
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      tier: true,
      category: true,
      type: true,
      publishedAt: true,
      updatedAt: true
    },
    take: 24
  });

  return candidates
    .map((candidate) => ({
      ...candidate,
      score:
        (candidate.category === resource.category ? 3 : 0) +
        (candidate.type === resource.type ? 2 : 0) +
        (candidate.tier === resource.tier ? 1 : 0)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const rightTime = right.publishedAt?.getTime() ?? right.updatedAt.getTime();
      const leftTime = left.publishedAt?.getTime() ?? left.updatedAt.getTime();
      return rightTime - leftTime;
    })
    .slice(0, take);
}

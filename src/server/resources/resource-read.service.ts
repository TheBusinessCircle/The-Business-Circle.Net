import { MembershipTier, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAccessibleResourceTiers } from "@/server/resources/resource-policy";

export type ResourceLibraryView = "unread" | "read" | "all";

export function normalizeResourceLibraryView(value: string | undefined): ResourceLibraryView {
  if (value === "read" || value === "all") {
    return value;
  }

  return "unread";
}

export function buildResourceReadFilter(userId: string, view: ResourceLibraryView): Prisma.ResourceWhereInput {
  if (view === "read") {
    return {
      readStates: {
        some: {
          userId
        }
      }
    };
  }

  if (view === "unread") {
    return {
      readStates: {
        none: {
          userId
        }
      }
    };
  }

  return {};
}

export async function getResourceReadStateForUser(input: {
  userId: string;
  resourceId: string;
}) {
  return db.resourceRead.findUnique({
    where: {
      userId_resourceId: {
        userId: input.userId,
        resourceId: input.resourceId
      }
    },
    select: {
      id: true,
      readAt: true
    }
  });
}

async function getAccessibleResourceIdBySlug(input: {
  slug: string;
  membershipTier: MembershipTier;
}) {
  const visibleTiers = getAccessibleResourceTiers(input.membershipTier);

  const resource = await db.resource.findFirst({
    where: {
      slug: input.slug,
      status: "PUBLISHED",
      tier: {
        in: visibleTiers
      }
    },
    select: {
      id: true
    }
  });

  if (!resource) {
    throw new Error("resource-not-found");
  }

  return resource.id;
}

export async function markResourceAsReadForUser(input: {
  userId: string;
  slug: string;
  membershipTier: MembershipTier;
}) {
  const resourceId = await getAccessibleResourceIdBySlug(input);

  return db.resourceRead.upsert({
    where: {
      userId_resourceId: {
        userId: input.userId,
        resourceId
      }
    },
    create: {
      userId: input.userId,
      resourceId
    },
    update: {
      readAt: new Date()
    }
  });
}

export async function markResourceAsUnreadForUser(input: {
  userId: string;
  slug: string;
  membershipTier: MembershipTier;
}) {
  const resourceId = await getAccessibleResourceIdBySlug(input);

  await db.resourceRead.deleteMany({
    where: {
      userId: input.userId,
      resourceId
    }
  });
}

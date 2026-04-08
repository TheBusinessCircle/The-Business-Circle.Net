import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CONNECTION_WIN_TAG } from "@/lib/connection-wins";
import {
  isRecoverableDatabaseError,
  logRecoverableDatabaseFallback
} from "@/lib/db-errors";
import { CACHE_TAGS } from "@/lib/cache";

export type PublicTrustSnapshot = {
  publicMemberCount: number;
  upcomingEventCount: number;
  activeServiceCount: number;
  activeDiscussionCount: number;
  recentResourceCount: number;
  connectionWinsCount: number;
};

export type PublicTrustDisplayItem = {
  value: string;
  label: string;
};

export type PublicTrustDisplay = {
  kind: "live" | "starter";
  items: PublicTrustDisplayItem[];
};

const EMPTY_SNAPSHOT: PublicTrustSnapshot = {
  publicMemberCount: 0,
  upcomingEventCount: 0,
  activeServiceCount: 0,
  activeDiscussionCount: 0,
  recentResourceCount: 0,
  connectionWinsCount: 0
};

async function loadPublicTrustSnapshot(): Promise<PublicTrustSnapshot> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [
      publicMemberCount,
      upcomingEventCount,
      activeServiceCount,
      activeDiscussionCount,
      recentResourceCount,
      connectionWinsCount
    ] = await Promise.all([
      db.user.count({
        where: {
          suspended: false,
          profile: {
            is: {
              isPublic: true
            }
          }
        }
      }),
      db.event.count({
        where: {
          startAt: {
            gte: new Date()
          },
          isCancelled: false
        }
      }),
      db.founderService.count({
        where: {
          active: true
        }
      }),
      db.communityPost.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: weekAgo
          }
        }
      }),
      db.resource.count({
        where: {
          status: "PUBLISHED",
          publishedAt: {
            gte: weekAgo
          }
        }
      }),
      db.communityPost.count({
        where: {
          deletedAt: null,
          tags: {
            has: CONNECTION_WIN_TAG
          },
          createdAt: {
            gte: monthAgo
          }
        }
      })
    ]);

    return {
      publicMemberCount,
      upcomingEventCount,
      activeServiceCount,
      activeDiscussionCount,
      recentResourceCount,
      connectionWinsCount
    };
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    logRecoverableDatabaseFallback("public-site", error);
    return EMPTY_SNAPSHOT;
  }
}

const getCachedPublicTrustSnapshot = unstable_cache(loadPublicTrustSnapshot, [CACHE_TAGS.publicTrust], {
  revalidate: 300
});

export async function getPublicTrustSnapshot(): Promise<PublicTrustSnapshot> {
  return getCachedPublicTrustSnapshot();
}

const STARTER_TRUST_ITEMS: PublicTrustDisplayItem[] = [
  {
    value: "Private",
    label: "member conversations"
  },
  {
    value: "Founder-led",
    label: "standards and moderation"
  },
  {
    value: "Curated",
    label: "introductions and events"
  }
];

export function buildPublicTrustDisplay(snapshot: PublicTrustSnapshot): PublicTrustDisplay {
  const liveItems: PublicTrustDisplayItem[] = [];

  if (snapshot.activeDiscussionCount >= 3) {
    liveItems.push({
      value: `${snapshot.activeDiscussionCount}+`,
      label: "active discussions"
    });
  }

  if (snapshot.connectionWinsCount >= 2) {
    liveItems.push({
      value: `${snapshot.connectionWinsCount}+`,
      label: "recent wins"
    });
  }

  if (snapshot.upcomingEventCount >= 1) {
    liveItems.push({
      value: `${snapshot.upcomingEventCount}`,
      label: "upcoming events"
    });
  }

  if (snapshot.recentResourceCount >= 2) {
    liveItems.push({
      value: `${snapshot.recentResourceCount}+`,
      label: "fresh resources"
    });
  }

  if (snapshot.publicMemberCount >= 5) {
    liveItems.push({
      value: `${snapshot.publicMemberCount}+`,
      label: "public member profiles"
    });
  }

  if (liveItems.length >= 2) {
    return {
      kind: "live",
      items: liveItems.slice(0, 3)
    };
  }

  return {
    kind: "starter",
    items: STARTER_TRUST_ITEMS
  };
}

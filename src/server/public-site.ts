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

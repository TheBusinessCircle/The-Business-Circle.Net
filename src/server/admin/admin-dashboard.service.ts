import { db } from "@/lib/db";
import type { AdminDashboardData } from "@/types";
import { getAdminMetrics } from "@/server/admin/admin-metrics.service";
import { getAdminCommunityGrowthSnapshot } from "@/server/community-recognition";

const RECENT_MEMBERS_LIMIT = 6;
const RECENT_RESOURCES_LIMIT = 6;
const RECENT_COMMUNITY_ACTIVITY_LIMIT = 8;
const UPCOMING_EVENTS_LIMIT = 6;

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    metrics,
    recentMembers,
    recentResources,
    recentCommunityActivity,
    upcomingEventItems,
    communityGrowth
  ] = await Promise.all([
    getAdminMetrics(),
    db.user.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: RECENT_MEMBERS_LIMIT,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        membershipTier: true,
        foundingTier: true,
        suspended: true,
        createdAt: true
      }
    }),
    db.resource.findMany({
      orderBy: {
        updatedAt: "desc"
      },
      take: RECENT_RESOURCES_LIMIT,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        tier: true,
        updatedAt: true
      }
    }),
    db.message.findMany({
      where: {
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
      },
      take: RECENT_COMMUNITY_ACTIVITY_LIMIT,
      select: {
        id: true,
        content: true,
        createdAt: true,
        channel: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),
    db.event.findMany({
      where: {
        startAt: {
          gte: new Date()
        },
        isCancelled: false
      },
      orderBy: {
        startAt: "asc"
      },
      take: UPCOMING_EVENTS_LIMIT,
      select: {
        id: true,
        title: true,
        startAt: true,
        accessTier: true,
        hostName: true
      }
    }),
    getAdminCommunityGrowthSnapshot()
  ]);

  return {
    metrics,
    recentMembers,
    recentResources,
    recentCommunityActivity,
    upcomingEventItems,
    communityGrowth
  };
}

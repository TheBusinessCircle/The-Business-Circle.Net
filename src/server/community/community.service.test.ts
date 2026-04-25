import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  channel: {
    findMany: vi.fn()
  },
  communityPost: {
    findMany: vi.fn()
  }
}));

const recognitionMock = vi.hoisted(() => ({
  getCommunityRecognitionForUsers: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: dbMock
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/community-recognition", () => recognitionMock);

vi.mock("@/server/messages", () => ({
  getDirectMessageRelationshipStateMap: vi.fn()
}));

vi.mock("@/server/events", () => ({
  listUpcomingEventsForTiers: vi.fn()
}));

import { getCommunityFeedPage } from "@/server/community/community.service";

describe("community feed service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recognitionMock.getCommunityRecognitionForUsers.mockResolvedValue(new Map());
  });

  it("returns BCN Updates posts for the dedicated standalone feed query", async () => {
    dbMock.channel.findMany.mockResolvedValue([
      {
        id: "channel_bcn",
        slug: "bcn-updates",
        name: "BCN Updates",
        description: "Curated business updates",
        topic: "BCN updates",
        accessTier: "FOUNDATION",
        accessLevel: "MEMBERS",
        position: 1,
        isPrivate: false,
        communityPosts: [{ createdAt: new Date("2026-04-19T09:00:00.000Z") }],
        _count: {
          communityPosts: 1
        }
      }
    ]);
    dbMock.communityPost.findMany.mockResolvedValue([
      {
        id: "post_bcn_1",
        channelId: "channel_bcn",
        userId: "user_admin",
        title: "Global hiring slows as businesses protect margins",
        content:
          "What happened:\nHiring plans are slowing across multiple sectors as companies protect margins.\n\nWhy this matters:\nThis shifts staffing and planning decisions for owner-led businesses.",
        tags: ["bcn-update", "curated", "finance"],
        kind: "FOUNDER_POST",
        promptId: null,
        promptTier: null,
        createdAt: new Date("2026-04-19T09:00:00.000Z"),
        updatedAt: new Date("2026-04-19T09:00:00.000Z"),
        user: {
          id: "user_admin",
          name: "Platform Admin",
          email: "admin@example.com",
          image: null,
          membershipTier: "CORE",
          role: "ADMIN",
          memberRoleTag: "FOUNDER",
          foundingMember: false,
          foundingTier: null,
          profile: {
            collaborationTags: [],
            business: {
              industry: null
            }
          }
        },
        likes: [],
        _count: {
          likes: 0,
          comments: 0
        }
      }
    ]);

    const feed = await getCommunityFeedPage({
      tiers: ["FOUNDATION"],
      selectedSlug: "bcn-updates",
      viewerUserId: "viewer_1",
      includeStandalone: true
    });

    expect(feed.selectedChannel?.slug).toBe("bcn-updates");
    expect(feed.posts).toHaveLength(1);
    expect(feed.posts[0]?.title).toBe("Global hiring slows as businesses protect margins");
  });
});

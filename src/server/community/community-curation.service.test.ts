import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  channel: {
    findUnique: vi.fn()
  },
  communityPost: {
    findFirst: vi.fn(),
    create: vi.fn()
  }
}));

const automationMock = vi.hoisted(() => ({
  ensureCommunityChannels: vi.fn(),
  resolveCommunityAutomationAuthorId: vi.fn()
}));

const loggingMock = vi.hoisted(() => ({
  logServerError: vi.fn(),
  logServerWarning: vi.fn()
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: dbMock
}));

vi.mock("@/server/community/community.service", () => automationMock);

vi.mock("@/lib/security/logging", () => loggingMock);

import {
  maybePublishBcnCuratedPosts,
  publishBcnCuratedPosts
} from "@/server/community/community-curation.service";

describe("community curation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BCN_COMMUNITY_AUTOMATION_ENABLED = "true";
    process.env.BCN_COMMUNITY_SOURCE_URL = "https://example.com/feed.json";
    process.env.BCN_COMMUNITY_SOURCE_NAME = "BCN Source";
    process.env.BCN_COMMUNITY_MAX_POSTS_PER_RUN = "2";
    process.env.BCN_COMMUNITY_AUTOMATION_THROTTLE_MS = "900000";

    automationMock.ensureCommunityChannels.mockResolvedValue(undefined);
    automationMock.resolveCommunityAutomationAuthorId.mockResolvedValue("user_admin");
    dbMock.channel.findUnique.mockResolvedValue({
      id: "channel_bcn"
    });
    dbMock.communityPost.findFirst.mockResolvedValue(null);
    dbMock.communityPost.create.mockResolvedValue({
      id: "post_bcn_1"
    });
  });

  it("publishes a new BCN curated post into the dedicated community channel", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          items: [
            {
              id: "item-1",
              title: "AI workflow changes are reshaping service delivery",
              summary:
                "Operators are redesigning internal processes around automation, pricing, and team capacity.",
              url: "https://example.com/ai-workflows",
              publishedAt: "2026-04-18T10:00:00.000Z"
            }
          ]
        })
      )
    });

    const result = await publishBcnCuratedPosts({
      fetchImpl
    });

    expect(result).toMatchObject({
      status: "completed",
      publishedCount: 1,
      duplicateCount: 0
    });
    expect(dbMock.communityPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channelId: "channel_bcn",
          userId: "user_admin",
          automationSource: "BCN Source",
          kind: "FOUNDER_POST"
        })
      })
    );
  });

  it("does not repost duplicate source items", async () => {
    dbMock.communityPost.findFirst.mockResolvedValue({
      id: "post_existing"
    });

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          items: [
            {
              id: "item-1",
              title: "AI workflow changes are reshaping service delivery",
              summary:
                "Operators are redesigning internal processes around automation, pricing, and team capacity.",
              url: "https://example.com/ai-workflows",
              publishedAt: "2026-04-18T10:00:00.000Z"
            }
          ]
        })
      )
    });

    const result = await publishBcnCuratedPosts({
      fetchImpl
    });

    expect(result).toMatchObject({
      status: "completed",
      publishedCount: 0,
      duplicateCount: 1
    });
    expect(dbMock.communityPost.create).not.toHaveBeenCalled();
  });

  it("throttles opportunistic publishing checks between runs", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          items: [
            {
              id: "item-1",
              title: "AI workflow changes are reshaping service delivery",
              summary:
                "Operators are redesigning internal processes around automation, pricing, and team capacity.",
              url: "https://example.com/ai-workflows",
              publishedAt: "2026-04-18T10:00:00.000Z"
            }
          ]
        })
      )
    });

    const firstRun = await maybePublishBcnCuratedPosts(new Date("2026-04-18T10:00:00.000Z"), {
      fetchImpl
    });
    const secondRun = await maybePublishBcnCuratedPosts(new Date("2026-04-18T10:01:00.000Z"), {
      fetchImpl
    });

    expect(firstRun.status).toBe("completed");
    expect(secondRun.status).toBe("throttled");
  });
});

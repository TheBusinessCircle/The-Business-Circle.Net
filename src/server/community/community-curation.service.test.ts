import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.hoisted(() => vi.fn());

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

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock
}));

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00.000Z"));
    process.env.BCN_COMMUNITY_AUTOMATION_ENABLED = "true";
    process.env.BCN_COMMUNITY_SOURCE_URL = "https://example.com/feed.json";
    process.env.BCN_COMMUNITY_SOURCE_URLS = "";
    process.env.BCN_COMMUNITY_SOURCE_NAME = "BCN Source";
    process.env.BCN_COMMUNITY_LOOKBACK_HOURS = "24";
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

  afterEach(() => {
    vi.useRealTimers();
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
                "Operators are redesigning internal processes around automation, pricing, and team capacity as service businesses adapt.",
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
      sourceCount: 1,
      publishedCount: 1,
      duplicateCount: 0,
      fetchedCount: 1,
      candidateCount: 1,
      rejectedNonEnglishCount: 0,
      rejectedStaleCount: 0
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/member/bcn-updates");
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
                "Operators are redesigning internal processes around automation, pricing, and team capacity as service businesses adapt.",
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

  it("dedupes overlapping stories across multiple configured sources", async () => {
    process.env.BCN_COMMUNITY_SOURCE_URL = "";
    process.env.BCN_COMMUNITY_SOURCE_URLS =
      "https://example.com/feed-a.xml, https://example.com/feed-b.xml";

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      return {
        ok: true,
        text: vi.fn().mockResolvedValue(
          url.includes("feed-a")
            ? `
                <rss>
                  <channel>
                    <title>Feed A</title>
                    <item>
                      <guid>feed-a-1</guid>
                      <title>Retail operators rethink staffing as consumer demand shifts</title>
                      <description>Retail businesses are adjusting staffing, inventory, and store planning as demand patterns move across regions.</description>
                      <link>https://example.com/shared-story?utm_source=feed-a</link>
                      <pubDate>Fri, 18 Apr 2026 10:00:00 GMT</pubDate>
                    </item>
                  </channel>
                </rss>
              `
            : `
                <rss>
                  <channel>
                    <title>Feed B</title>
                    <item>
                      <guid>feed-b-1</guid>
                      <title>Retail operators rethink staffing as consumer demand shifts</title>
                      <description>Retail businesses are adjusting staffing, inventory, and store planning as demand patterns move across regions.</description>
                      <link>https://example.com/shared-story?utm_source=feed-b</link>
                      <pubDate>Fri, 18 Apr 2026 10:05:00 GMT</pubDate>
                    </item>
                  </channel>
                </rss>
              `
        )
      } as Response;
    });

    const result = await publishBcnCuratedPosts({
      fetchImpl: fetchImpl as typeof fetch
    });

    expect(result).toMatchObject({
      status: "completed",
      sourceCount: 2,
      publishedCount: 1,
      duplicateCount: 1,
      fetchedCount: 2,
      candidateCount: 2
    });
    expect(dbMock.communityPost.create).toHaveBeenCalledTimes(1);
  });

  it("skips likely non-English items to keep BCN updates in English", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          items: [
            {
              id: "item-es",
              title: "Las empresas ajustan precios y contratacion por la presion de costos",
              summary:
                "Las empresas revisan operaciones y contratacion para proteger margenes en un entorno mas debil.",
              url: "https://example.com/spanish-story",
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
      rejectedNonEnglishCount: 1,
      rejectedStaleCount: 0
    });
    expect(dbMock.communityPost.create).not.toHaveBeenCalled();
  });

  it("only publishes items from the last 24 hours by default", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          items: [
            {
              id: "item-old",
              title: "Businesses adapt pricing after global shipping costs rise",
              summary:
                "Operators are adjusting delivery, pricing, and margin planning after another rise in shipping costs across regions.",
              url: "https://example.com/old-story",
              publishedAt: "2026-04-16T10:00:00.000Z"
            }
          ]
        })
      )
    });

    vi.setSystemTime(new Date("2026-04-18T12:00:00.000Z"));

    const result = await publishBcnCuratedPosts({
      fetchImpl
    });

    expect(result).toMatchObject({
      status: "completed",
      publishedCount: 0,
      rejectedStaleCount: 1
    });
    expect(dbMock.communityPost.create).not.toHaveBeenCalled();
  });

  it("handles a missing source URL clearly", async () => {
    process.env.BCN_COMMUNITY_SOURCE_URL = "";
    process.env.BCN_COMMUNITY_SOURCE_URLS = "";

    const result = await publishBcnCuratedPosts();

    expect(result).toMatchObject({
      status: "missing-source",
      publishedCount: 0,
      message: expect.stringContaining("BCN_COMMUNITY_SOURCE_URLS")
    });
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
                "Operators are redesigning internal processes around automation, pricing, and team capacity as service businesses adapt.",
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

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
    process.env.BCN_COMMUNITY_AUTOMATION_THROTTLE_MS = "300000";

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
      sourceConfigured: true,
      authorResolved: true,
      publishedCount: 1,
      duplicateCount: 0,
      fetchedCount: 1,
      candidateCount: 1,
      rejectedNonEnglishCount: 0,
      rejectedNotRelevantCount: 0,
      rejectedStaleCount: 0,
      lookbackHours: 24,
      maxPostsPerRun: 2,
      throttleMs: 300000
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

  it("clusters overlapping stories across multiple configured sources and publishes only one winner", async () => {
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

  it("prefers the richer source when two feeds cover the same story", async () => {
    process.env.BCN_COMMUNITY_SOURCE_URL = "";
    process.env.BCN_COMMUNITY_SOURCE_URLS =
      "https://example.com/feed-thin.xml, https://example.com/feed-rich.xml";

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      return {
        ok: true,
        text: vi.fn().mockResolvedValue(
          url.includes("feed-thin")
            ? `
                <rss>
                  <channel>
                    <title>Thin Wire</title>
                    <item>
                      <guid>thin-1</guid>
                      <title>Volvo recalls hybrid SUVs over battery issue</title>
                      <description>Volvo has issued a recall on hybrid SUVs over a battery issue.</description>
                      <link>https://example.com/volvo-recall-thin</link>
                      <pubDate>Fri, 18 Apr 2026 10:00:00 GMT</pubDate>
                    </item>
                  </channel>
                </rss>
              `
            : `
                <rss>
                  <channel>
                    <title>Reuters</title>
                    <item>
                      <guid>rich-1</guid>
                      <title>Volvo recalls 48,000 XC60 and XC90 hybrid SUVs across Europe over battery fire risk</title>
                      <description>Volvo is recalling 48,000 XC60 and XC90 hybrid SUVs across Europe after identifying a battery module defect linked to overheating and fire risk.</description>
                      <link>https://example.com/volvo-recall-rich</link>
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
      publishedCount: 1,
      duplicateCount: 1,
      candidateCount: 2
    });
    expect(dbMock.communityPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title:
            "Volvo recalls 48,000 XC60 and XC90 hybrid SUVs across Europe over battery fire risk"
        })
      })
    );
  });

  it("publishes only the best two non-overlapping stories per run", async () => {
    process.env.BCN_COMMUNITY_SOURCE_URL = "";
    process.env.BCN_COMMUNITY_SOURCE_URLS =
      "https://example.com/feed-a.xml, https://example.com/feed-b.xml, https://example.com/feed-c.xml";
    process.env.BCN_COMMUNITY_MAX_POSTS_PER_RUN = "2";
    dbMock.communityPost.create
      .mockResolvedValueOnce({ id: "post_bcn_newest" })
      .mockResolvedValueOnce({ id: "post_bcn_second" });

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
                      <guid>feed-a-older</guid>
                      <title>Manufacturers rethink pricing after freight costs rise</title>
                      <description>Exporters are revising pricing and delivery windows after another jump in freight costs, with margin pressure building across supply chains.</description>
                      <link>https://example.com/feed-a-older</link>
                      <pubDate>Fri, 18 Apr 2026 08:00:00 GMT</pubDate>
                    </item>
                  </channel>
                </rss>
              `
            : url.includes("feed-b")
              ? `
                <rss>
                  <channel>
                    <title>Feed B</title>
                    <item>
                      <guid>feed-b-newest</guid>
                      <title>Chip suppliers raise investment plans as demand improves</title>
                      <description>Semiconductor suppliers are expanding investment plans as enterprise demand and cloud orders improve, signalling stronger capacity and procurement activity.</description>
                      <link>https://example.com/feed-b-newest</link>
                      <pubDate>Fri, 18 Apr 2026 11:30:00 GMT</pubDate>
                    </item>
                    <item>
                      <guid>feed-b-duplicate</guid>
                      <title>Semiconductor suppliers expand investment plans as cloud demand improves</title>
                      <description>Chipmakers are increasing investment plans as enterprise cloud demand improves and order books strengthen.</description>
                      <link>https://example.com/feed-b-duplicate</link>
                      <pubDate>Fri, 18 Apr 2026 11:20:00 GMT</pubDate>
                    </item>
                  </channel>
                </rss>
              `
              : `
                <rss>
                  <channel>
                    <title>Reuters</title>
                    <item>
                      <guid>feed-c-rich</guid>
                      <title>EU AI Act disclosure rules push Adobe and Microsoft to update enterprise copilots</title>
                      <description>Adobe and Microsoft are updating enterprise AI product messaging and compliance workflows ahead of new EU AI Act disclosure expectations across European markets.</description>
                      <link>https://example.com/feed-c-rich</link>
                      <pubDate>Fri, 18 Apr 2026 10:45:00 GMT</pubDate>
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
      sourceCount: 3,
      publishedCount: 2,
      fetchedCount: 4,
      duplicateCount: 1,
      maxPostsPerRun: 2
    });
    const publishedTitles = dbMock.communityPost.create.mock.calls.map(
      ([input]) => input.data.title
    );

    expect(publishedTitles).toContain(
      "EU AI Act disclosure rules push Adobe and Microsoft to update enterprise copilots"
    );
    expect(new Set(publishedTitles).size).toBe(2);
    expect(
      publishedTitles.filter(
        (title) =>
          title.toLowerCase().includes("chip") || title.toLowerCase().includes("semiconductor")
      ).length
    ).toBeLessThanOrEqual(1);
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
      rejectedNotRelevantCount: 0,
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
      sourceConfigured: false,
      message: expect.stringContaining("BCN_COMMUNITY_SOURCE_URLS")
    });
  });

  it("fails clearly when no automation author can be resolved", async () => {
    automationMock.resolveCommunityAutomationAuthorId.mockResolvedValue(null);

    const result = await publishBcnCuratedPosts();

    expect(result).toMatchObject({
      status: "missing-author",
      sourceConfigured: true,
      authorResolved: false,
      publishedCount: 0,
      message: expect.stringContaining("COMMUNITY_AUTOMATION_AUTHOR_ID")
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

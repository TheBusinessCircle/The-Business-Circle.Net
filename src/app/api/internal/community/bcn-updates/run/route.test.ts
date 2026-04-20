import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/internal-route-auth", () => ({
  isAuthorizedInternalAutomationRequest: authMock
}));

vi.mock("@/server/community/community-curation.service", () => ({
  publishBcnCuratedPosts: publishMock
}));

import { GET } from "@/app/api/internal/community/bcn-updates/run/route";

describe("BCN automation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.COMMUNITY_AUTOMATION_SECRET = "community-secret";
    process.env.CRON_SECRET = "cron-secret";
    process.env.BCN_COMMUNITY_SOURCE_NAME = "BCN Source";
  });

  it("rejects unauthorized automation requests", async () => {
    authMock.mockReturnValue(false);

    const response = await GET(new Request("http://localhost/api/internal/community/bcn-updates/run"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      status: "unauthorized"
    });
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("returns a clear JSON summary for configuration failures", async () => {
    authMock.mockReturnValue(true);
    process.env.BCN_COMMUNITY_SOURCE_URL = "";
    process.env.BCN_COMMUNITY_SOURCE_URLS = "";
    publishMock.mockResolvedValue({
      status: "missing-source",
      sourceCount: 0,
      sourceConfigured: false,
      authorResolved: null,
      fetchedCount: 0,
      candidateCount: 0,
      publishedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      rejectedNonEnglishCount: 0,
      rejectedNotRelevantCount: 0,
      rejectedStaleCount: 0,
      lookbackHours: 24,
      maxPostsPerRun: 5,
      throttleMs: 300000,
      publishedPostIds: [],
      errors: [],
      message: "BCN_COMMUNITY_SOURCE_URL is blank."
    });

    const response = await GET(new Request("http://localhost/api/internal/community/bcn-updates/run"));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      ok: false,
      status: "missing-source",
      sourceConfigured: false,
      authorResolved: null,
      lookbackHours: 24,
      maxPostsPerRun: 5,
      throttleMs: 300000,
      sourceMode: "unconfigured"
    });
  });

  it("returns publish details when a BCN update is created", async () => {
    authMock.mockReturnValue(true);
    process.env.BCN_COMMUNITY_SOURCE_URL = "";
    process.env.BCN_COMMUNITY_SOURCE_URLS =
      "https://example.com/feed,https://example.com/feed-2";
    publishMock.mockResolvedValue({
      status: "completed",
      sourceCount: 2,
      sourceConfigured: true,
      authorResolved: true,
      fetchedCount: 3,
      candidateCount: 2,
      publishedCount: 1,
      duplicateCount: 0,
      skippedCount: 0,
      rejectedNonEnglishCount: 1,
      rejectedNotRelevantCount: 1,
      rejectedStaleCount: 0,
      lookbackHours: 24,
      maxPostsPerRun: 5,
      throttleMs: 300000,
      publishedPostIds: ["post_bcn_1"],
      errors: [],
      message: "Published 1 BCN update into the dedicated BCN Updates feed."
    });

    const response = await GET(new Request("http://localhost/api/internal/community/bcn-updates/run"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      status: "completed",
      sourceCount: 2,
      sourceConfigured: true,
      authorResolved: true,
      fetchedCount: 3,
      candidateCount: 2,
      publishedCount: 1,
      rejectedNotRelevantCount: 1,
      rejectedNonEnglishCount: 1,
      publishedPostIds: ["post_bcn_1"],
      lookbackHours: 24,
      maxPostsPerRun: 5,
      throttleMs: 300000,
      sourceMode: "multi-source"
    });
  });

  it("returns zero-publish diagnostics when everything is filtered out", async () => {
    authMock.mockReturnValue(true);
    process.env.BCN_COMMUNITY_SOURCE_URL = "";
    process.env.BCN_COMMUNITY_SOURCE_URLS = "https://example.com/feed";
    publishMock.mockResolvedValue({
      status: "completed",
      sourceCount: 1,
      sourceConfigured: true,
      authorResolved: true,
      fetchedCount: 4,
      candidateCount: 0,
      publishedCount: 0,
      duplicateCount: 1,
      skippedCount: 2,
      rejectedNonEnglishCount: 0,
      rejectedNotRelevantCount: 2,
      rejectedStaleCount: 1,
      lookbackHours: 24,
      maxPostsPerRun: 5,
      throttleMs: 300000,
      publishedPostIds: [],
      errors: [],
      message: "No BCN updates were published. Fetched 4 items from 1 source."
    });

    const response = await GET(new Request("http://localhost/api/internal/community/bcn-updates/run"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      status: "completed",
      sourceConfigured: true,
      authorResolved: true,
      fetchedCount: 4,
      publishedCount: 0,
      duplicateCount: 1,
      rejectedNotRelevantCount: 2,
      rejectedStaleCount: 1,
      sourceMode: "multi-source"
    });
  });
});

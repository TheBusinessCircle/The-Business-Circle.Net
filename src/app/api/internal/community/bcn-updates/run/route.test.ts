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
    publishMock.mockResolvedValue({
      status: "missing-source",
      publishedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      fetchedItemCount: 0,
      publishedPostIds: [],
      message: "BCN_COMMUNITY_SOURCE_URL is blank."
    });

    const response = await GET(new Request("http://localhost/api/internal/community/bcn-updates/run"));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      ok: false,
      status: "missing-source",
      sourceConfigured: false
    });
  });

  it("returns publish details when a BCN update is created", async () => {
    authMock.mockReturnValue(true);
    process.env.BCN_COMMUNITY_SOURCE_URL = "https://example.com/feed";
    publishMock.mockResolvedValue({
      status: "completed",
      publishedCount: 1,
      duplicateCount: 0,
      skippedCount: 0,
      fetchedItemCount: 3,
      publishedPostIds: ["post_bcn_1"],
      message: "Published 1 BCN update into the dedicated BCN Updates feed."
    });

    const response = await GET(new Request("http://localhost/api/internal/community/bcn-updates/run"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      status: "completed",
      publishedCount: 1,
      fetchedItemCount: 3,
      publishedPostIds: ["post_bcn_1"]
    });
  });
});

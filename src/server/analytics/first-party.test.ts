import { beforeEach, describe, expect, it, vi } from "vitest";
import { isLikelyBot, parseDevice } from "@/lib/analytics/first-party";

const siteVisitorUpsertMock = vi.hoisted(() => vi.fn());
const siteSessionFindFirstMock = vi.hoisted(() => vi.fn());
const siteSessionCreateMock = vi.hoisted(() => vi.fn());
const siteSessionUpdateMock = vi.hoisted(() => vi.fn());
const sitePageViewCreateMock = vi.hoisted(() => vi.fn());
const siteEventCreateMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteVisitor: { upsert: siteVisitorUpsertMock },
    siteSession: {
      findFirst: siteSessionFindFirstMock,
      create: siteSessionCreateMock,
      update: siteSessionUpdateMock
    },
    sitePageView: { create: sitePageViewCreateMock },
    siteEvent: { create: siteEventCreateMock },
    founderAuditSubmission: { create: vi.fn() }
  }
}));

import { collectFirstPartyAnalytics } from "@/server/analytics/first-party";

describe("first-party analytics collection helpers", () => {
  it("flags common bot user agents", () => {
    expect(isLikelyBot("Googlebot/2.1")).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 Chrome/125 Safari/537.36")).toBe(false);
  });

  it("classifies broad device, browser, and OS details without storing sensitive data", () => {
    expect(
      parseDevice(
        "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1"
      )
    ).toEqual({
      deviceType: "Mobile",
      browser: "Safari",
      os: "Apple"
    });
  });
});

describe("first-party analytics privacy boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    siteVisitorUpsertMock.mockResolvedValue({ id: "visitor-1" });
    siteSessionFindFirstMock.mockResolvedValue(null);
    siteSessionCreateMock.mockResolvedValue({ id: "session-1" });
    siteSessionUpdateMock.mockResolvedValue({ id: "session-1" });
    sitePageViewCreateMock.mockResolvedValue({ id: "view-1" });
    siteEventCreateMock.mockResolvedValue({ id: "event-1" });
  });

  it("never persists reset tokens, complete auth URLs, emails, or invitation codes", async () => {
    const token = "0123456789abcdef".repeat(4);
    const email = "private.owner@example.test";
    const inviteCode = "PRIVATE-INVITE-CODE";
    const testimonialToken = "PRIVATE-TESTIMONIAL-REQUEST-TOKEN";

    await collectFirstPartyAnalytics({
      anonymousId: "anonymous-test-id",
      eventName: "page_view",
      path: `/reset-password?email=${email}&token=${token}`,
      referrer: `https://thebusinesscircle.net/invite/${inviteCode}`,
      metadata: null,
      userAgent: "Mozilla/5.0 Chrome/125 Safari/537.36"
    });

    await collectFirstPartyAnalytics({
      anonymousId: "anonymous-test-id",
      eventName: "spin_to_connect_started",
      path: `/testimonial/${testimonialToken}`,
      metadata: {
        destination: `/invite/${inviteCode}`,
        inviteCode,
        token,
        email
      },
      userAgent: "Mozilla/5.0 Chrome/125 Safari/537.36"
    });

    const persisted = JSON.stringify({
      sessions: siteSessionCreateMock.mock.calls,
      pageViews: sitePageViewCreateMock.mock.calls,
      events: siteEventCreateMock.mock.calls
    });
    expect(persisted).not.toContain(token);
    expect(persisted).not.toContain(email);
    expect(persisted).not.toContain(inviteCode);
    expect(persisted).not.toContain(testimonialToken);
    expect(persisted).not.toContain("reset-password?");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { LaunchCodeRedemptionStatus } from "@prisma/client";

const NOW = new Date("2026-05-27T12:00:00.000Z");

const dbMock = vi.hoisted(() => ({
  growthIntelligenceReport: {
    findFirst: vi.fn(),
    create: vi.fn()
  },
  siteSession: {
    findMany: vi.fn()
  },
  sitePageView: {
    findMany: vi.fn()
  },
  siteEvent: {
    findMany: vi.fn()
  },
  founderAuditSubmission: {
    findMany: vi.fn()
  },
  launchCodeRedemption: {
    findMany: vi.fn()
  },
  testimonial: {
    findMany: vi.fn()
  }
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
  withTransaction: vi.fn()
}));

import {
  calculateGrowthHealthScore,
  EMPTY_GROWTH_REPORT_SUMMARY,
  generateGrowthReportNow,
  getCurrentGrowthReport,
  type GrowthMetricsSnapshot
} from "@/server/admin/growth-report.service";

function hoursAgo(hours: number) {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000);
}

function session(id: string, hours: number, source = "Direct", deviceType = "Desktop") {
  return {
    id,
    source,
    referrer: null,
    entryPath: "/",
    deviceType,
    createdAt: hoursAgo(hours)
  };
}

function pageView(id: string, path: string, hours: number, visitorId = id, deviceType = "Desktop") {
  return {
    id,
    visitorId,
    path,
    deviceType,
    createdAt: hoursAgo(hours),
    session: { source: "Direct", deviceType }
  };
}

function event(
  id: string,
  eventName: string,
  hours: number,
  metadata: Record<string, unknown> | null = null,
  path = "/"
) {
  return {
    id,
    eventName,
    path,
    metadata,
    createdAt: hoursAgo(hours),
    session: {
      source: "Direct",
      referrer: null,
      entryPath: path,
      deviceType: "Desktop"
    }
  };
}

function audit(id: string, hours: number, score = 21, weaknesses: string[] = ["Positioning"]) {
  return {
    id,
    score,
    resultType: "BUILDING",
    weaknesses,
    createdAt: hoursAgo(hours),
    referrer: null,
    sourcePath: "/audit"
  };
}

function redemption(id: string, hours: number, status = LaunchCodeRedemptionStatus.CHECKOUT_STARTED) {
  return {
    id,
    status,
    sourcePlatform: "Facebook",
    createdAt: hoursAgo(hours),
    completedAt: null,
    launchCode: { platform: "Facebook" }
  };
}

function testimonial(id: string, hours: number) {
  return {
    id,
    status: "PENDING",
    source: "PUBLIC_FORM",
    createdAt: hoursAgo(hours),
    submittedAt: hoursAgo(hours),
    completedAt: hoursAgo(hours),
    googleReviewIntentClickedAt: hoursAgo(hours)
  };
}

function mockWindowData({
  sessions = [],
  pageViews = [],
  events = [],
  audits = [],
  launchRedemptions = [],
  testimonials = []
}: {
  sessions?: unknown[];
  pageViews?: unknown[];
  events?: unknown[];
  audits?: unknown[];
  launchRedemptions?: unknown[];
  testimonials?: unknown[];
} = {}) {
  dbMock.siteSession.findMany.mockResolvedValue(sessions);
  dbMock.sitePageView.findMany.mockResolvedValue(pageViews);
  dbMock.siteEvent.findMany.mockResolvedValue(events);
  dbMock.founderAuditSubmission.findMany.mockResolvedValue(audits);
  dbMock.launchCodeRedemption.findMany.mockResolvedValue(launchRedemptions);
  dbMock.testimonial.findMany.mockResolvedValue(testimonials);
}

function createdReport(data: Record<string, unknown>) {
  return {
    id: "report_1",
    ...data,
    createdAt: data.generatedAt,
    updatedAt: data.generatedAt
  };
}

describe("growth-report.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.growthIntelligenceReport.findFirst.mockResolvedValue(null);
    dbMock.growthIntelligenceReport.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      createdReport(data)
    );
    mockWindowData();
  });

  it("generates a useful empty state with no first-party growth data", async () => {
    const report = await generateGrowthReportNow({ now: NOW });

    expect(report.summary).toBe(EMPTY_GROWTH_REPORT_SUMMARY);
    expect(report.healthScore).toBeNull();
    expect(report.keyFindings).toContain(EMPTY_GROWTH_REPORT_SUMMARY);
    expect(report.nextRefreshAt).toEqual(hoursAgo(-12));
  });

  it("flags membership visits with zero join intent as a conversion gap", async () => {
    mockWindowData({
      sessions: Array.from({ length: 11 }, (_, index) => session(`s_${index}`, 1)),
      pageViews: Array.from({ length: 11 }, (_, index) =>
        pageView(`pv_${index}`, "/membership", 1, `v_${index}`)
      )
    });

    const report = await generateGrowthReportNow({ now: NOW });

    expect(report.momentumLabel).toBe("Conversion gap");
    expect(report.keyFindings.join(" ")).toContain("Membership page visits are high");
    expect(report.recommendedActions[0]?.title).toBe("Clarify the membership next step");
  });

  it("includes Founder Audit completions and weak areas", async () => {
    mockWindowData({
      events: [event("e_1", "audit_started", 1, null, "/audit")],
      audits: [audit("a_1", 1, 23, ["Offer clarity"])]
    });

    const report = await generateGrowthReportNow({ now: NOW });

    expect(report.momentumLabel).toBe("Audit interest");
    expect(report.metricsSnapshot.audit.completions).toBe(1);
    expect(report.metricsSnapshot.audit.averageScore).toBe(23);
    expect(report.keyFindings.join(" ")).toContain("Founder Audit completions");
    expect(report.keyFindings.join(" ")).toContain("Offer clarity");
  });

  it("uses launch code events and redemption state without inventing completions", async () => {
    mockWindowData({
      events: [
        event("e_1", "launch_code_entered", 1, { platform: "Facebook" }, "/membership"),
        event("e_2", "launch_code_validated", 1, { platform: "Facebook" }, "/membership")
      ],
      launchRedemptions: [redemption("r_1", 1)]
    });

    const report = await generateGrowthReportNow({ now: NOW });

    expect(report.momentumLabel).toBe("Launch code interest");
    expect(report.metricsSnapshot.launchCodes.byPlatform[0]).toMatchObject({
      platform: "Facebook",
      entered: 1,
      validated: 1,
      checkoutStarts: 1,
      checkoutCompletions: 0
    });
    expect(report.recommendedActions.map((action) => action.title)).toContain(
      "Strengthen the launch code value message"
    );
  });

  it("turns review events into trust-building recommendations", async () => {
    mockWindowData({
      events: [
        event("e_1", "review_request_page_viewed", 1, null, "/review"),
        event("e_2", "google_review_clicked", 1, null, "/review"),
        event("e_3", "review_submitted", 1, null, "/testimonial")
      ],
      testimonials: [testimonial("t_1", 1)]
    });

    const report = await generateGrowthReportNow({ now: NOW });

    expect(report.metricsSnapshot.reviews).toEqual({
      requestPageViews: 1,
      submissions: 1,
      googleReviewClicks: 1
    });
    expect(report.recommendedActions.map((action) => action.title)).toContain(
      "Turn trust proof into the next post"
    );
  });

  it("reuses the stored report inside the 12-hour refresh window", async () => {
    const cached = createdReport({
      range: "24h",
      generatedAt: hoursAgo(2),
      nextRefreshAt: hoursAgo(-10),
      headline: "Cached headline",
      summary: "Cached summary",
      healthScore: 72,
      momentumLabel: "Building attention",
      keyFindings: ["Cached finding"],
      risks: ["Cached risk"],
      opportunities: ["Cached opportunity"],
      recommendedActions: [],
      priorityAction: "Cached move",
      metricsSnapshot: { hasEnoughData: true }
    });
    dbMock.growthIntelligenceReport.findFirst.mockResolvedValue(cached);

    const report = await getCurrentGrowthReport({ now: NOW });

    expect(report.headline).toBe("Cached headline");
    expect(dbMock.growthIntelligenceReport.create).not.toHaveBeenCalled();
    expect(dbMock.growthIntelligenceReport.findFirst).toHaveBeenCalledWith({
      where: {
        range: "24h",
        nextRefreshAt: { gt: NOW }
      },
      orderBy: { generatedAt: "desc" }
    });
  });

  it("keeps generated health scores within 0 and 100", async () => {
    mockWindowData({
      sessions: Array.from({ length: 80 }, (_, index) => session(`s_${index}`, 1)),
      pageViews: Array.from({ length: 240 }, (_, index) =>
        pageView(`pv_${index}`, index % 3 === 0 ? "/membership" : "/", 1, `v_${index % 80}`)
      ),
      events: [
        event("e_1", "join_cta_clicked", 1),
        event("e_2", "checkout_started", 1),
        event("e_3", "checkout_completed", 1),
        event("e_4", "audit_started", 1),
        event("e_5", "review_submitted", 1)
      ],
      audits: [audit("a_1", 1, 30)]
    });

    const report = await generateGrowthReportNow({ now: NOW });

    expect(report.healthScore).toBeGreaterThanOrEqual(0);
    expect(report.healthScore).toBeLessThanOrEqual(100);

    const rawScore = calculateGrowthHealthScore({
      ...report.metricsSnapshot,
      current: {
        ...report.metricsSnapshot.current,
        visitors: 0,
        pageViews: 0,
        pageViewsPerVisitor: 0
      },
      membership: {
        pageVisits: 200,
        joinIntentEvents: 0
      },
      checkout: {
        starts: 20,
        completions: 0
      }
    } as GrowthMetricsSnapshot);

    expect(rawScore).toBeGreaterThanOrEqual(0);
    expect(rawScore).toBeLessThanOrEqual(100);
  });
});

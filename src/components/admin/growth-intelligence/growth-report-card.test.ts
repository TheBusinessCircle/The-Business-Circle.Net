import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GrowthReportCard } from "@/components/admin/growth-intelligence/growth-report-card";
import type { GrowthReportView } from "@/server/admin/growth-report.service";

function reportFixture(): GrowthReportView {
  const generatedAt = new Date("2026-05-27T12:00:00.000Z");

  return {
    id: "report_1",
    range: "24h",
    generatedAt,
    nextRefreshAt: new Date("2026-05-28T00:00:00.000Z"),
    headline: "Membership interest is ahead of join action",
    summary: "A practical report summary.",
    healthScore: 68,
    momentumLabel: "Conversion gap",
    keyFindings: ["Membership page visits are high compared with join intent."],
    risks: ["The membership explanation may be unclear."],
    opportunities: ["Add a short what happens after you join section."],
    recommendedActions: [
      {
        title: "Clarify the membership next step",
        reason: "Membership page visits are high but join intent is zero.",
        suggestedNextStep: "Add a clearer CTA above the pricing decision.",
        urgency: "high",
        relatedMetric: "12 membership visits / 0 join intents"
      }
    ],
    priorityAction: "Make the membership next step clearer before pushing more traffic.",
    publicNarrativeSuggestion:
      "Explain what changes after joining BCN so warm visitors understand the internal founder operating system.",
    metricsSnapshot: {
      range: "24h",
      period: {
        start: generatedAt.toISOString(),
        end: generatedAt.toISOString(),
        previousStart: generatedAt.toISOString(),
        previousEnd: generatedAt.toISOString(),
        sevenDayStart: generatedAt.toISOString()
      },
      current: {
        visitors: 12,
        uniqueVisitors: 12,
        pageViews: 18,
        membershipPageVisits: 12,
        joinIntentEvents: 0,
        auditStarts: 0,
        auditCompletions: 0,
        launchCodeEvents: 0,
        checkoutStarts: 0,
        checkoutCompletions: 0,
        reviewSignals: 0,
        pageViewsPerVisitor: 1.5,
        joinIntentRate: 0,
        checkoutCompletionRate: 0
      },
      previous: {
        visitors: 4,
        uniqueVisitors: 4,
        pageViews: 5,
        membershipPageVisits: 2,
        joinIntentEvents: 0,
        auditStarts: 0,
        auditCompletions: 0,
        launchCodeEvents: 0,
        checkoutStarts: 0,
        checkoutCompletions: 0,
        reviewSignals: 0
      },
      sevenDayContext: {
        visitors: 20,
        uniqueVisitors: 18,
        pageViews: 40,
        membershipPageVisits: 14,
        joinIntentEvents: 1,
        auditStarts: 0,
        auditCompletions: 0,
        launchCodeEvents: 0,
        checkoutStarts: 0,
        checkoutCompletions: 0,
        reviewSignals: 0
      },
      topPages: [],
      trafficSources: [],
      deviceBreakdown: [],
      busiestTimes: { hours: [], days: [] },
      audit: {
        starts: 0,
        completions: 0,
        completionRate: 0,
        averageScore: null,
        resultTypes: [],
        weakAreas: []
      },
      membership: {
        pageVisits: 12,
        joinIntentEvents: 0
      },
      launchCodes: {
        entered: 0,
        validated: 0,
        checkoutStarts: 0,
        checkoutCompletions: 0,
        byPlatform: []
      },
      checkout: {
        starts: 0,
        completions: 0
      },
      reviews: {
        requestPageViews: 0,
        submissions: 0,
        googleReviewClicks: 0
      },
      recentActivity: [],
      hasEnoughData: true
    },
    createdAt: generatedAt,
    updatedAt: generatedAt
  };
}

describe("GrowthReportCard", () => {
  it("renders the 12-hour report card with manual refresh and panels", () => {
    const markup = renderToStaticMarkup(
      createElement(GrowthReportCard, {
        report: reportFixture(),
        refreshAction: "/admin/growth-intelligence"
      })
    );

    expect(markup).toContain("12-Hour Growth Report");
    expect(markup).toContain("A practical read on what is happening now and what to do next.");
    expect(markup).toContain("Refresh report now");
    expect(markup).toContain("Last generated");
    expect(markup).toContain("Next refresh");
    expect(markup).toContain("Key Findings");
    expect(markup).toContain("Opportunities");
    expect(markup).toContain("Risks");
    expect(markup).toContain("Recommended Actions");
    expect(markup).toContain("One Priority Move");
    expect(markup).toContain("Public narrative suggestion");
    expect(markup).toContain("No external AI is used");
  });
});

import { LaunchCodeRedemptionStatus, Prisma } from "@prisma/client";
import { parseTrafficSource, type TrafficSource } from "@/lib/analytics/source";
import { prisma } from "@/lib/prisma";

export const DEFAULT_GROWTH_REPORT_RANGE = "24h";
export const GROWTH_REPORT_REFRESH_HOURS = 12;
export const EMPTY_GROWTH_REPORT_SUMMARY =
  "There is not enough growth data yet for a strong report. Keep posting, collecting visits and pushing the audit/review flows. The report will become more useful as more activity comes in.";

const JOIN_INTENT_EVENTS = [
  "join_cta_clicked",
  "membership_selected_from_audit",
  "founder_audit_membership_clicked"
] as const;

const LAUNCH_CODE_EVENTS = [
  "launch_code_entered",
  "launch_code_validated",
  "launch_code_invalid",
  "launch_code_full",
  "launch_code_checkout_started",
  "launch_code_checkout_completed",
  "launch_code_subscription_trialing",
  "launch_code_subscription_active"
] as const;

const LAUNCH_CODE_COMPLETED_STATUSES: LaunchCodeRedemptionStatus[] = [
  LaunchCodeRedemptionStatus.CHECKOUT_COMPLETED,
  LaunchCodeRedemptionStatus.SUBSCRIPTION_TRIALING,
  LaunchCodeRedemptionStatus.SUBSCRIPTION_ACTIVE
];

const LAUNCH_CODE_CHECKOUT_STARTED_STATUSES: LaunchCodeRedemptionStatus[] = [
  LaunchCodeRedemptionStatus.CHECKOUT_STARTED,
  ...LAUNCH_CODE_COMPLETED_STATUSES
];

type Urgency = "low" | "medium" | "high";

export type GrowthRecommendedAction = {
  title: string;
  reason: string;
  suggestedNextStep: string;
  urgency: Urgency;
  relatedMetric: string;
};

type CountBreakdown = Array<{ label: string; count: number }>;

type PeriodMetrics = {
  visitors: number;
  uniqueVisitors: number;
  pageViews: number;
  membershipPageVisits: number;
  joinIntentEvents: number;
  auditStarts: number;
  auditCompletions: number;
  launchCodeEvents: number;
  checkoutStarts: number;
  checkoutCompletions: number;
  reviewSignals: number;
};

export type GrowthMetricsSnapshot = {
  range: string;
  period: {
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
    sevenDayStart: string;
  };
  current: PeriodMetrics & {
    pageViewsPerVisitor: number;
    joinIntentRate: number;
    checkoutCompletionRate: number;
  };
  previous: PeriodMetrics;
  sevenDayContext: PeriodMetrics;
  topPages: Array<{
    page: string;
    views: number;
    uniqueVisitors: number;
  }>;
  trafficSources: Array<{ source: string; visits: number; percentage: number }>;
  deviceBreakdown: Array<{ device: string; views: number; percentage: number }>;
  busiestTimes: {
    hours: Array<{ hour: string; views: number }>;
    days: Array<{ day: string; views: number }>;
  };
  audit: {
    starts: number;
    completions: number;
    completionRate: number;
    averageScore: number | null;
    resultTypes: CountBreakdown;
    weakAreas: CountBreakdown;
  };
  membership: {
    pageVisits: number;
    joinIntentEvents: number;
  };
  launchCodes: {
    entered: number;
    validated: number;
    checkoutStarts: number;
    checkoutCompletions: number;
    byPlatform: Array<{
      platform: string;
      entered: number;
      validated: number;
      redemptions: number;
      checkoutStarts: number;
      checkoutCompletions: number;
    }>;
  };
  checkout: {
    starts: number;
    completions: number;
  };
  reviews: {
    requestPageViews: number;
    submissions: number;
    googleReviewClicks: number;
  };
  recentActivity: Array<{
    id: string;
    time: string;
    event: string;
    page: string;
    source: string;
    device: string;
  }>;
  hasEnoughData: boolean;
};

export type GrowthPeriodComparison = {
  visitorsChange: number;
  visitorsChangePercent: number | null;
  pageViewsChange: number;
  pageViewsChangePercent: number | null;
  membershipVisitsChange: number;
  joinIntentChange: number;
  checkoutCompletionsChange: number;
  trafficRising: boolean;
  trafficFalling: boolean;
};

export type GrowthReportView = {
  id: string;
  range: string;
  generatedAt: Date;
  nextRefreshAt: Date;
  headline: string;
  summary: string;
  healthScore: number | null;
  momentumLabel: string | null;
  keyFindings: string[];
  risks: string[];
  opportunities: string[];
  recommendedActions: GrowthRecommendedAction[];
  priorityAction: string | null;
  metricsSnapshot: GrowthMetricsSnapshot;
  createdAt: Date;
  updatedAt: Date;
};

type GrowthReportOptions = {
  now?: Date;
  range?: string;
};

type WindowedData = Awaited<ReturnType<typeof loadReportWindowData>>;

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function subtractHours(date: Date, hours: number) {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function reportPeriod(now: Date) {
  const end = new Date(now);
  const start = subtractHours(end, 24);
  const previousEnd = new Date(start);
  const previousStart = subtractHours(previousEnd, 24);
  const sevenDayStart = subtractDays(end, 7);

  return { start, end, previousStart, previousEnd, sevenDayStart };
}

function inPeriod(date: Date | null | undefined, start: Date, end: Date) {
  return Boolean(date && date >= start && date < end);
}

function percent(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function percentageChange(current: number, previous: number) {
  if (!previous) {
    return current > 0 ? null : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function countBy(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value || "Unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function jsonArrayToStrings(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
}

function readMetadataString(metadata: Prisma.JsonValue | null | undefined, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function eventSource(
  event: WindowedData["events"][number],
  fallbackPath = "/"
) {
  return (
    event.session?.source ||
    parseTrafficSource(event.session?.referrer ?? null, event.session?.entryPath ?? event.path ?? fallbackPath)
  );
}

function sessionSource(session: WindowedData["sessions"][number]) {
  return (
    (session.source as TrafficSource | null) ??
    parseTrafficSource(session.referrer, session.entryPath)
  );
}

function eventCount(events: WindowedData["events"], eventName: string) {
  return events.filter((event) => event.eventName === eventName).length;
}

function launchPlatformFromEvent(event: WindowedData["events"][number]) {
  return (
    readMetadataString(event.metadata, "platform") ||
    readMetadataString(event.metadata, "sourcePlatform") ||
    "Unknown"
  );
}

function routeStartsWith(path: string | null | undefined, prefix: string) {
  return path === prefix || Boolean(path?.startsWith(`${prefix}/`)) || Boolean(path?.startsWith(`${prefix}?`));
}

function sourcePercent(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

async function loadReportWindowData(now: Date) {
  const period = reportPeriod(now);
  const sevenDayWhere = { gte: period.sevenDayStart, lte: period.end };

  const [sessions, pageViews, events, audits, launchRedemptions, testimonials] =
    await Promise.all([
      prisma.siteSession.findMany({
        where: { createdAt: sevenDayWhere, isBot: false },
        select: {
          id: true,
          source: true,
          referrer: true,
          entryPath: true,
          deviceType: true,
          createdAt: true
        }
      }),
      prisma.sitePageView.findMany({
        where: { createdAt: sevenDayWhere },
        select: {
          id: true,
          visitorId: true,
          path: true,
          deviceType: true,
          createdAt: true,
          session: {
            select: {
              source: true,
              deviceType: true
            }
          }
        }
      }),
      prisma.siteEvent.findMany({
        where: { createdAt: sevenDayWhere },
        select: {
          id: true,
          eventName: true,
          path: true,
          metadata: true,
          createdAt: true,
          session: {
            select: {
              source: true,
              referrer: true,
              entryPath: true,
              deviceType: true
            }
          }
        }
      }),
      prisma.founderAuditSubmission.findMany({
        where: { createdAt: sevenDayWhere },
        select: {
          id: true,
          score: true,
          resultType: true,
          weaknesses: true,
          createdAt: true,
          referrer: true,
          sourcePath: true
        }
      }),
      prisma.launchCodeRedemption.findMany({
        where: { createdAt: sevenDayWhere },
        select: {
          id: true,
          status: true,
          sourcePlatform: true,
          createdAt: true,
          completedAt: true,
          launchCode: {
            select: {
              platform: true
            }
          }
        }
      }),
      prisma.testimonial.findMany({
        where: {
          OR: [
            { createdAt: sevenDayWhere },
            { submittedAt: sevenDayWhere },
            { completedAt: sevenDayWhere },
            { googleReviewIntentClickedAt: sevenDayWhere }
          ]
        },
        select: {
          id: true,
          status: true,
          source: true,
          createdAt: true,
          submittedAt: true,
          completedAt: true,
          googleReviewIntentClickedAt: true
        }
      })
    ]);

  return { period, sessions, pageViews, events, audits, launchRedemptions, testimonials };
}

function periodData(data: WindowedData, start: Date, end: Date) {
  return {
    sessions: data.sessions.filter((session) => inPeriod(session.createdAt, start, end)),
    pageViews: data.pageViews.filter((view) => inPeriod(view.createdAt, start, end)),
    events: data.events.filter((event) => inPeriod(event.createdAt, start, end)),
    audits: data.audits.filter((audit) => inPeriod(audit.createdAt, start, end)),
    launchRedemptions: data.launchRedemptions.filter((redemption) =>
      inPeriod(redemption.createdAt, start, end)
    ),
    testimonials: data.testimonials.filter((testimonial) =>
      inPeriod(testimonial.createdAt, start, end) ||
      inPeriod(testimonial.submittedAt, start, end) ||
      inPeriod(testimonial.completedAt, start, end) ||
      inPeriod(testimonial.googleReviewIntentClickedAt, start, end)
    )
  };
}

function countLaunchCheckoutStarts(redemptions: WindowedData["launchRedemptions"]) {
  return redemptions.filter((redemption) =>
    LAUNCH_CODE_CHECKOUT_STARTED_STATUSES.includes(redemption.status)
  ).length;
}

function countLaunchCheckoutCompletions(redemptions: WindowedData["launchRedemptions"]) {
  return redemptions.filter((redemption) =>
    LAUNCH_CODE_COMPLETED_STATUSES.includes(redemption.status)
  ).length;
}

function countReviewSubmissions(testimonials: WindowedData["testimonials"], start: Date, end: Date) {
  return testimonials.filter((testimonial) =>
    inPeriod(testimonial.submittedAt, start, end) ||
    inPeriod(testimonial.completedAt, start, end) ||
    inPeriod(testimonial.createdAt, start, end)
  ).length;
}

function deriveReviewStats(
  input: ReturnType<typeof periodData>,
  start: Date,
  end: Date
) {
  const eventRequestPageViews = eventCount(input.events, "review_request_page_viewed");
  const routeRequestPageViews = input.pageViews.filter(
    (view) => routeStartsWith(view.path, "/review") || routeStartsWith(view.path, "/testimonial")
  ).length;
  const eventSubmissions = eventCount(input.events, "review_submitted");
  const testimonialSubmissions = countReviewSubmissions(input.testimonials, start, end);
  const eventGoogleClicks = eventCount(input.events, "google_review_clicked");
  const testimonialGoogleClicks = input.testimonials.filter((testimonial) =>
    inPeriod(testimonial.googleReviewIntentClickedAt, start, end)
  ).length;

  return {
    requestPageViews: Math.max(eventRequestPageViews, routeRequestPageViews),
    submissions: Math.max(eventSubmissions, testimonialSubmissions),
    googleReviewClicks: Math.max(eventGoogleClicks, testimonialGoogleClicks)
  };
}

function deriveLaunchStats(input: ReturnType<typeof periodData>) {
  const launchEvents = input.events.filter((event) =>
    LAUNCH_CODE_EVENTS.includes(event.eventName as (typeof LAUNCH_CODE_EVENTS)[number])
  );
  const checkoutStartEvents = eventCount(input.events, "launch_code_checkout_started");
  const checkoutCompleteEvents =
    eventCount(input.events, "launch_code_checkout_completed") +
    eventCount(input.events, "launch_code_subscription_trialing") +
    eventCount(input.events, "launch_code_subscription_active");
  const checkoutStartRedemptions = countLaunchCheckoutStarts(input.launchRedemptions);
  const checkoutCompleteRedemptions = countLaunchCheckoutCompletions(input.launchRedemptions);
  const platformRows = new Map<
    string,
    {
      entered: number;
      validated: number;
      redemptions: number;
      checkoutStartEvents: number;
      checkoutStartRedemptions: number;
      checkoutCompleteEvents: number;
      checkoutCompleteRedemptions: number;
    }
  >();

  const platformRow = (platform: string) => {
    const key = platform || "Unknown";
    const row =
      platformRows.get(key) ??
      {
        entered: 0,
        validated: 0,
        redemptions: 0,
        checkoutStartEvents: 0,
        checkoutStartRedemptions: 0,
        checkoutCompleteEvents: 0,
        checkoutCompleteRedemptions: 0
      };
    platformRows.set(key, row);
    return row;
  };

  for (const event of launchEvents) {
    const row = platformRow(launchPlatformFromEvent(event));
    if (event.eventName === "launch_code_entered") {
      row.entered += 1;
    }
    if (event.eventName === "launch_code_validated") {
      row.validated += 1;
    }
    if (event.eventName === "launch_code_checkout_started") {
      row.checkoutStartEvents += 1;
    }
    if (
      event.eventName === "launch_code_checkout_completed" ||
      event.eventName === "launch_code_subscription_trialing" ||
      event.eventName === "launch_code_subscription_active"
    ) {
      row.checkoutCompleteEvents += 1;
    }
  }

  for (const redemption of input.launchRedemptions) {
    const row = platformRow(
      redemption.sourcePlatform ?? redemption.launchCode?.platform ?? "Unknown"
    );
    row.redemptions += 1;
    if (LAUNCH_CODE_CHECKOUT_STARTED_STATUSES.includes(redemption.status)) {
      row.checkoutStartRedemptions += 1;
    }
    if (LAUNCH_CODE_COMPLETED_STATUSES.includes(redemption.status)) {
      row.checkoutCompleteRedemptions += 1;
    }
  }

  return {
    entered: eventCount(input.events, "launch_code_entered"),
    validated: eventCount(input.events, "launch_code_validated"),
    checkoutStarts: Math.max(checkoutStartEvents, checkoutStartRedemptions),
    checkoutCompletions: Math.max(checkoutCompleteEvents, checkoutCompleteRedemptions),
    totalEvents: launchEvents.length + input.launchRedemptions.length,
    byPlatform: Array.from(platformRows.entries())
      .map(([platform, row]) => ({
        platform,
        entered: row.entered,
        validated: row.validated,
        redemptions: row.redemptions,
        checkoutStarts: Math.max(row.checkoutStartEvents, row.checkoutStartRedemptions),
        checkoutCompletions: Math.max(
          row.checkoutCompleteEvents,
          row.checkoutCompleteRedemptions
        )
      }))
      .sort((a, b) =>
        b.entered + b.validated + b.redemptions + b.checkoutStarts + b.checkoutCompletions -
        (a.entered + a.validated + a.redemptions + a.checkoutStarts + a.checkoutCompletions)
      )
  };
}

function derivePeriodMetrics(
  input: ReturnType<typeof periodData>,
  start: Date,
  end: Date
): PeriodMetrics {
  const uniqueVisitors = new Set(input.pageViews.map((view) => view.visitorId)).size;
  const membershipPageVisits = input.pageViews.filter((view) =>
    routeStartsWith(view.path, "/membership")
  ).length;
  const joinIntentEvents = input.events.filter((event) =>
    JOIN_INTENT_EVENTS.includes(event.eventName as (typeof JOIN_INTENT_EVENTS)[number])
  ).length;
  const auditStarts = eventCount(input.events, "audit_started");
  const auditCompletions = Math.max(eventCount(input.events, "audit_completed"), input.audits.length);
  const launchStats = deriveLaunchStats(input);
  const reviews = deriveReviewStats(input, start, end);
  const checkoutStarts = eventCount(input.events, "checkout_started") + launchStats.checkoutStarts;
  const checkoutCompletions =
    eventCount(input.events, "checkout_completed") + launchStats.checkoutCompletions;

  return {
    visitors: input.sessions.length || uniqueVisitors,
    uniqueVisitors,
    pageViews: input.pageViews.length,
    membershipPageVisits,
    joinIntentEvents,
    auditStarts,
    auditCompletions,
    launchCodeEvents: launchStats.totalEvents,
    checkoutStarts,
    checkoutCompletions,
    reviewSignals: reviews.requestPageViews + reviews.submissions + reviews.googleReviewClicks
  };
}

function buildTopPages(pageViews: ReturnType<typeof periodData>["pageViews"]) {
  const pages = new Map<string, { views: number; visitors: Set<string> }>();
  for (const view of pageViews) {
    const row = pages.get(view.path) ?? { views: 0, visitors: new Set<string>() };
    row.views += 1;
    row.visitors.add(view.visitorId);
    pages.set(view.path, row);
  }

  return Array.from(pages.entries())
    .map(([page, row]) => ({
      page,
      views: row.views,
      uniqueVisitors: row.visitors.size
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);
}

function buildTrafficSources(sessions: ReturnType<typeof periodData>["sessions"]) {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const source = sessionSource(session);
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  const total = sessions.length;
  return ["Direct", "LinkedIn", "Facebook", "Google", "TikTok", "Reddit", "Other"]
    .map((source) => ({
      source,
      visits: counts.get(source) ?? 0,
      percentage: sourcePercent(counts.get(source) ?? 0, total)
    }))
    .sort((a, b) => b.visits - a.visits);
}

function buildDeviceBreakdown(pageViews: ReturnType<typeof periodData>["pageViews"]) {
  const counts = new Map<string, number>();
  for (const view of pageViews) {
    const device = view.deviceType || view.session?.deviceType || "Unknown";
    counts.set(device, (counts.get(device) ?? 0) + 1);
  }

  const total = pageViews.length;
  return ["Mobile", "Desktop", "Tablet", "Unknown"]
    .map((device) => ({
      device,
      views: counts.get(device) ?? 0,
      percentage: sourcePercent(counts.get(device) ?? 0, total)
    }))
    .sort((a, b) => b.views - a.views);
}

function buildBusiestTimes(pageViews: ReturnType<typeof periodData>["pageViews"]) {
  const hours = new Map<string, number>();
  const days = new Map<string, number>();

  for (const view of pageViews) {
    const hour = `${view.createdAt.getHours().toString().padStart(2, "0")}:00`;
    const day = view.createdAt.toLocaleDateString("en-GB", { weekday: "long" });
    hours.set(hour, (hours.get(hour) ?? 0) + 1);
    days.set(day, (days.get(day) ?? 0) + 1);
  }

  return {
    hours: Array.from(hours.entries())
      .map(([hour, views]) => ({ hour, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 6),
    days: Array.from(days.entries())
      .map(([day, views]) => ({ day, views }))
      .sort((a, b) => b.views - a.views)
  };
}

function buildAuditStats(input: ReturnType<typeof periodData>) {
  const scores = input.audits.map((audit) => audit.score);
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null;
  const starts = eventCount(input.events, "audit_started");
  const completions = Math.max(eventCount(input.events, "audit_completed"), input.audits.length);
  const completionBase = Math.max(starts, completions);

  return {
    starts,
    completions,
    completionRate: percent(completions, completionBase),
    averageScore,
    resultTypes: countBy(input.audits.map((audit) => audit.resultType)),
    weakAreas: countBy(input.audits.flatMap((audit) => jsonArrayToStrings(audit.weaknesses)))
  };
}

function buildRecentActivity(input: ReturnType<typeof periodData>) {
  return [
    ...input.events.map((event) => ({
      id: event.id,
      time: event.createdAt.toISOString(),
      event: event.eventName,
      page: event.path ?? "Unknown",
      source: eventSource(event),
      device: event.session?.deviceType ?? "Unknown"
    })),
    ...input.pageViews.map((view) => ({
      id: view.id,
      time: view.createdAt.toISOString(),
      event: "page_view",
      page: view.path,
      source: view.session?.source ?? "Direct",
      device: view.deviceType ?? view.session?.deviceType ?? "Unknown"
    }))
  ]
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
    .slice(0, 12);
}

export async function buildMetricsSnapshot(now = new Date()): Promise<GrowthMetricsSnapshot> {
  const data = await loadReportWindowData(now);
  const currentInput = periodData(data, data.period.start, data.period.end);
  const previousInput = periodData(data, data.period.previousStart, data.period.previousEnd);
  const sevenDayInput = periodData(data, data.period.sevenDayStart, data.period.end);
  const current = derivePeriodMetrics(currentInput, data.period.start, data.period.end);
  const previous = derivePeriodMetrics(
    previousInput,
    data.period.previousStart,
    data.period.previousEnd
  );
  const sevenDayContext = derivePeriodMetrics(
    sevenDayInput,
    data.period.sevenDayStart,
    data.period.end
  );
  const launchCodes = deriveLaunchStats(currentInput);
  const reviews = deriveReviewStats(currentInput, data.period.start, data.period.end);
  const hasEnoughData =
    current.pageViews > 0 ||
    current.launchCodeEvents > 0 ||
    current.auditStarts > 0 ||
    current.auditCompletions > 0 ||
    current.reviewSignals > 0;

  return {
    range: DEFAULT_GROWTH_REPORT_RANGE,
    period: {
      start: data.period.start.toISOString(),
      end: data.period.end.toISOString(),
      previousStart: data.period.previousStart.toISOString(),
      previousEnd: data.period.previousEnd.toISOString(),
      sevenDayStart: data.period.sevenDayStart.toISOString()
    },
    current: {
      ...current,
      pageViewsPerVisitor: current.visitors
        ? Number((current.pageViews / current.visitors).toFixed(1))
        : 0,
      joinIntentRate: percent(current.joinIntentEvents, current.membershipPageVisits),
      checkoutCompletionRate: percent(current.checkoutCompletions, current.checkoutStarts)
    },
    previous,
    sevenDayContext,
    topPages: buildTopPages(currentInput.pageViews),
    trafficSources: buildTrafficSources(currentInput.sessions),
    deviceBreakdown: buildDeviceBreakdown(currentInput.pageViews),
    busiestTimes: buildBusiestTimes(currentInput.pageViews),
    audit: buildAuditStats(currentInput),
    membership: {
      pageVisits: current.membershipPageVisits,
      joinIntentEvents: current.joinIntentEvents
    },
    launchCodes: {
      entered: launchCodes.entered,
      validated: launchCodes.validated,
      checkoutStarts: launchCodes.checkoutStarts,
      checkoutCompletions: launchCodes.checkoutCompletions,
      byPlatform: launchCodes.byPlatform
    },
    checkout: {
      starts: current.checkoutStarts,
      completions: current.checkoutCompletions
    },
    reviews,
    recentActivity: buildRecentActivity(currentInput),
    hasEnoughData
  };
}

export function compareWithPreviousPeriod(
  snapshot: GrowthMetricsSnapshot
): GrowthPeriodComparison {
  const visitorsChange = snapshot.current.visitors - snapshot.previous.visitors;
  const pageViewsChange = snapshot.current.pageViews - snapshot.previous.pageViews;

  return {
    visitorsChange,
    visitorsChangePercent: percentageChange(
      snapshot.current.visitors,
      snapshot.previous.visitors
    ),
    pageViewsChange,
    pageViewsChangePercent: percentageChange(
      snapshot.current.pageViews,
      snapshot.previous.pageViews
    ),
    membershipVisitsChange:
      snapshot.current.membershipPageVisits - snapshot.previous.membershipPageVisits,
    joinIntentChange: snapshot.current.joinIntentEvents - snapshot.previous.joinIntentEvents,
    checkoutCompletionsChange:
      snapshot.current.checkoutCompletions - snapshot.previous.checkoutCompletions,
    trafficRising:
      snapshot.current.visitors > snapshot.previous.visitors && snapshot.current.visitors > 0,
    trafficFalling:
      snapshot.previous.visitors > 0 && snapshot.current.visitors < snapshot.previous.visitors
  };
}

function hasMembershipConversionGap(snapshot: GrowthMetricsSnapshot) {
  return snapshot.membership.pageVisits > 10 && snapshot.membership.joinIntentEvents === 0;
}

function hasLaunchCodeConversionGap(snapshot: GrowthMetricsSnapshot) {
  return (
    snapshot.current.launchCodeEvents > 0 &&
    snapshot.launchCodes.checkoutCompletions === 0 &&
    snapshot.checkout.completions === 0
  );
}

function mobileShare(snapshot: GrowthMetricsSnapshot) {
  return snapshot.deviceBreakdown.find((entry) => entry.device === "Mobile")?.percentage ?? 0;
}

function topTrafficSource(snapshot: GrowthMetricsSnapshot) {
  return snapshot.trafficSources.find((source) => source.visits > 0) ?? null;
}

export function generateHeadline(
  snapshot: GrowthMetricsSnapshot,
  comparison = compareWithPreviousPeriod(snapshot)
) {
  if (!snapshot.hasEnoughData) {
    return "Not enough growth data yet";
  }

  if (hasMembershipConversionGap(snapshot)) {
    return "Membership interest is ahead of join action";
  }

  if (hasLaunchCodeConversionGap(snapshot)) {
    return "Launch code interest needs a clearer value bridge";
  }

  if (comparison.trafficRising && snapshot.current.visitors >= 3) {
    return "Traffic is rising; keep the useful attention moving";
  }

  if (snapshot.audit.completions > 0) {
    return "Founder Audit interest is creating actionable demand";
  }

  if (snapshot.reviews.submissions > 0 || snapshot.reviews.googleReviewClicks > 0) {
    return "Trust proof is beginning to build";
  }

  if (snapshot.current.visitors < 3) {
    return "Fresh warm traffic is the next growth job";
  }

  return "Early growth signals are forming";
}

export function generateMomentumLabel(
  snapshot: GrowthMetricsSnapshot,
  comparison = compareWithPreviousPeriod(snapshot)
) {
  if (!snapshot.hasEnoughData) {
    return "Needs fresh traffic";
  }

  if (hasMembershipConversionGap(snapshot)) {
    return "Conversion gap";
  }

  if (hasLaunchCodeConversionGap(snapshot)) {
    return "Launch code interest";
  }

  if (comparison.trafficRising && snapshot.current.visitors >= 3) {
    return "Traffic rising";
  }

  if (snapshot.audit.starts > 0 || snapshot.audit.completions > 0) {
    return "Audit interest";
  }

  if (snapshot.current.visitors < 3 && snapshot.current.pageViews < 5) {
    return "Needs fresh traffic";
  }

  if (snapshot.membership.pageVisits > 0 || snapshot.current.pageViews >= 10) {
    return "Building attention";
  }

  return "Early signal";
}

export function calculateGrowthHealthScore(
  snapshot: GrowthMetricsSnapshot,
  comparison = compareWithPreviousPeriod(snapshot)
) {
  let score = 35;

  score += Math.min(15, snapshot.current.visitors * 2);

  if (comparison.trafficRising) {
    score += 10;
  } else if (comparison.trafficFalling) {
    score -= 8;
  }

  if (snapshot.current.pageViewsPerVisitor >= 2) {
    score += 8;
  }
  if (snapshot.current.pageViewsPerVisitor >= 3) {
    score += 5;
  }
  if (snapshot.membership.pageVisits > 0) {
    score += 5;
  }
  if (snapshot.membership.joinIntentEvents > 0) {
    score += 10;
  }
  if (snapshot.checkout.starts > 0) {
    score += 7;
  }
  if (snapshot.checkout.completions > 0) {
    score += 12;
  }
  if (snapshot.audit.starts > 0) {
    score += 5;
  }
  if (snapshot.audit.completions > 0) {
    score += 10;
  }
  if (snapshot.audit.completionRate >= 50) {
    score += 5;
  }
  if (snapshot.reviews.submissions > 0 || snapshot.reviews.googleReviewClicks > 0) {
    score += 7;
  }

  if (snapshot.current.visitors < 3 && snapshot.current.pageViews < 5) {
    score -= 10;
  }
  if (hasMembershipConversionGap(snapshot)) {
    score -= 20;
  }
  if (hasLaunchCodeConversionGap(snapshot)) {
    score -= 10;
  }
  if (snapshot.checkout.starts > 0 && snapshot.checkout.completions === 0) {
    score -= 8;
  }

  return clampScore(score);
}

export function generateKeyFindings(
  snapshot: GrowthMetricsSnapshot,
  comparison = compareWithPreviousPeriod(snapshot)
) {
  if (!snapshot.hasEnoughData) {
    return [EMPTY_GROWTH_REPORT_SUMMARY];
  }

  const findings: string[] = [];
  const topSource = topTrafficSource(snapshot);
  const topWeakArea = snapshot.audit.weakAreas[0];

  if (hasMembershipConversionGap(snapshot)) {
    findings.push(
      "Membership page visits are high compared with join intent, which suggests people are interested but not yet convinced."
    );
  }

  if (comparison.trafficRising) {
    findings.push(
      "Traffic is rising compared with the previous 24 hours, so the current platform activity is creating attention."
    );
  }

  if (mobileShare(snapshot) > 60) {
    findings.push(
      "Mobile traffic is leading, so mobile join, audit and checkout journeys should stay priority."
    );
  }

  if (snapshot.membership.pageVisits >= 5 && snapshot.audit.completions === 0) {
    findings.push(
      "Audit completions are low compared with membership visits, so the audit may need a stronger callout."
    );
  }

  if (snapshot.audit.completions > 0) {
    findings.push(
      `Founder Audit completions are coming through with an average score of ${snapshot.audit.averageScore ?? 0}, giving you usable owner-readiness signals.`
    );
  }

  if (topWeakArea?.count) {
    findings.push(
      `${topWeakArea.label} is the most common audit weak area, which can become a practical content or offer angle.`
    );
  }

  if (snapshot.current.launchCodeEvents > 0 && snapshot.launchCodes.checkoutStarts === 0) {
    findings.push(
      "Launch code views are not turning into checkout starts yet, so the value explanation may need strengthening."
    );
  }

  if (snapshot.current.launchCodeEvents > 0 && snapshot.launchCodes.checkoutCompletions === 0) {
    findings.push(
      "Launch code interest exists, but no code-led checkout completions have landed in this report window."
    );
  }

  if (snapshot.reviews.requestPageViews > 0 || snapshot.reviews.submissions > 0) {
    findings.push(
      "Review and testimonial activity is present, which gives you trust-building proof to reuse in the next message."
    );
  }

  if (
    snapshot.current.pageViewsPerVisitor >= 2 &&
    snapshot.checkout.completions === 0 &&
    snapshot.membership.joinIntentEvents === 0
  ) {
    findings.push("People are researching, but the journey still needs clarity or trust before conversion.");
  }

  if (topSource?.source === "Facebook") {
    findings.push("Facebook is the strongest current source, so it is worth continuing there with a value-led post.");
  }

  return findings.length
    ? findings.slice(0, 6)
    : ["Early signals are forming, but no single conversion pattern is dominant yet."];
}

export function generateRisks(
  snapshot: GrowthMetricsSnapshot,
  comparison = compareWithPreviousPeriod(snapshot)
) {
  const risks: string[] = [];

  if (!snapshot.hasEnoughData) {
    return ["Low signal volume makes the next move harder to read."];
  }

  if (snapshot.current.launchCodeEvents > 0 && snapshot.checkout.completions === 0) {
    risks.push("Too many discount-led posts may make the launch feel less premium.");
  }

  if (hasMembershipConversionGap(snapshot)) {
    risks.push(
      "If visitors are viewing membership but not clicking join, the pricing, tier or next-step explanation may be unclear."
    );
  }

  if (comparison.trafficFalling) {
    risks.push(
      "Traffic is below the previous 24 hours, so new warm attention needs to be created before pushing conversion again."
    );
  }

  if (mobileShare(snapshot) > 60 && snapshot.checkout.starts > 0 && snapshot.checkout.completions === 0) {
    risks.push("A mobile checkout or join friction point could be costing warm traffic.");
  }

  if (snapshot.current.pageViews >= 8 && snapshot.current.joinIntentEvents === 0) {
    risks.push("Visitors are browsing without a clear intent signal, which can point to trust or clarity friction.");
  }

  return risks.length ? risks.slice(0, 4) : ["No major risk is dominant yet; keep watching the next report window."];
}

export function generateOpportunities(snapshot: GrowthMetricsSnapshot) {
  const opportunities: string[] = [];
  const topSource = topTrafficSource(snapshot);

  if (!snapshot.hasEnoughData || snapshot.current.visitors < 3) {
    opportunities.push("Create a low-pressure feedback post and one useful founder insight post.");
  }

  if (snapshot.membership.pageVisits >= 5 && snapshot.audit.completions === 0) {
    opportunities.push("Push the Founder Audit as the softer first step instead of leading only with the code.");
  }

  if (hasMembershipConversionGap(snapshot)) {
    opportunities.push('Add a short "What happens after you join?" section on the membership page.');
  }

  if (snapshot.current.launchCodeEvents > 0 && snapshot.checkout.completions === 0) {
    opportunities.push("Strengthen the launch code value message before pushing codes again.");
  }

  if (snapshot.reviews.requestPageViews > 0 || snapshot.reviews.submissions > 0) {
    opportunities.push("Use testimonials and reviews to reduce trust friction in the next post.");
  }

  if (mobileShare(snapshot) > 60) {
    opportunities.push("Run a quick mobile pass through the audit, membership and checkout journeys.");
  }

  if (topSource?.source === "Facebook") {
    opportunities.push("Continue Facebook, but make the next post value-led instead of discount-led.");
  }

  opportunities.push("Create one founder story post explaining why BCN exists.");

  return Array.from(new Set(opportunities)).slice(0, 5);
}

function pushAction(
  actions: GrowthRecommendedAction[],
  action: GrowthRecommendedAction
) {
  if (!actions.some((existing) => existing.title === action.title)) {
    actions.push(action);
  }
}

export function generateRecommendedActions(
  snapshot: GrowthMetricsSnapshot,
  comparison = compareWithPreviousPeriod(snapshot)
) {
  const actions: GrowthRecommendedAction[] = [];
  const topSource = topTrafficSource(snapshot);

  if (!snapshot.hasEnoughData || snapshot.current.visitors < 3) {
    pushAction(actions, {
      title: "Create fresh warm traffic",
      reason: "The report does not have enough current traffic to make a strong conversion read.",
      suggestedNextStep:
        "Post one useful founder insight and one low-pressure feedback question, then watch the next 12-hour report.",
      urgency: "high",
      relatedMetric: `${snapshot.current.visitors} visitors`
    });
  }

  if (hasMembershipConversionGap(snapshot)) {
    pushAction(actions, {
      title: "Clarify the membership next step",
      reason: "Membership page visits are high but join intent is zero.",
      suggestedNextStep:
        'Add a clearer CTA and a short "what happens after you join" explanation above the pricing decision.',
      urgency: "high",
      relatedMetric: `${snapshot.membership.pageVisits} membership visits / ${snapshot.membership.joinIntentEvents} join intents`
    });
  }

  if (snapshot.membership.pageVisits >= 5 && snapshot.audit.completions === 0) {
    pushAction(actions, {
      title: "Make the Founder Audit the softer entry",
      reason: "Visitors are looking at membership before enough audit completions are coming through.",
      suggestedNextStep:
        "Place one audit-led CTA near the membership decision and frame it as a quick readiness check.",
      urgency: "medium",
      relatedMetric: `${snapshot.membership.pageVisits} membership visits / ${snapshot.audit.completions} audit completions`
    });
  }

  if (snapshot.current.launchCodeEvents > 0 && snapshot.checkout.completions === 0) {
    pushAction(actions, {
      title: "Strengthen the launch code value message",
      reason: "Launch code activity exists but has not become a checkout completion.",
      suggestedNextStep:
        "Explain what the founding access includes and why joining now matters before posting another code-led update.",
      urgency: "high",
      relatedMetric: `${snapshot.current.launchCodeEvents} launch code signals / ${snapshot.checkout.completions} completions`
    });
  }

  if (snapshot.reviews.requestPageViews > 0 || snapshot.reviews.submissions > 0 || snapshot.reviews.googleReviewClicks > 0) {
    pushAction(actions, {
      title: "Turn trust proof into the next post",
      reason: "Review and testimonial activity is already present in first-party data.",
      suggestedNextStep:
        "Use one short proof point in a founder-led post and send the review link to a warm contact.",
      urgency: "medium",
      relatedMetric: `${snapshot.reviews.submissions} review submissions / ${snapshot.reviews.googleReviewClicks} Google clicks`
    });
  }

  if (mobileShare(snapshot) > 60) {
    pushAction(actions, {
      title: "Prioritise the mobile journey",
      reason: "More than 60% of page views are on mobile.",
      suggestedNextStep:
        "Test the audit, membership CTA, launch code field and checkout handoff on a phone.",
      urgency: "medium",
      relatedMetric: `${mobileShare(snapshot)}% mobile traffic`
    });
  }

  if (topSource?.source === "Facebook") {
    pushAction(actions, {
      title: "Keep Facebook warm but vary the message",
      reason: "Facebook is the leading traffic source in this report window.",
      suggestedNextStep:
        "Post a value-led explanation of BCN or a founder lesson instead of another discount-first update.",
      urgency: comparison.trafficRising ? "medium" : "high",
      relatedMetric: `${topSource.visits} Facebook visits`
    });
  }

  if (comparison.trafficRising) {
    pushAction(actions, {
      title: "Keep the current activity going",
      reason: "Visitors are up against the previous 24 hours.",
      suggestedNextStep:
        "Repeat the active platform rhythm, but rotate the angle between story, proof and audit.",
      urgency: "medium",
      relatedMetric: `${comparison.visitorsChange} visitor change`
    });
  }

  pushAction(actions, {
    title: "Post one founder-led explanation",
    reason: "A clear why-now message helps attention become trust before conversion.",
    suggestedNextStep:
      "Write one short post explaining why BCN exists, who it is for and what changes after joining.",
    urgency: "medium",
    relatedMetric: `${snapshot.sevenDayContext.pageViews} page views in 7 days`
  });

  return actions.slice(0, 5);
}

export function getPriorityAction(
  snapshot: GrowthMetricsSnapshot,
  actions = generateRecommendedActions(snapshot)
) {
  if (!snapshot.hasEnoughData) {
    return "Create one useful founder insight post, share the Founder Audit as the soft next step, and send the review/testimonial link to one warm contact.";
  }

  if (snapshot.current.launchCodeEvents > 0 && snapshot.checkout.completions === 0) {
    return "Do not post another discount-led update. Post one founder-led explanation of why BCN exists, then send the review/testimonial link to anyone who has experienced your work.";
  }

  if (hasMembershipConversionGap(snapshot)) {
    return "Before pushing more traffic, make the membership page clearer: explain what happens after someone joins and make the next CTA impossible to miss.";
  }

  if (snapshot.membership.pageVisits >= 5 && snapshot.audit.completions === 0) {
    return "Lead with the Founder Audit for the next 12 hours, then point warm audit traffic back to membership once it has a clearer reason to join.";
  }

  if (mobileShare(snapshot) > 60) {
    return "Run the mobile audit, membership and checkout journey end-to-end before sending the next wave of traffic.";
  }

  return actions[0]?.suggestedNextStep ?? "Create one founder-led post and review the next report window before changing direction.";
}

function generateSummary(
  snapshot: GrowthMetricsSnapshot,
  comparison = compareWithPreviousPeriod(snapshot)
) {
  if (!snapshot.hasEnoughData) {
    return EMPTY_GROWTH_REPORT_SUMMARY;
  }

  const direction = comparison.trafficRising
    ? "up"
    : comparison.trafficFalling
      ? "down"
      : "steady";

  return [
    `In the last 24 hours, BCN saw ${snapshot.current.visitors} visits, ${snapshot.current.uniqueVisitors} unique visitors and ${snapshot.current.pageViews} page views.`,
    `Traffic is ${direction} against the previous 24 hours.`,
    `The strongest practical read is: ${generateHeadline(snapshot, comparison).toLowerCase()}.`
  ].join(" ");
}

function toStringArray(value: Prisma.JsonValue) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toActionArray(value: Prisma.JsonValue): GrowthRecommendedAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isJsonObject)
    .map((item) => {
      const urgency: Urgency =
        item.urgency === "low" || item.urgency === "medium" || item.urgency === "high"
          ? item.urgency
          : "medium";

      return {
        title: String(item.title ?? ""),
        reason: String(item.reason ?? ""),
        suggestedNextStep: String(item.suggestedNextStep ?? ""),
        urgency,
        relatedMetric: String(item.relatedMetric ?? "")
      };
    })
    .filter((item) => item.title && item.reason && item.suggestedNextStep);
}

function normalizeReport(report: {
  id: string;
  range: string;
  generatedAt: Date;
  nextRefreshAt: Date;
  headline: string;
  summary: string;
  healthScore: number | null;
  momentumLabel: string | null;
  keyFindings: Prisma.JsonValue;
  risks: Prisma.JsonValue;
  opportunities: Prisma.JsonValue;
  recommendedActions: Prisma.JsonValue;
  priorityAction: string | null;
  metricsSnapshot: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): GrowthReportView {
  return {
    id: report.id,
    range: report.range,
    generatedAt: report.generatedAt,
    nextRefreshAt: report.nextRefreshAt,
    headline: report.headline,
    summary: report.summary,
    healthScore: report.healthScore,
    momentumLabel: report.momentumLabel,
    keyFindings: toStringArray(report.keyFindings),
    risks: toStringArray(report.risks),
    opportunities: toStringArray(report.opportunities),
    recommendedActions: toActionArray(report.recommendedActions),
    priorityAction: report.priorityAction,
    metricsSnapshot: report.metricsSnapshot as unknown as GrowthMetricsSnapshot,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };
}

export async function generateGrowthReportNow(
  options: GrowthReportOptions = {}
): Promise<GrowthReportView> {
  const generatedAt = options.now ?? new Date();
  const range = options.range ?? DEFAULT_GROWTH_REPORT_RANGE;
  const metricsSnapshot = await buildMetricsSnapshot(generatedAt);
  const comparison = compareWithPreviousPeriod(metricsSnapshot);
  const headline = generateHeadline(metricsSnapshot, comparison);
  const summary = generateSummary(metricsSnapshot, comparison);
  const keyFindings = generateKeyFindings(metricsSnapshot, comparison);
  const risks = generateRisks(metricsSnapshot, comparison);
  const opportunities = generateOpportunities(metricsSnapshot);
  const recommendedActions = generateRecommendedActions(metricsSnapshot, comparison);
  const priorityAction = getPriorityAction(metricsSnapshot, recommendedActions);
  const healthScore = metricsSnapshot.hasEnoughData
    ? calculateGrowthHealthScore(metricsSnapshot, comparison)
    : null;

  const created = await prisma.growthIntelligenceReport.create({
    data: {
      range,
      generatedAt,
      nextRefreshAt: addHours(generatedAt, GROWTH_REPORT_REFRESH_HOURS),
      headline,
      summary,
      healthScore,
      momentumLabel: generateMomentumLabel(metricsSnapshot, comparison),
      keyFindings: keyFindings as Prisma.InputJsonValue,
      risks: risks as Prisma.InputJsonValue,
      opportunities: opportunities as Prisma.InputJsonValue,
      recommendedActions: recommendedActions as unknown as Prisma.InputJsonValue,
      priorityAction,
      metricsSnapshot: metricsSnapshot as unknown as Prisma.InputJsonValue
    }
  });

  return normalizeReport(created);
}

export async function getCurrentGrowthReport(
  options: GrowthReportOptions = {}
): Promise<GrowthReportView> {
  const now = options.now ?? new Date();
  const range = options.range ?? DEFAULT_GROWTH_REPORT_RANGE;
  const current = await prisma.growthIntelligenceReport.findFirst({
    where: {
      range,
      nextRefreshAt: { gt: now }
    },
    orderBy: { generatedAt: "desc" }
  });

  if (current) {
    return normalizeReport(current);
  }

  return generateGrowthReportNow({ now, range });
}

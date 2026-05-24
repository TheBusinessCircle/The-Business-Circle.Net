import { prisma } from "@/lib/prisma";
import { parseTrafficSource, type TrafficSource } from "@/lib/analytics/source";

export type GrowthIntelligenceRange = "today" | "7d" | "30d" | "90d" | "all";

type DateRange = {
  start: Date | null;
  end: Date;
};

const CONVERSION_EVENTS = [
  "founder_audit_membership_clicked",
  "membership_selected_from_audit",
  "join_cta_clicked",
  "membership_viewed",
  "checkout_started",
  "checkout_completed",
  "launch_code_entered",
  "launch_code_validated",
  "launch_code_checkout_started",
  "launch_code_checkout_completed",
  "launch_code_subscription_trialing",
  "launch_code_subscription_active"
] as const;

function dateRange(range: GrowthIntelligenceRange): DateRange {
  const end = new Date();
  const start = new Date(end);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (range === "7d") {
    start.setDate(start.getDate() - 7);
    return { start, end };
  }

  if (range === "30d") {
    start.setDate(start.getDate() - 30);
    return { start, end };
  }

  if (range === "90d") {
    start.setDate(start.getDate() - 90);
    return { start, end };
  }

  return { start: null, end };
}

function createdAtWhere(range: GrowthIntelligenceRange) {
  const dates = dateRange(range);
  return dates.start ? { gte: dates.start, lte: dates.end } : { lte: dates.end };
}

function percent(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function hourKey(date: Date) {
  return `${date.toISOString().slice(0, 13)}:00`;
}

function timelineKey(date: Date, range: GrowthIntelligenceRange) {
  return range === "today" ? hourKey(date) : dayKey(date);
}

export async function getGrowthIntelligenceSummary(range: GrowthIntelligenceRange) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = new Date(now);
  week.setDate(week.getDate() - 7);
  const month = new Date(now);
  month.setMonth(month.getMonth() - 1);

  const [
    visitorsToday,
    visitorsThisWeek,
    uniqueVisitorsThisMonth,
    pageViewsThisMonth,
    auditsCompleted,
    auditAverage,
    joinIntentEvents,
    membershipPageVisits
  ] = await Promise.all([
    prisma.sitePageView.findMany({
      where: { createdAt: { gte: today } },
      distinct: ["visitorId"],
      select: { visitorId: true }
    }),
    prisma.sitePageView.findMany({
      where: { createdAt: { gte: week } },
      distinct: ["visitorId"],
      select: { visitorId: true }
    }),
    prisma.sitePageView.findMany({
      where: { createdAt: { gte: month } },
      distinct: ["visitorId"],
      select: { visitorId: true }
    }),
    prisma.sitePageView.count({ where: { createdAt: { gte: month } } }),
    prisma.founderAuditSubmission.count({ where: { createdAt: createdAtWhere(range) } }),
    prisma.founderAuditSubmission.aggregate({
      where: { createdAt: createdAtWhere(range) },
      _avg: { score: true }
    }),
    prisma.siteEvent.count({
      where: {
        createdAt: createdAtWhere(range),
        eventName: { in: ["join_cta_clicked", "membership_selected_from_audit", "founder_audit_membership_clicked"] }
      }
    }),
    prisma.sitePageView.count({
      where: { createdAt: createdAtWhere(range), path: { startsWith: "/membership" } }
    })
  ]);

  return {
    visitorsToday: visitorsToday.length,
    visitorsThisWeek: visitorsThisWeek.length,
    uniqueVisitorsThisMonth: uniqueVisitorsThisMonth.length,
    pageViewsThisMonth,
    auditsCompleted,
    averageAuditScore: Math.round(auditAverage._avg.score ?? 0),
    joinIntentEvents,
    membershipPageVisits
  };
}

export async function getTrafficTimeline(range: GrowthIntelligenceRange) {
  const where = { createdAt: createdAtWhere(range) };
  const [pageViews, sessions] = await Promise.all([
    prisma.sitePageView.findMany({ where, select: { createdAt: true } }),
    prisma.siteSession.findMany({ where, select: { createdAt: true } })
  ]);
  const rows = new Map<string, { label: string; visits: number; pageViews: number }>();

  for (const item of pageViews) {
    const key = timelineKey(item.createdAt, range);
    const row = rows.get(key) ?? { label: key, visits: 0, pageViews: 0 };
    row.pageViews += 1;
    rows.set(key, row);
  }

  for (const item of sessions) {
    const key = timelineKey(item.createdAt, range);
    const row = rows.get(key) ?? { label: key, visits: 0, pageViews: 0 };
    row.visits += 1;
    rows.set(key, row);
  }

  return Array.from(rows.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export async function getVisitorTiming(range: GrowthIntelligenceRange) {
  const pageViews = await prisma.sitePageView.findMany({
    where: { createdAt: createdAtWhere(range) },
    select: { createdAt: true }
  });
  const hours = new Map<number, number>();
  const days = new Map<string, number>();

  for (const view of pageViews) {
    hours.set(view.createdAt.getHours(), (hours.get(view.createdAt.getHours()) ?? 0) + 1);
    days.set(view.createdAt.toLocaleDateString("en-GB", { weekday: "long" }), (days.get(view.createdAt.toLocaleDateString("en-GB", { weekday: "long" })) ?? 0) + 1);
  }

  return {
    busiestHours: Array.from(hours.entries()).map(([hour, views]) => ({ hour, views })).sort((a, b) => b.views - a.views).slice(0, 6),
    busiestDays: Array.from(days.entries()).map(([day, views]) => ({ day, views })).sort((a, b) => b.views - a.views)
  };
}

export async function getTopPages(range: GrowthIntelligenceRange) {
  const views = await prisma.sitePageView.findMany({
    where: { createdAt: createdAtWhere(range) },
    select: { path: true, visitorId: true, createdAt: true }
  });
  const events = await prisma.siteEvent.groupBy({
    by: ["path"],
    where: { createdAt: createdAtWhere(range), path: { not: null } },
    _count: { _all: true }
  });
  const eventCounts = new Map(events.map((event) => [event.path, event._count._all]));
  const rows = new Map<string, { page: string; views: number; visitors: Set<string>; lastViewed: Date }>();

  for (const view of views) {
    const row = rows.get(view.path) ?? {
      page: view.path,
      views: 0,
      visitors: new Set<string>(),
      lastViewed: view.createdAt
    };
    row.views += 1;
    row.visitors.add(view.visitorId);
    if (view.createdAt > row.lastViewed) {
      row.lastViewed = view.createdAt;
    }
    rows.set(view.path, row);
  }

  return Array.from(rows.values())
    .map((row) => ({
      page: row.page,
      views: row.views,
      uniqueVisitors: row.visitors.size,
      averageEvents: row.views ? Number(((eventCounts.get(row.page) ?? 0) / row.views).toFixed(1)) : 0,
      lastViewed: row.lastViewed
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 12);
}

export async function getTrafficSources(range: GrowthIntelligenceRange) {
  const sessions = await prisma.siteSession.findMany({
    where: { createdAt: createdAtWhere(range), isBot: false },
    select: { source: true, referrer: true, entryPath: true }
  });
  const counts = new Map<TrafficSource, number>();

  for (const session of sessions) {
    const source = (session.source as TrafficSource | null) ?? parseTrafficSource(session.referrer, session.entryPath);
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  return ["Direct", "LinkedIn", "Facebook", "Google", "TikTok", "Reddit", "Other"].map((source) => ({
    source,
    visits: counts.get(source as TrafficSource) ?? 0
  }));
}

export async function getDeviceBreakdown(range: GrowthIntelligenceRange) {
  const grouped = await prisma.sitePageView.groupBy({
    by: ["deviceType"],
    where: { createdAt: createdAtWhere(range) },
    _count: { _all: true }
  });

  return ["Mobile", "Desktop", "Tablet", "Unknown"].map((device) => ({
    device,
    views: grouped.find((entry) => (entry.deviceType ?? "Unknown") === device)?._count._all ?? 0
  }));
}

export async function getAuditSummary(range: GrowthIntelligenceRange) {
  const where = { createdAt: createdAtWhere(range) };
  const [started, completed, aggregate] = await Promise.all([
    prisma.siteEvent.count({ where: { createdAt: createdAtWhere(range), eventName: "audit_started" } }),
    prisma.founderAuditSubmission.count({ where }),
    prisma.founderAuditSubmission.aggregate({ where, _avg: { score: true }, _max: { score: true }, _min: { score: true } })
  ]);

  return {
    started,
    completed,
    completionRate: percent(completed, started),
    averageScore: Math.round(aggregate._avg.score ?? 0),
    highestScore: aggregate._max.score ?? 0,
    lowestScore: aggregate._min.score ?? 0
  };
}

export async function getAuditDistributions(range: GrowthIntelligenceRange) {
  const submissions = await prisma.founderAuditSubmission.findMany({
    where: { createdAt: createdAtWhere(range) },
    select: { score: true, resultType: true, recommendedTier: true, strengths: true, weaknesses: true, createdAt: true, referrer: true, sourcePath: true }
  });

  return {
    scoreDistribution: ["0-10", "11-15", "16-23", "24-30"].map((bucket) => ({
      bucket,
      count: submissions.filter((submission) => {
        if (bucket === "0-10") return submission.score <= 10;
        if (bucket === "11-15") return submission.score >= 11 && submission.score <= 15;
        if (bucket === "16-23") return submission.score >= 16 && submission.score <= 23;
        return submission.score >= 24;
      }).length
    })),
    resultTypes: countBy(submissions.map((submission) => submission.resultType)),
    recommendedTiers: countBy(submissions.map((submission) => submission.recommendedTier ?? "Unknown")),
    weakAreas: countJsonArrayValues(submissions.map((submission) => submission.weaknesses)),
    strongAreas: countJsonArrayValues(submissions.map((submission) => submission.strengths)),
    auditsByDay: countBy(submissions.map((submission) => dayKey(submission.createdAt))),
    auditsByTrafficSource: countBy(submissions.map((submission) => parseTrafficSource(submission.referrer, submission.sourcePath)))
  };
}

export async function getConversionSignals(range: GrowthIntelligenceRange) {
  const events = await prisma.siteEvent.groupBy({
    by: ["eventName"],
    where: { createdAt: createdAtWhere(range), eventName: { in: [...CONVERSION_EVENTS] } },
    _count: { _all: true }
  });
  const membershipPageVisits = await prisma.sitePageView.count({
    where: { createdAt: createdAtWhere(range), path: { startsWith: "/membership" } }
  });
  const sources = await getTrafficSources(range);

  return {
    auditToMembershipClicks: countEvent(events, "founder_audit_membership_clicked") + countEvent(events, "membership_selected_from_audit"),
    membershipPageVisits,
    joinCtaClicks: countEvent(events, "join_cta_clicked"),
    checkoutStarts: countEvent(events, "checkout_started"),
    checkoutCompletions:
      countEvent(events, "checkout_completed") +
      countEvent(events, "launch_code_checkout_completed"),
    bestConvertingSource: sources.slice().sort((a, b) => b.visits - a.visits)[0]?.source ?? "Not enough data"
  };
}

export async function getRecentActivity(range: GrowthIntelligenceRange) {
  const [events, pageViews] = await Promise.all([
    prisma.siteEvent.findMany({
      where: { createdAt: createdAtWhere(range) },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { session: true }
    }),
    prisma.sitePageView.findMany({
      where: { createdAt: createdAtWhere(range) },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { session: true }
    })
  ]);

  return [
    ...events.map((event) => ({
      id: event.id,
      time: event.createdAt,
      event: event.eventName,
      page: event.path ?? "Unknown",
      source: event.session?.source ?? "Direct",
      device: event.session?.deviceType ?? "Unknown",
      auditResult: readAuditResult(event.metadata)
    })),
    ...pageViews.map((view) => ({
      id: view.id,
      time: view.createdAt,
      event: "page_view",
      page: view.path,
      source: view.session?.source ?? "Direct",
      device: view.deviceType ?? "Unknown",
      auditResult: null
    }))
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 20);
}

export async function getGeneratedGrowthInsights(range: GrowthIntelligenceRange) {
  const [sources, devices, auditSummary, conversions, distributions] = await Promise.all([
    getTrafficSources(range),
    getDeviceBreakdown(range),
    getAuditSummary(range),
    getConversionSignals(range),
    getAuditDistributions(range)
  ]);
  const insights: string[] = [];
  const strongestSource = sources.slice().sort((a, b) => b.visits - a.visits)[0];
  const topDevice = devices.slice().sort((a, b) => b.views - a.views)[0];
  const topWeakArea = distributions.weakAreas[0];

  if (strongestSource?.visits) {
    insights.push(`${strongestSource.source} is currently your strongest traffic source.`);
  }
  if (topDevice?.views && topDevice.device === "Mobile") {
    insights.push("Most visitors are arriving on mobile, so mobile journeys need to stay priority.");
  }
  if (auditSummary.completed > 0 && auditSummary.completionRate >= 60) {
    insights.push("Audit completions are healthy, which shows owner intent is building.");
  }
  if (conversions.membershipPageVisits > 5 && conversions.checkoutStarts === 0) {
    insights.push("Membership page views are high but checkout starts are low, so the pricing and join path may need review.");
  }
  if (topWeakArea?.count) {
    insights.push(`Most audit results show ${topWeakArea.label.toLowerCase()} as a weak area, which could become a strong BCN content angle.`);
  }

  return insights.length ? insights : ["No strong pattern has formed yet. Growth Intelligence will become sharper as more visitors move through the site."];
}

export async function getGrowthIntelligenceDashboard(range: GrowthIntelligenceRange) {
  const [
    summary,
    trafficTimeline,
    visitorTiming,
    topPages,
    trafficSources,
    deviceBreakdown,
    auditSummary,
    auditDistributions,
    conversionSignals,
    insights,
    recentActivity
  ] = await Promise.all([
    getGrowthIntelligenceSummary(range),
    getTrafficTimeline(range),
    getVisitorTiming(range),
    getTopPages(range),
    getTrafficSources(range),
    getDeviceBreakdown(range),
    getAuditSummary(range),
    getAuditDistributions(range),
    getConversionSignals(range),
    getGeneratedGrowthInsights(range),
    getRecentActivity(range)
  ]);

  return {
    summary,
    trafficTimeline,
    visitorTiming,
    topPages,
    trafficSources,
    deviceBreakdown,
    auditSummary,
    auditDistributions,
    conversionSignals,
    insights,
    recentActivity,
    hasVisitorData: summary.pageViewsThisMonth > 0 || topPages.length > 0,
    hasAuditData: auditSummary.completed > 0
  };
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

function countJsonArrayValues(values: unknown[]) {
  const items = values.flatMap((value) => (Array.isArray(value) ? value : []));
  return countBy(items.map((item) => String(item)));
}

function countEvent(events: Array<{ eventName: string; _count: { _all: number } }>, eventName: string) {
  return events.find((event) => event.eventName === eventName)?._count._all ?? 0;
}

function readAuditResult(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || !("recommendedTier" in metadata)) {
    return null;
  }

  return String((metadata as { recommendedTier?: unknown }).recommendedTier ?? "");
}

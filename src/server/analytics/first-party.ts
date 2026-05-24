import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { isLikelyBot, parseDevice } from "@/lib/analytics/first-party";
import { parseTrafficSource, parseUtmValue } from "@/lib/analytics/source";
import { prisma } from "@/lib/prisma";

export const FIRST_PARTY_ANALYTICS_EVENTS = [
  "page_view",
  "audit_started",
  "audit_completed",
  "join_cta_clicked",
  "membership_viewed",
  "checkout_started",
  "checkout_completed",
  "founder_audit_started",
  "founder_audit_completed",
  "founder_audit_membership_clicked",
  "membership_selected_from_audit",
  "membership_tier_viewed",
  "membership_checkout_started",
  "launch_code_entered",
  "launch_code_validated",
  "launch_code_invalid",
  "launch_code_full",
  "launch_code_checkout_started",
  "launch_code_checkout_completed",
  "launch_code_subscription_trialing",
  "launch_code_subscription_active",
  "review_request_page_viewed",
  "review_text_copied",
  "review_submitted",
  "google_review_clicked",
  "public_cta_join_clicked",
  "audit_cta_clicked"
] as const;

export type FirstPartyAnalyticsEvent = (typeof FIRST_PARTY_ANALYTICS_EVENTS)[number];

type CollectInput = {
  anonymousId: string;
  sessionId?: string | null;
  eventName: FirstPartyAnalyticsEvent;
  path?: string | null;
  title?: string | null;
  referrer?: string | null;
  metadata?: Record<string, unknown> | null;
  userAgent?: string | null;
};

function normalizeEventName(eventName: FirstPartyAnalyticsEvent) {
  if (eventName === "founder_audit_started") {
    return "audit_started";
  }
  if (eventName === "founder_audit_completed") {
    return "audit_completed";
  }
  if (eventName === "public_cta_join_clicked") {
    return "join_cta_clicked";
  }
  if (eventName === "membership_tier_viewed") {
    return "membership_viewed";
  }
  if (eventName === "membership_checkout_started") {
    return "checkout_started";
  }

  return eventName;
}

function safeMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) => {
      if (/password|token|secret|authorization|email|phone|address|stripe|checkoutSession/i.test(key)) {
        return false;
      }
      return value !== undefined;
    })
  );
}

export async function collectFirstPartyAnalytics(input: CollectInput) {
  if (isLikelyBot(input.userAgent) || input.path?.startsWith("/admin")) {
    return { stored: false, reason: "ignored" as const };
  }

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const device = parseDevice(input.userAgent);
  const eventName = normalizeEventName(input.eventName);
  const path = input.path || "/";
  const source = parseTrafficSource(input.referrer, path);
  const metadata = safeMetadata(input.metadata);

  const visitor = await prisma.siteVisitor.upsert({
    where: { anonymousId: input.anonymousId },
    update: {
      lastSeenAt: new Date(),
      visitCount: { increment: eventName === "page_view" ? 1 : 0 },
      userId: userId ?? undefined
    },
    create: {
      anonymousId: input.anonymousId,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      visitCount: eventName === "page_view" ? 1 : 0,
      userId
    }
  });

  let analyticsSession =
    input.sessionId
      ? await prisma.siteSession.findFirst({
          where: { id: input.sessionId, visitorId: visitor.id }
        })
      : null;

  if (!analyticsSession) {
    analyticsSession = await prisma.siteSession.create({
      data: {
        visitorId: visitor.id,
        entryPath: path,
        referrer: input.referrer || null,
        source,
        medium: parseUtmValue(path, "utm_medium"),
        campaign: parseUtmValue(path, "utm_campaign"),
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        isBot: false
      }
    });
  } else {
    analyticsSession = await prisma.siteSession.update({
      where: { id: analyticsSession.id },
      data: {
        endedAt: new Date(),
        exitPath: path
      }
    });
  }

  if (eventName === "page_view") {
    await prisma.sitePageView.create({
      data: {
        visitorId: visitor.id,
        sessionId: analyticsSession.id,
        userId,
        path,
        title: input.title || null,
        referrer: input.referrer || null,
        searchParams: path.includes("?") ? path.split("?").slice(1).join("?") : null,
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os
      }
    });
  } else {
    await prisma.siteEvent.create({
      data: {
        visitorId: visitor.id,
        sessionId: analyticsSession.id,
        userId,
        eventName,
        path,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined
      }
    });
  }

  if (eventName === "audit_completed") {
    await prisma.founderAuditSubmission.create({
      data: {
        visitorId: visitor.id,
        userId,
        sessionId: analyticsSession.id,
        score: Number(metadata?.score ?? 0),
        resultType: String(metadata?.resultType ?? metadata?.tier ?? "unknown"),
        recommendedTier: typeof metadata?.recommendedTier === "string"
          ? metadata.recommendedTier
          : typeof metadata?.tier === "string"
            ? metadata.tier
            : null,
        answers: (Array.isArray(metadata?.answers) ? metadata.answers : []) as Prisma.InputJsonValue,
        strengths: Array.isArray(metadata?.strengths)
          ? (metadata.strengths as Prisma.InputJsonValue)
          : undefined,
        weaknesses: Array.isArray(metadata?.weaknesses)
          ? (metadata.weaknesses as Prisma.InputJsonValue)
          : undefined,
        sourcePath: path,
        referrer: input.referrer || null
      }
    });
  }

  return { stored: true, sessionId: analyticsSession.id };
}

import "server-only";

import type { CircleCardEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CIRCLE_CARD_EVENT_LABELS,
  CIRCLE_CARD_EVENT_TYPES,
  type CircleCardEventTypeValue
} from "@/lib/circle-card/analytics-events";

type TrackCircleCardEventInput = {
  cardId: string;
  eventType: CircleCardEventTypeValue;
  visitorId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AnalyticsSummaryInput = {
  cardId: string;
  fallbackViewCount?: number;
};

const METADATA_KEY_BLOCKLIST = /password|token|secret|authorization|email|phone|address|stripe|checkout/i;
const MAX_METADATA_KEYS = 16;
const MAX_METADATA_STRING_LENGTH = 180;

function sanitizeMetadataValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null) {
    return undefined;
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return value.slice(0, MAX_METADATA_STRING_LENGTH);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 12)
      .map(sanitizeMetadataValue)
      .filter((item): item is Prisma.InputJsonValue => item !== undefined) as Prisma.InputJsonArray;
  }

  return undefined;
}

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return undefined;
  }

  const entries = Object.entries(metadata)
    .filter(([key, value]) => !METADATA_KEY_BLOCKLIST.test(key) && value !== undefined)
    .slice(0, MAX_METADATA_KEYS)
    .map(([key, value]) => [key, sanitizeMetadataValue(value)] as const)
    .filter((entry): entry is readonly [string, Prisma.InputJsonValue] => entry[1] !== undefined);

  return entries.length ? (Object.fromEntries(entries) as Prisma.InputJsonObject) : undefined;
}

export function readCircleCardVisitorIdFromCookieHeader(cookieHeader: string | null | undefined) {
  return cookieHeader
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("bcn_anon_id="))
    ?.split("=")
    .slice(1)
    .join("=") || null;
}

export async function trackCircleCardEvent(input: TrackCircleCardEventInput) {
  if (!input.cardId || input.cardId === "demo") {
    return { stored: false as const };
  }

  try {
    await prisma.circleCardEvent.create({
      data: {
        cardId: input.cardId,
        eventType: input.eventType as CircleCardEventType,
        visitorId: input.visitorId || null,
        userId: input.userId || null,
        metadata: sanitizeMetadata(input.metadata)
      }
    });

    return { stored: true as const };
  } catch {
    return { stored: false as const };
  }
}

export async function getCircleCardAnalyticsSummary(input: AnalyticsSummaryInput) {
  const [counts, recentEvents] = await Promise.all([
    prisma.circleCardEvent.groupBy({
      by: ["eventType"],
      where: { cardId: input.cardId },
      _count: { _all: true }
    }),
    prisma.circleCardEvent.findMany({
      where: { cardId: input.cardId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        eventType: true,
        createdAt: true,
        metadata: true
      }
    })
  ]);

  const eventCounts = Object.fromEntries(CIRCLE_CARD_EVENT_TYPES.map((eventType) => [eventType, 0])) as Record<
    CircleCardEventTypeValue,
    number
  >;

  counts.forEach((entry) => {
    eventCounts[entry.eventType] = entry._count._all;
  });

  const totalViews = Math.max(input.fallbackViewCount ?? 0, eventCounts.CARD_VIEW);
  const maxActivityCount = Math.max(...Object.values(eventCounts), 1);

  return {
    counts: {
      ...eventCounts,
      CARD_VIEW: totalViews
    },
    maxActivityCount,
    recentEvents: recentEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      label: CIRCLE_CARD_EVENT_LABELS[event.eventType],
      createdAt: event.createdAt,
      metadata: event.metadata
    }))
  };
}

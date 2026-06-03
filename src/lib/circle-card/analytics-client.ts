"use client";

import type { CircleCardEventTypeValue } from "@/lib/circle-card/analytics-events";

const VISITOR_KEY = "bcn_anon_id";

type TrackCircleCardEventInput = {
  cardId: string;
  eventType: CircleCardEventTypeValue;
  metadata?: Record<string, unknown> | null;
};

function readCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1];
}

function readVisitorId() {
  try {
    return window.localStorage.getItem(VISITOR_KEY) || readCookie(VISITOR_KEY) || null;
  } catch {
    return readCookie(VISITOR_KEY) || null;
  }
}

export function trackCircleCardEvent(input: TrackCircleCardEventInput) {
  try {
    const body = JSON.stringify({
      cardId: input.cardId,
      eventType: input.eventType,
      visitorId: readVisitorId(),
      path: `${window.location.pathname}${window.location.search}`,
      metadata: input.metadata ?? null
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/circle-card/analytics", blob)) {
        return;
      }
    }

    void fetch("/api/circle-card/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    });
  } catch {
    // Circle Card analytics should never affect sharing, saving, or navigation.
  }
}

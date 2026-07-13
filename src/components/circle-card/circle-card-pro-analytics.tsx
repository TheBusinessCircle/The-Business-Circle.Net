"use client";

import { useEffect, useRef } from "react";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import type { CircleCardProCapability, CircleCardProSource } from "@/lib/circle-card/pro-intent";

export function CircleCardProPageAnalytics({
  source,
  capability,
  billingEnabled,
  authenticated,
  hasProAccess
}: {
  source: CircleCardProSource;
  capability: CircleCardProCapability;
  billingEnabled: boolean;
  authenticated: boolean;
  hasProAccess: boolean;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackAnalyticsEvent(ANALYTICS_EVENTS.proPageViewed, {
      source,
      capability,
      billingEnabled,
      authenticated,
      hasProAccess
    });
  }, [authenticated, billingEnabled, capability, hasProAccess, source]);

  return null;
}

export function CircleCardAuthoritativeProAnalytics({ capability }: { capability: CircleCardProCapability }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackAnalyticsEvent(ANALYTICS_EVENTS.authoritativeProConfirmed, {
      source: "dashboard",
      capability
    });
  }, [capability]);
  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const VISITOR_KEY = "bcn_anon_id";
const SESSION_KEY = "bcn_session_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type AnalyticsPayload = {
  eventName: string;
  path?: string;
  title?: string | null;
  referrer?: string | null;
  metadata?: Record<string, unknown> | null;
};

declare global {
  interface Window {
    bcnAnalytics?: {
      track?: (event: string, properties: Record<string, unknown>) => void;
      collect?: (payload: AnalyticsPayload) => void;
    };
  }
}

function createId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${random}`;
}

function readCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1];
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function readOrCreateStoredId(key: string, prefix: string) {
  const stored = window.localStorage.getItem(key) || readCookie(key);
  if (stored) {
    writeCookie(key, stored);
    return stored;
  }

  const next = createId(prefix);
  window.localStorage.setItem(key, next);
  writeCookie(key, next);
  return next;
}

function shouldIgnorePath(path: string) {
  return path.startsWith("/admin") || path.startsWith("/api") || path.startsWith("/_next");
}

export function FirstPartyAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageViewRef = useRef<string | null>(null);

  useEffect(() => {
    const anonymousId = readOrCreateStoredId(VISITOR_KEY, "anon");
    const sessionId = readOrCreateStoredId(SESSION_KEY, "sess");

    const collect = (payload: AnalyticsPayload) => {
      const path = payload.path || `${window.location.pathname}${window.location.search}`;
      if (shouldIgnorePath(path)) {
        return;
      }

      window
        .fetch("/api/analytics/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            anonymousId,
            sessionId,
            eventName: payload.eventName,
            path,
            title: payload.title ?? document.title,
            referrer: payload.referrer ?? (document.referrer || null),
            metadata: payload.metadata ?? null
          })
        })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }

          const result = (await response.json().catch(() => null)) as { sessionId?: string } | null;
          if (result?.sessionId && result.sessionId !== sessionId) {
            window.localStorage.setItem(SESSION_KEY, result.sessionId);
            writeCookie(SESSION_KEY, result.sessionId);
          }
        })
        .catch(() => {
          // First-party operational analytics should never affect the visitor journey.
        });
    };

    window.bcnAnalytics = {
      ...window.bcnAnalytics,
      collect,
      track: (event, properties) => {
        collect({
          eventName: event,
          metadata: properties ?? null
        });
      }
    };
  }, []);

  useEffect(() => {
    const path = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    if (!pathname || shouldIgnorePath(path) || lastPageViewRef.current === path) {
      return;
    }

    lastPageViewRef.current = path;
    window.bcnAnalytics?.collect?.({
      eventName: "page_view",
      path,
      title: document.title,
      referrer: document.referrer || null
    });
  }, [pathname, searchParams]);

  return null;
}

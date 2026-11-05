"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  COOKIE_CONSENT_UPDATED_EVENT,
  hasConsentForCategory,
  parseCookieConsentFromCookieString,
} from "@/lib/cookie-consent";
import {
  sanitizeAnalyticsLocation,
  isPrivateBusinessPath,
} from "@/lib/analytics/privacy";
const allowed = () =>
  hasConsentForCategory(
    parseCookieConsentFromCookieString(document.cookie),
    "analytics",
  );
const keys = ["bcn_anon_id", "bcn_session_id"];
export function BcnAnalytics() {
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);
  useEffect(() => {
    const sync = () => {
      const yes = allowed();
      setConsented(yes);
      if (!yes) {
        for (const key of keys) {
          try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          } catch {}
          document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax`;
        }
      }
    };
    sync();
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, sync);
  }, []);
  useEffect(() => {
    if (
      !consented ||
      !pathname ||
      isPrivateBusinessPath(pathname) ||
      /^\/(admin|help-consent|login|register|profile|dashboard)(\/|$)/.test(
        pathname,
      )
    )
      return;
    let anonymousId: string;
    let sessionId: string;
    try {
      anonymousId =
        localStorage.getItem(keys[0]) || `anon_${crypto.randomUUID()}`;
      sessionId =
        sessionStorage.getItem(keys[1]) || `sess_${crypto.randomUUID()}`;
      localStorage.setItem(keys[0], anonymousId);
      sessionStorage.setItem(keys[1], sessionId);
    } catch {
      return;
    }
    const collect: NonNullable<Window["bcnAnalytics"]>["collect"] = (
      payload,
    ) => {
      if (!allowed()) return;
      const metadata =
        payload.metadata?.tool && typeof payload.metadata.tool === "string"
          ? { tool: payload.metadata.tool }
          : null;
      void fetch("/api/analytics/collect", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousId,
          sessionId,
          eventName: payload.eventName,
          path: sanitizeAnalyticsLocation(
            `${pathname}${window.location.search}`,
          ),
          referrer: sanitizeAnalyticsLocation(document.referrer || null),
          metadata,
        }),
      }).catch(() => undefined);
    };
    window.bcnAnalytics = { ...window.bcnAnalytics, collect };
    collect({ eventName: "page_view" });
    return () => {
      if (window.bcnAnalytics?.collect === collect)
        delete window.bcnAnalytics.collect;
    };
  }, [consented, pathname]);
  return null;
}

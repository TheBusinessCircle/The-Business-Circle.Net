"use client";

import { PostHogProvider as PostHogReactProvider } from "posthog-js/react";
import posthog from "posthog-js";
import type {
  BeforeSendFn,
  CaptureResult,
  CapturedNetworkRequest,
  PostHogConfig
} from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  COOKIE_CONSENT_UPDATED_EVENT,
  hasConsentForCategory,
  parseCookieConsentFromCookieString
} from "@/lib/cookie-consent";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.i.posthog.com";
const POSTHOG_DEBUG = process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true";
const REPLAY_SAMPLE_STORAGE_KEY = "bcn_posthog_replay_sampled_v1";
const DEFAULT_PRODUCTION_REPLAY_SAMPLE_RATE = 0.25;

const SENSITIVE_PROPERTY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /stripe/i,
  /checkout[_-]?session/i,
  /email/i,
  /phone/i,
  /address/i
];

const SENSITIVE_URL_PARAMS = [
  "token",
  "auth",
  "code",
  "email",
  "password",
  "session_id",
  "checkout_session_id",
  "stripe_session_id"
];

const SENSITIVE_NETWORK_PATHS = [
  "/api/auth",
  "/api/register",
  "/api/stripe",
  "/api/messages",
  "/api/profile",
  "/api/admin"
];

function readAnalyticsConsent() {
  if (typeof document === "undefined") {
    return false;
  }

  return hasConsentForCategory(
    parseCookieConsentFromCookieString(document.cookie),
    "analytics"
  );
}

function parseReplaySampleRate() {
  const configuredRate = Number(process.env.NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE);
  const fallbackRate =
    process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_REPLAY_SAMPLE_RATE : 1;
  const rate = Number.isFinite(configuredRate) ? configuredRate : fallbackRate;

  return Math.min(1, Math.max(0, rate));
}

function randomSample() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0xffffffff;
  }

  return Math.random();
}

function shouldSampleReplay() {
  if (typeof window === "undefined") {
    return false;
  }

  const sampleRate = parseReplaySampleRate();
  if (sampleRate >= 1) {
    return true;
  }

  if (sampleRate <= 0) {
    return false;
  }

  const storedDecision = window.sessionStorage.getItem(REPLAY_SAMPLE_STORAGE_KEY);
  if (storedDecision === "1") {
    return true;
  }

  if (storedDecision === "0") {
    return false;
  }

  const sampledIn = randomSample() < sampleRate;
  window.sessionStorage.setItem(REPLAY_SAMPLE_STORAGE_KEY, sampledIn ? "1" : "0");
  return sampledIn;
}

function propertyLooksSensitive(propertyName: string) {
  return SENSITIVE_PROPERTY_PATTERNS.some((pattern) => pattern.test(propertyName));
}

function sanitizeProperties(properties: CaptureResult["properties"]) {
  if (!properties) {
    return properties;
  }

  const sanitized = { ...properties };

  for (const key of Object.keys(sanitized)) {
    if (propertyLooksSensitive(key)) {
      delete sanitized[key];
      continue;
    }

    const value = sanitized[key];
    if (
      typeof value === "string" &&
      (key === "$current_url" || key === "$referrer" || key.toLowerCase().includes("url"))
    ) {
      sanitized[key] = redactUrl(value);
    }
  }

  return sanitized;
}

const sanitizeBeforeSend: BeforeSendFn = (event) => {
  if (!event) {
    return null;
  }

  return {
    ...event,
    properties: sanitizeProperties(event.properties)
  };
};

function redactUrl(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    for (const param of SENSITIVE_URL_PARAMS) {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, "[redacted]");
      }
    }

    return url.toString();
  } catch {
    return value.split("?")[0] ?? value;
  }
}

function maskCapturedNetworkRequest(request: CapturedNetworkRequest) {
  if (!request.name) {
    return request;
  }

  try {
    const url = new URL(request.name, window.location.origin);
    if (SENSITIVE_NETWORK_PATHS.some((path) => url.pathname.startsWith(path))) {
      return null;
    }

    request.name = redactUrl(url.toString());
    return request;
  } catch {
    request.name = request.name.split("?")[0] ?? request.name;
    return request;
  }
}

function isPostHogReady() {
  return Boolean(POSTHOG_KEY && posthog.__loaded);
}

function createPostHogConfig(replayEnabled: boolean): Partial<PostHogConfig> {
  return {
    api_host: POSTHOG_HOST,
    defaults: "2026-01-30",
    debug: POSTHOG_DEBUG,
    autocapture: {
      dom_event_allowlist: ["click", "submit"],
      element_allowlist: ["a", "button", "form", "input", "select", "textarea", "label"],
      element_attribute_ignorelist: [
        "value",
        "placeholder",
        "data-token",
        "data-secret",
        "data-email",
        "data-user-id",
        "data-customer-id"
      ],
      capture_copied_text: false
    },
    capture_pageview: false,
    capture_pageleave: true,
    capture_performance: {
      network_timing: true,
      web_vitals: true,
      web_vitals_attribution: false
    },
    disable_session_recording: !replayEnabled,
    mask_all_element_attributes: true,
    mask_personal_data_properties: true,
    custom_personal_data_properties: [
      "email",
      "phone",
      "token",
      "session_id",
      "checkout_session_id"
    ],
    property_denylist: [
      "password",
      "confirmPassword",
      "token",
      "secret",
      "email",
      "stripeCustomerId",
      "stripeSubscriptionId"
    ],
    before_send: sanitizeBeforeSend,
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: true,
        tel: true,
        text: true,
        textarea: true,
        select: true
      },
      maskTextSelector:
        ".ph-mask, [data-sensitive], [data-private], [data-member-sensitive], [data-posthog-mask]",
      blockSelector:
        ".ph-no-capture, [data-posthog-block], [data-payment], [data-stripe], iframe[src*='stripe.com']",
      recordHeaders: false,
      recordBody: false,
      maskCapturedNetworkRequestFn: maskCapturedNetworkRequest
    },
    loaded: (client) => {
      client.debug(POSTHOG_DEBUG);
    }
  };
}

function routeArea(pathname: string) {
  if (pathname === "/" || pathname === "/home") {
    return "public_home";
  }

  if (pathname === "/join-mobile" || pathname === "/join-desktop" || pathname.startsWith("/join")) {
    return "join";
  }

  if (pathname === "/membership") {
    return "membership";
  }

  if (pathname === "/audit") {
    return "founder_audit";
  }

  if (
    pathname === "/login" ||
    pathname === "/sign-in" ||
    pathname === "/register" ||
    pathname === "/sign-up"
  ) {
    return "auth";
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "dashboard";
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "admin";
  }

  if (
    pathname.startsWith("/community") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/directory") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/calls") ||
    pathname.startsWith("/wins")
  ) {
    return "member";
  }

  return "public";
}

function PostHogPageView({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !isPostHogReady()) {
      return;
    }

    const path = pathname || "/";
    const queryString = searchParams.toString();
    const pathWithQuery = queryString ? `${path}?${queryString}` : path;

    if (previousPathRef.current === pathWithQuery) {
      return;
    }

    previousPathRef.current = pathWithQuery;
    posthog.capture("$pageview", {
      $current_url: `${window.location.origin}${path}`,
      path,
      route_area: routeArea(path)
    });
  }, [enabled, pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializedRef = useRef(false);
  const identifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const syncConsent = () => setAnalyticsConsent(readAnalyticsConsent());

    syncConsent();
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, syncConsent);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, syncConsent);
    };
  }, []);

  useEffect(() => {
    if (!POSTHOG_KEY) {
      return;
    }

    if (analyticsConsent && !initializedRef.current) {
      posthog.init(POSTHOG_KEY, createPostHogConfig(shouldSampleReplay()));
      initializedRef.current = true;
      setIsInitialized(true);
      return;
    }

    if (!initializedRef.current) {
      return;
    }

    if (analyticsConsent) {
      posthog.opt_in_capturing();
      setIsInitialized(true);
      if (!posthog.config.disable_session_recording && !posthog.sessionRecordingStarted()) {
        posthog.startSessionRecording();
      }
      return;
    }

    posthog.stopSessionRecording();
    posthog.opt_out_capturing();
    posthog.reset();
    identifiedUserIdRef.current = null;
    setIsInitialized(false);
  }, [analyticsConsent]);

  useEffect(() => {
    const track: NonNullable<Window["bcnAnalytics"]>["track"] = (event, properties) => {
      if (!analyticsConsent || !isPostHogReady()) {
        return;
      }

      posthog.capture(event, properties);
    };

    window.bcnAnalytics = {
      ...(window.bcnAnalytics ?? {}),
      track
    };

    return () => {
      if (window.bcnAnalytics?.track === track) {
        delete window.bcnAnalytics.track;
      }
    };
  }, [analyticsConsent]);

  useEffect(() => {
    if (!analyticsConsent || !isPostHogReady()) {
      return;
    }

    const user = session?.user;
    if (status === "authenticated" && user?.id) {
      if (identifiedUserIdRef.current === user.id) {
        return;
      }

      posthog.identify(user.id, {
        role: user.role,
        membership_tier: user.membershipTier,
        has_active_subscription: user.hasActiveSubscription,
        email_verified: Boolean(user.emailVerified),
        founding_member: user.foundingMember
      });
      identifiedUserIdRef.current = user.id;
      return;
    }

    if (status === "unauthenticated" && identifiedUserIdRef.current) {
      posthog.reset();
      identifiedUserIdRef.current = null;
    }
  }, [analyticsConsent, session?.user, status]);

  const pageViewEnabled = useMemo(
    () => analyticsConsent && isInitialized && POSTHOG_KEY.length > 0,
    [analyticsConsent, isInitialized]
  );

  return (
    <PostHogReactProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView enabled={pageViewEnabled} />
      </Suspense>
      {children}
    </PostHogReactProvider>
  );
}

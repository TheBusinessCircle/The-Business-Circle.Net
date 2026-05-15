import { PostHog } from "posthog-node";
import { logServerWarning } from "@/lib/security/logging";

export const SERVER_ANALYTICS_EVENTS = {
  stripeCheckoutSucceeded: "stripe_checkout_succeeded",
  subscriptionUpgraded: "subscription_upgraded",
  subscriptionDowngraded: "subscription_downgraded",
  subscriptionCancelled: "subscription_cancelled",
  onboardingCompleted: "onboarding_completed"
} as const;

export type ServerAnalyticsEventName =
  (typeof SERVER_ANALYTICS_EVENTS)[keyof typeof SERVER_ANALYTICS_EVENTS];

type ServerAnalyticsValue = string | number | boolean | null | undefined;
export type ServerAnalyticsProperties = Record<string, ServerAnalyticsValue>;

type CaptureServerAnalyticsInput = {
  distinctId: string;
  event: ServerAnalyticsEventName;
  properties?: ServerAnalyticsProperties;
};

const SENSITIVE_PROPERTY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /email/i,
  /phone/i,
  /address/i,
  /stripe[_-]?(customer|subscription|checkout|session)/i
];

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function shouldDebugServerAnalytics() {
  return process.env.ANALYTICS_DEBUG === "true" || process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";
}

function isSafePropertyName(name: string) {
  return !SENSITIVE_PROPERTY_PATTERNS.some((pattern) => pattern.test(name));
}

function sanitizeProperties(properties: ServerAnalyticsProperties = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter((entry): entry is [string, Exclude<ServerAnalyticsValue, undefined>] => {
      const [key, value] = entry;
      return value !== undefined && isSafePropertyName(key);
    })
  );
}

function createServerPostHogClient() {
  const key = env("NEXT_PUBLIC_POSTHOG_KEY");
  const host = env("NEXT_PUBLIC_POSTHOG_HOST") || "https://eu.i.posthog.com";

  if (!key) {
    return null;
  }

  return new PostHog(key, {
    host,
    flushAt: 1,
    flushInterval: 0,
    privacyMode: true,
    featureFlagsLogWarnings: false,
    before_send: (event) => {
      if (!event) {
        return null;
      }

      return {
        ...event,
        properties: sanitizeProperties(event.properties)
      };
    }
  });
}

export async function captureServerAnalyticsEvent({
  distinctId,
  event,
  properties
}: CaptureServerAnalyticsInput) {
  const client = createServerPostHogClient();

  if (!client) {
    if (shouldDebugServerAnalytics()) {
      logServerWarning("posthog-server-event-skipped", {
        event,
        reason: "missing-posthog-key"
      });
    }
    return false;
  }

  try {
    await client.captureImmediate({
      distinctId,
      event,
      properties: sanitizeProperties(properties)
    });
    return true;
  } catch (error) {
    if (shouldDebugServerAnalytics()) {
      logServerWarning("posthog-server-event-failed", {
        event,
        errorMessage: error instanceof Error ? error.message : "Unknown analytics error"
      });
    }
    return false;
  } finally {
    client.shutdown(3000);
  }
}

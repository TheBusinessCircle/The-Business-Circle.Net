export const ANALYTICS_EVENTS = {
  rootEntry: "root_entry",
  joinMobileStepInside: "join_mobile_step_inside",
  joinDesktopStepInside: "join_desktop_step_inside",
  auditStart: "audit_start",
  auditComplete: "audit_complete",
  recommendedTierClicked: "recommended_tier_clicked",
  membershipTierSelected: "membership_tier_selected",
  checkoutStarted: "checkout_started",
  registrationStarted: "registration_started",
  loginSuccess: "login_success",
  profileSaved: "profile_saved",
  blueprintVote: "blueprint_vote",
  founderServiceRequestStarted: "founder_service_request_started",
  founderServiceRequestSubmitted: "founder_service_request_submitted"
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

type AnalyticsValue = string | number | boolean | null | undefined;
export type AnalyticsProperties = Record<string, AnalyticsValue>;

type AnalyticsPayload = {
  event: AnalyticsEventName;
  properties: Record<string, Exclude<AnalyticsValue, undefined>>;
  timestamp: string;
};

declare global {
  interface Window {
    bcnAnalytics?: {
      track?: (event: AnalyticsEventName, properties: AnalyticsPayload["properties"]) => void;
    };
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function sanitizeProperties(properties: AnalyticsProperties = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter((entry): entry is [string, Exclude<AnalyticsValue, undefined>] => {
      const [, value] = entry;
      return value !== undefined;
    })
  );
}

function shouldLogAnalyticsEvents() {
  return (
    process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true" ||
    process.env.ANALYTICS_DEBUG === "true"
  );
}

function createPayload(
  event: AnalyticsEventName,
  properties?: AnalyticsProperties
): AnalyticsPayload {
  return {
    event,
    properties: sanitizeProperties(properties),
    timestamp: new Date().toISOString()
  };
}

export function trackAnalyticsEvent(
  event: AnalyticsEventName,
  properties?: AnalyticsProperties
) {
  try {
    const payload = createPayload(event, properties);

    if (typeof window !== "undefined") {
      if (window.bcnAnalytics?.track) {
        window.bcnAnalytics.track(payload.event, payload.properties);
        return;
      }

      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push({
          event: payload.event,
          ...payload.properties
        });
        return;
      }
    }

    if (shouldLogAnalyticsEvents()) {
      console.info("[analytics]", payload);
    }
  } catch {
    // Analytics must never block product, checkout, auth, or member flows.
  }
}

export const ANALYTICS_EVENTS = {
  rootEntry: "root_entry",
  joinMobileStepInside: "join_mobile_step_inside",
  joinDesktopStepInside: "join_desktop_step_inside",
  publicCtaJoinClicked: "public_cta_join_clicked",
  publicCtaAuditClicked: "public_cta_audit_clicked",
  auditStart: "audit_start",
  founderAuditStarted: "founder_audit_started",
  auditComplete: "audit_complete",
  founderAuditCompleted: "founder_audit_completed",
  founderAuditMembershipClicked: "founder_audit_membership_clicked",
  recommendedTierClicked: "recommended_tier_clicked",
  membershipTierSelected: "membership_tier_selected",
  membershipTierViewed: "membership_tier_viewed",
  membershipCheckoutStarted: "membership_checkout_started",
  membershipSignupCompleted: "membership_signup_completed",
  checkoutStarted: "checkout_started",
  registrationStarted: "registration_started",
  loginSuccess: "login_success",
  profileSaved: "profile_saved",
  profileViewed: "profile_viewed",
  memberMessageSent: "member_message_sent",
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

type MembershipTierValue = "FOUNDATION" | "INNER_CIRCLE" | "CORE";
type BillingIntervalValue = "monthly" | "annual";
type PublicCtaSource =
  | "home"
  | "about"
  | "membership"
  | "audit"
  | "insights"
  | "contact"
  | "intent"
  | "navigation"
  | "footer"
  | "unknown";

const SENSITIVE_PROPERTY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /email/i,
  /phone/i,
  /address/i,
  /stripe/i,
  /checkout[_-]?session/i
];

declare global {
  interface Window {
    bcnAnalytics?: {
      track?: (event: AnalyticsEventName, properties: AnalyticsPayload["properties"]) => void;
    };
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function isSafeAnalyticsPropertyName(name: string) {
  return !SENSITIVE_PROPERTY_PATTERNS.some((pattern) => pattern.test(name));
}

function sanitizeProperties(properties: AnalyticsProperties = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter((entry): entry is [string, Exclude<AnalyticsValue, undefined>] => {
      const [key, value] = entry;
      return value !== undefined && isSafeAnalyticsPropertyName(key);
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

export function trackMembershipCheckoutStarted(properties: {
  source: "membership" | "join" | "dashboard" | "registration";
  tier: MembershipTierValue;
  billingInterval: BillingIntervalValue;
}) {
  trackAnalyticsEvent(ANALYTICS_EVENTS.membershipCheckoutStarted, properties);
}

export function trackPublicCtaJoinClicked(properties: {
  source: PublicCtaSource;
  href: string;
}) {
  trackAnalyticsEvent(ANALYTICS_EVENTS.publicCtaJoinClicked, properties);
}

export function trackPublicCtaAuditClicked(properties: {
  source: PublicCtaSource;
  href: string;
}) {
  trackAnalyticsEvent(ANALYTICS_EVENTS.publicCtaAuditClicked, properties);
}

export function trackFounderAuditStarted(properties?: {
  source?: PublicCtaSource;
}) {
  trackAnalyticsEvent(ANALYTICS_EVENTS.founderAuditStarted, properties);
}

export function trackMembershipSignupCompleted(properties: {
  tier: MembershipTierValue;
  billingInterval: BillingIntervalValue;
  source?: "join" | "membership" | "admin";
}) {
  trackAnalyticsEvent(ANALYTICS_EVENTS.membershipSignupCompleted, properties);
}

export function trackFounderAuditCompleted(properties: {
  score: number;
  tier: string;
}) {
  trackAnalyticsEvent(ANALYTICS_EVENTS.founderAuditCompleted, properties);
}

export function trackFounderAuditMembershipClicked(properties: {
  score: number;
  tier: string;
  href: string;
}) {
  trackAnalyticsEvent(ANALYTICS_EVENTS.founderAuditMembershipClicked, properties);
}

export function trackMembershipTierViewed(properties: {
  source: "membership" | "audit" | "join";
  tier: MembershipTierValue;
  billingInterval?: BillingIntervalValue;
}) {
  trackAnalyticsEvent(ANALYTICS_EVENTS.membershipTierViewed, properties);
}

export function trackProfileViewed(properties: {
  profileUserId: string;
  viewerIsOwner?: boolean;
  source?: "public_profile" | "directory" | "message_thread" | "dashboard";
}) {
  trackAnalyticsEvent(ANALYTICS_EVENTS.profileViewed, properties);
}

export function trackMemberMessageSent(properties: {
  surface: "community_channel" | "direct_message" | "message_request";
  hasAttachment?: boolean;
  isReply?: boolean;
}) {
  trackAnalyticsEvent(ANALYTICS_EVENTS.memberMessageSent, properties);
}

import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";

describe("analytics event layer", () => {
  it("defines the launch-readiness events", () => {
    expect(Object.values(ANALYTICS_EVENTS)).toEqual([
      "root_entry",
      "join_mobile_step_inside",
      "join_desktop_step_inside",
      "audit_start",
      "audit_complete",
      "recommended_tier_clicked",
      "membership_tier_selected",
      "checkout_started",
      "registration_started",
      "login_success",
      "profile_saved",
      "blueprint_vote",
      "founder_service_request_started",
      "founder_service_request_submitted"
    ]);
  });

  it("stays safe when no provider is configured", () => {
    expect(() =>
      trackAnalyticsEvent(ANALYTICS_EVENTS.rootEntry, {
        route: "/",
        ignored: undefined
      })
    ).not.toThrow();
  });
});

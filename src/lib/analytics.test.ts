import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";

describe("analytics event layer", () => {
  it("defines the launch-readiness events", () => {
    expect(Object.values(ANALYTICS_EVENTS)).toEqual([
      "root_entry",
      "join_mobile_step_inside",
      "join_desktop_step_inside",
      "public_cta_join_clicked",
      "public_cta_audit_clicked",
      "audit_cta_clicked",
      "audit_start",
      "founder_audit_started",
      "audit_complete",
      "founder_audit_completed",
      "founder_audit_membership_clicked",
      "membership_selected_from_audit",
      "recommended_tier_clicked",
      "membership_tier_selected",
      "membership_tier_viewed",
      "membership_checkout_started",
      "membership_signup_completed",
      "checkout_started",
      "launch_code_entered",
      "launch_code_validated",
      "launch_code_invalid",
      "launch_code_full",
      "launch_code_checkout_started",
      "launch_code_checkout_completed",
      "launch_code_subscription_trialing",
      "launch_code_subscription_active",
      "review_request_page_viewed",
      "review_text_copied",
      "review_submitted",
      "google_review_clicked",
      "registration_started",
      "spin_to_connect_started",
      "spin_to_connect_completed",
      "spin_to_connect_dialog_opened",
      "spin_to_connect_signup_clicked",
      "spin_to_connect_login_clicked",
      "spin_to_connect_dialog_closed",
      "login_success",
      "profile_saved",
      "profile_viewed",
      "member_message_sent",
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

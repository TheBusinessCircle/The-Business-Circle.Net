import { describe, expect, it } from "vitest";
import { createPostHogConfig } from "@/components/analytics/posthog-provider";
import {
  ANALYTICS_SESSION_REPLAY_ENABLED,
  sanitizeAnalyticsLocation,
  sanitizeAnalyticsPayload
} from "@/lib/analytics/privacy";

describe("analytics location privacy", () => {
  const token = "0123456789abcdef".repeat(4);
  const email = "private.owner@example.test";
  const inviteCode = "PRIVATE-INVITE-CODE";

  it("keeps DOM session replay disabled while invite-bearing hrefs exist", () => {
    expect(ANALYTICS_SESSION_REPLAY_ENABLED).toBe(false);
  });

  it("keeps nested PostHog URL and exception capture disabled", () => {
    const config = createPostHogConfig(false);

    expect(config).toMatchObject({
      capture_performance: false,
      capture_exceptions: false,
      autocapture: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      save_referrer: false,
      save_campaign_params: false,
      logs: { captureConsoleLogs: false },
      disable_session_recording: true
    });
    expect(config.before_send).toBeTypeOf("function");
  });

  it("scrubs secrets from properties, person updates and nested location fields", () => {
    const timestamp = new Date("2026-07-13T00:00:00.000Z");
    const payload = sanitizeAnalyticsPayload({
      timestamp,
      properties: {
        $current_url: `https://thebusinesscircle.net/invite/${inviteCode}`,
        nested: {
          reset_path: `/reset-password?email=${email}&token=${token}`
        }
      },
      $set: {
        email,
        return_url: `/testimonial/${token}`
      },
      $set_once: {
        $initial_current_url: `https://thebusinesscircle.net/invite/${inviteCode}`,
        $initial_pathname: `/testimonial/${token}`,
        $initial_referrer: `https://thebusinesscircle.net/reset-password?email=${email}&token=${token}`
      }
    });
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain(email);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain(inviteCode);
    expect(serialized).toContain("/invite/[redacted]");
    expect(serialized).toContain("/testimonial/[redacted]");
    expect(payload.timestamp).toBe(timestamp);
  });

  it("removes all query data from authentication and reset locations", () => {
    const value = sanitizeAnalyticsLocation(
      `/reset-password?email=${email}&token=${token}#confirm`
    );

    expect(value).toBe("/reset-password");
    expect(value).not.toContain(email);
    expect(value).not.toContain(token);
  });

  it("redacts invitation codes from relative and absolute locations", () => {
    const relative = sanitizeAnalyticsLocation(`/invite/${inviteCode}?from=email`);
    const absolute = sanitizeAnalyticsLocation(
      `https://thebusinesscircle.net/invite/${inviteCode}`
    );

    expect(relative).toContain("/invite/");
    expect(absolute).toContain("https://thebusinesscircle.net/invite/");
    expect(`${relative}${absolute}`).not.toContain(inviteCode);
  });

  it("redacts testimonial request tokens from relative and absolute paths", () => {
    const requestToken = "PRIVATE-TESTIMONIAL-REQUEST-TOKEN";
    const relative = sanitizeAnalyticsLocation(`/testimonial/${requestToken}`);
    const absolute = sanitizeAnalyticsLocation(
      `https://thebusinesscircle.net/testimonial/${requestToken}?source=email`
    );

    expect(relative).toBe("/testimonial/[redacted]");
    expect(absolute).toBe("https://thebusinesscircle.net/testimonial/[redacted]");
    expect(`${relative}${absolute}`).not.toContain(requestToken);
  });

  it("keeps ordinary campaign attribution while removing credential parameters", () => {
    const value = sanitizeAnalyticsLocation(
      `/membership?utm_source=partner&session_id=${token}&next=${encodeURIComponent(`/invite/${inviteCode}`)}`
    );

    expect(value).toContain("utm_source=partner");
    expect(value).not.toContain("session_id");
    expect(value).not.toContain(token);
    expect(value).not.toContain(inviteCode);
  });

  it("removes invitation query parameters from public join and membership paths", () => {
    const join = sanitizeAnalyticsLocation(`/join?invite=${inviteCode}`);
    const membership = sanitizeAnalyticsLocation(
      `/membership?inviteCode=${inviteCode}&referredBy=${inviteCode}`
    );

    expect(`${join}${membership}`).not.toContain(inviteCode);
    expect(join).toBe("/join");
    expect(membership).toBe("/membership");
  });

  it("drops nested return intent entirely from login analytics", () => {
    const value = sanitizeAnalyticsLocation(
      `/login?from=${encodeURIComponent(`/invite/${inviteCode}`)}`
    );

    expect(value).toBe("/login");
    expect(value).not.toContain(inviteCode);
  });
});

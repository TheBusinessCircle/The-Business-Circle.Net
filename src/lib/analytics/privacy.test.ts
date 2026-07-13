import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANALYTICS_SESSION_REPLAY_ENABLED,
  sanitizeAnalyticsLocation
} from "@/lib/analytics/privacy";

describe("analytics location privacy", () => {
  const token = "0123456789abcdef".repeat(4);
  const email = "private.owner@example.test";
  const inviteCode = "PRIVATE-INVITE-CODE";

  it("keeps DOM session replay disabled while invite-bearing hrefs exist", () => {
    expect(ANALYTICS_SESSION_REPLAY_ENABLED).toBe(false);
  });

  it("keeps nested PostHog URL and exception capture disabled", () => {
    const providerSource = readFileSync(
      resolve(process.cwd(), "src/components/analytics/posthog-provider.tsx"),
      "utf8"
    );

    expect(providerSource).toMatch(/capture_performance:\s*false/);
    expect(providerSource).toMatch(/capture_exceptions:\s*false/);
    expect(providerSource).toMatch(/autocapture:\s*false/);
    expect(providerSource).toMatch(/disable_session_recording:\s*!replayEnabled/);
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

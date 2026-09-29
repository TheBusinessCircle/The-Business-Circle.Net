import { describe, expect, it } from "vitest";
import {
  evaluateCustomerRuntimeRoute,
  getCustomerShellKind,
  isBcnProcessOwnedRuntimePath
} from "@/lib/circle-card/runtime-route-policy";

describe("Circle Card customer runtime route policy", () => {
  it("keeps the BCN runtime unrestricted by the Circle Card policy", () => {
    expect(getCustomerShellKind("bcn")).toBe("bcn");
    expect(evaluateCustomerRuntimeRoute("bcn", "/admin")).toEqual({ action: "allow" });
  });

  it("selects the standalone shell for the Circle Card runtime", () => {
    expect(getCustomerShellKind("circle-card")).toBe("circle-card");
  });

  it.each([
    "/",
    "/pro",
    "/teams",
    "/community-standards",
    "/app",
    "/app/onboarding",
    "/app/studio",
    "/app/wallet",
    "/app/testimonial",
    "/circle-card",
    "/dashboard/circle-card/wallet"
  ])("allows the intended Circle Card route %s", (pathname) => {
    expect(evaluateCustomerRuntimeRoute("circle-card", pathname)).toEqual({ action: "allow" });
  });

  it("keeps the Circle testimonial workspace but rejects the legacy BCN testimonial page", () => {
    expect(evaluateCustomerRuntimeRoute("circle-card", "/app/testimonial")).toEqual({
      action: "allow"
    });
    expect(evaluateCustomerRuntimeRoute("circle-card", "/testimonial")).toEqual({
      action: "redirect",
      destination: "/",
      reason: "bcn-customer-surface"
    });
    expect(evaluateCustomerRuntimeRoute("circle-card", "/testimonial", "POST")).toEqual({
      action: "reject",
      status: 404,
      reason: "bcn-customer-surface"
    });
  });

  it.each([
    "/admin",
    "/community",
    "/membership",
    "/dashboard/resources",
    "/calls",
    "/messages",
    "/founder",
    "/member/growth-architect",
    "/home"
  ])("redirects BCN customer surface %s to the Circle Card home", (pathname) => {
    expect(evaluateCustomerRuntimeRoute("circle-card", pathname)).toEqual({
      action: "redirect",
      destination: "/",
      reason: "bcn-customer-surface"
    });
  });

  it.each([
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/api/auth/session",
    "/api/auth/csrf",
    "/api/auth/providers",
    "/api/auth/signin",
    "/api/auth/signin/credentials",
    "/api/auth/signout",
    "/api/auth/error",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/verify-email",
    "/api/auth/callback/credentials",
    "/api/analytics/collect",
    "/api/register",
    "/api/circle-card/analytics",
    "/api/circle-card/business-card-scan",
    "/api/circle-card/link-access",
    "/api/circle-card/link-file/1700000000000-deadbeef.pdf",
    "/api/circle-card/public-image/user-profile-photo-1700000000000-deadbeef.png",
    "/api/circle-card/referral-attribution",
    "/api/circle-card/referral-attribution/signup",
    "/api/circle-card/upload",
    "/api/stripe/circle-card/checkout",
    "/api/stripe/circle-card/portal",
    "/card/example",
    "/r/referral-code",
    "/robots.txt",
    "/sitemap.xml",
    "/circle-card-icon-192.png"
  ])("keeps required auth, API and public card path %s reachable", (pathname) => {
    expect(evaluateCustomerRuntimeRoute("circle-card", pathname)).toEqual({ action: "allow" });
  });

  it.each([
    "/api/admin/live-summary",
    "/api/community/posts/post-1",
    "/api/community/realtime/token",
    "/api/channels/general/messages",
    "/api/messages/requests",
    "/api/messages/threads/thread-1/messages",
    "/api/calls/room-1/token",
    "/api/intelligence/preview-image",
    "/api/founder-services/requests",
    "/api/profile",
    "/api/contact",
    "/api/register/status",
    "/api/auth/not-a-reviewed-route",
    "/api/stripe/checkout",
    "/api/stripe/portal",
    "/api/testimonials/google-intent",
    "/api/wins/attachments/attachment-1",
    "/api/circle-card/not-a-reviewed-route"
  ])("rejects the non-allowlisted API %s on the Circle runtime", (pathname) => {
    expect(evaluateCustomerRuntimeRoute("circle-card", pathname, "POST")).toEqual({
      action: "reject",
      status: 404,
      reason: "api-not-allowlisted"
    });
  });

  it.each([
    "/api/stripe/webhook",
    "/api/webhooks/resend/inbound",
    "/api/cron/intelligence-refresh",
    "/api/internal/circle-card/weekly-summary/run",
    "/api/internal/circle-card/activation-reminders/run",
    "/api/internal/community/prompts/run",
    "/api/internal/resources/publish/run"
  ])("reserves BCN-owned endpoint %s for the BCN process", (pathname) => {
    expect(evaluateCustomerRuntimeRoute("circle-card", pathname, "POST")).toEqual({
      action: "reject",
      status: 404,
      reason: "bcn-process-owned-endpoint"
    });
    expect(evaluateCustomerRuntimeRoute("bcn", pathname, "POST")).toEqual({
      action: "allow"
    });
  });

  it.each([
    "/API/INTERNAL/circle-card/weekly-summary/run",
    "//api//internal//circle-card/weekly-summary/run",
    "/safe/../api/internal/circle-card/weekly-summary/run",
    "/api%2Finternal%2Fcircle-card%2Fweekly-summary%2Frun",
    "/api%252Finternal%252Fcircle-card%252Fweekly-summary%252Frun",
    "/api\\internal\\circle-card\\weekly-summary\\run",
    "/api/cron/../internal/circle-card/weekly-summary/run/"
  ])("normalizes disguised BCN-owned endpoint %s before ownership checks", (pathname) => {
    expect(isBcnProcessOwnedRuntimePath(pathname)).toBe(true);
    expect(evaluateCustomerRuntimeRoute("circle-card", pathname, "POST")).toEqual({
      action: "reject",
      status: 404,
      reason: "bcn-process-owned-endpoint"
    });
  });

  it("does not allow unreviewed extension-ending Circle namespace APIs", () => {
    expect(
      evaluateCustomerRuntimeRoute("circle-card", "/api/circle-card/export.csv", "GET")
    ).toEqual({
      action: "reject",
      status: 404,
      reason: "api-not-allowlisted"
    });
  });

  it.each([
    "/API/CIRCLE-CARD/UPLOAD",
    "//api//circle-card//upload",
    "/api/circle-card/../community/posts",
    "/api%2Fcircle-card%2Fupload",
    "/api%252Fcircle-card%252Fupload",
    "/api\\circle-card\\upload",
    "/api/circle-card/upload/",
    "/api/circle-card/upload?next=/api/community/posts"
  ])("fails closed for malformed or non-canonical API path %s", (pathname) => {
    expect(evaluateCustomerRuntimeRoute("circle-card", pathname, "POST").action).toBe(
      "reject"
    );
  });

  it.each([
    "/api/circle-card/link-file",
    "/api/circle-card/link-file/one/two.pdf",
    "/api/circle-card/public-image",
    "/api/circle-card/public-image/one/two.png"
  ])("rejects paths outside the reviewed dynamic Circle route shape: %s", (pathname) => {
    expect(evaluateCustomerRuntimeRoute("circle-card", pathname)).toEqual({
      action: "reject",
      status: 404,
      reason: "api-not-allowlisted"
    });
  });

  it.each(["/manifest.webmanifest", "/opengraph-image"])(
    "does not serve the BCN-branded generated asset %s on Circle Card",
    (pathname) => {
      expect(evaluateCustomerRuntimeRoute("circle-card", pathname)).toEqual({
        action: "reject",
        status: 404,
        reason: "bcn-customer-surface"
      });
    }
  );

  it("does not let a file-looking BCN route bypass the deny policy", () => {
    expect(evaluateCustomerRuntimeRoute("circle-card", "/admin/export.csv").action)
      .toBe("redirect");
    expect(evaluateCustomerRuntimeRoute("circle-card", "/branding/circle-card-logo.png"))
      .toEqual({ action: "allow" });
    expect(evaluateCustomerRuntimeRoute("circle-card", "/llms.txt")).toEqual({
      action: "redirect",
      destination: "/",
      reason: "bcn-customer-surface"
    });
    expect(evaluateCustomerRuntimeRoute("circle-card", "/social-share.png", "POST")).toEqual({
      action: "reject",
      status: 404,
      reason: "bcn-customer-surface"
    });
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "rejects unsafe %s requests to BCN customer pages without redirecting them",
    (method) => {
      expect(evaluateCustomerRuntimeRoute("circle-card", "/admin", method)).toEqual({
        action: "reject",
        status: 404,
        reason: "bcn-customer-surface"
      });
    }
  );

  it.each(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "rejects non-allowlisted API routes for the alternate method %s",
    (method) => {
      expect(
        evaluateCustomerRuntimeRoute("circle-card", "/api/community/posts/post-1", method)
      ).toEqual({
        action: "reject",
        status: 404,
        reason: "api-not-allowlisted"
      });
    }
  );

  it("continues to allow reviewed Circle API mutations for endpoint-level authorisation", () => {
    expect(evaluateCustomerRuntimeRoute("circle-card", "/api/circle-card/upload", "POST"))
      .toEqual({ action: "allow" });
  });
});

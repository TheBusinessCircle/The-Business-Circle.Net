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
    "/api/auth/verify-email",
    "/api/circle-card/cards",
    "/api/auth/callback/credentials",
    "/card/example",
    "/r/referral-code",
    "/robots.txt",
    "/sitemap.xml",
    "/circle-card-icon-192.png"
  ])("keeps required auth, API and public card path %s reachable", (pathname) => {
    expect(evaluateCustomerRuntimeRoute("circle-card", pathname)).toEqual({ action: "allow" });
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

  it("keeps extension-ending shared APIs reachable without weakening job ownership", () => {
    expect(
      evaluateCustomerRuntimeRoute("circle-card", "/api/circle-card/export.csv", "GET")
    ).toEqual({ action: "allow" });
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

  it("continues to allow shared API mutations for endpoint-level authorisation", () => {
    expect(evaluateCustomerRuntimeRoute("circle-card", "/api/circle-card/cards", "POST"))
      .toEqual({ action: "allow" });
  });
});

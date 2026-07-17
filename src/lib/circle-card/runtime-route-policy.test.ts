import { describe, expect, it } from "vitest";
import {
  evaluateCustomerRuntimeRoute,
  getCustomerShellKind
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
    "/card/example",
    "/r/referral-code"
  ])("keeps required auth, API and public card path %s reachable", (pathname) => {
    expect(evaluateCustomerRuntimeRoute("circle-card", pathname)).toEqual({ action: "allow" });
  });

  it("does not let a file-looking BCN route bypass the deny policy", () => {
    expect(evaluateCustomerRuntimeRoute("circle-card", "/admin/export.csv").action)
      .toBe("redirect");
    expect(evaluateCustomerRuntimeRoute("circle-card", "/branding/circle-card-logo.png"))
      .toEqual({ action: "allow" });
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

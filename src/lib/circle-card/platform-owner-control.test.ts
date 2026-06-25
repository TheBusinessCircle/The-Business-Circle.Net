import { describe, expect, it } from "vitest";
import {
  CIRCLE_CARD_CONTROL_CENTRE_DEVELOPMENT_MODULES,
  CIRCLE_CARD_CONTROL_CENTRE_ROADMAP,
  hasCircleCardPlatformOwnerAdminAccess,
  isCircleCardPlatformOwner,
  parseCircleCardPlatformOwnerEmails,
  resolveCircleCardPlatformOwnerDiagnostics
} from "./platform-owner-control";

describe("Circle Card platform owner control centre", () => {
  it("parses configured owner email allowlists", () => {
    expect(parseCircleCardPlatformOwnerEmails("Owner@Example.com, second@example.com ")).toEqual([
      "owner@example.com",
      "second@example.com"
    ]);
  });

  it("keeps the control centre away from normal members", () => {
    expect(isCircleCardPlatformOwner({ role: "MEMBER", email: "owner@example.com" }, "")).toBe(false);
  });

  it("requires an owner allowlist even for admins", () => {
    expect(isCircleCardPlatformOwner({ role: "ADMIN", email: "owner@example.com" }, "")).toBe(false);
  });

  it("supports an exact platform owner email allowlist match", () => {
    expect(
      isCircleCardPlatformOwner(
        { role: "ADMIN", email: "owner@example.com" },
        "owner@example.com,founder@example.com"
      )
    ).toBe(true);
  });

  it("supports a case-insensitive platform owner email allowlist match", () => {
    expect(
      isCircleCardPlatformOwner(
        { role: "ADMIN", email: " Owner@Example.com " },
        "owner@example.com,founder@example.com"
      )
    ).toBe(true);
  });

  it("supports the admin access helper match", () => {
    expect(hasCircleCardPlatformOwnerAdminAccess({ role: "ADMIN" })).toBe(true);
    expect(
      isCircleCardPlatformOwner(
        { role: "MEMBER", email: "owner@example.com", hasAdminAccess: true },
        "owner@example.com"
      )
    ).toBe(true);
  });

  it("keeps non-owner admins hidden", () => {
    expect(
      isCircleCardPlatformOwner(
        { role: "ADMIN", email: "admin@example.com" },
        "owner@example.com,founder@example.com"
      )
    ).toBe(false);
  });

  it("reports safe owner diagnostics", () => {
    expect(
      resolveCircleCardPlatformOwnerDiagnostics(
        { role: "ADMIN", email: "admin@example.com" },
        "owner@example.com"
      )
    ).toEqual({
      currentUserEmail: "admin@example.com",
      currentUserRole: "ADMIN",
      ownerEmailAllowlistPresent: true,
      hasAdminAccess: true,
      platformOwnerResolved: false
    });
  });

  it("registers future modules and roadmap items as foundation data", () => {
    expect(CIRCLE_CARD_CONTROL_CENTRE_DEVELOPMENT_MODULES).toHaveLength(7);
    expect(CIRCLE_CARD_CONTROL_CENTRE_ROADMAP.some((item) => item.status === "completed")).toBe(true);
    expect(CIRCLE_CARD_CONTROL_CENTRE_ROADMAP.some((item) => item.status === "pending")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  CIRCLE_CARD_CONTROL_CENTRE_DEVELOPMENT_MODULES,
  CIRCLE_CARD_CONTROL_CENTRE_ROADMAP,
  buildCircleCardPlatformOwnerLaunchChecklist,
  hasCircleCardPlatformOwnerAdminAccess,
  isCircleCardPlatformOwner,
  parseCircleCardPlatformOwnerEmails,
  resolveCircleCardPlatformOwnerCardTypePreviewMode,
  resolveCircleCardPlatformOwnerFeatureMatrix,
  resolveCircleCardPlatformOwnerPreviewEntitlement,
  resolveCircleCardPlatformOwnerPreviewMode,
  resolveCircleCardPlatformOwnerSandboxMode,
  resolveCircleCardPlatformOwnerDiagnostics
} from "./platform-owner-control";
import { resolveCircleCardEntitlement } from "./permissions";

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

  it("resolves supported platform owner preview modes", () => {
    expect(resolveCircleCardPlatformOwnerPreviewMode("free")).toBe("free");
    expect(resolveCircleCardPlatformOwnerPreviewMode("pro")).toBe("pro");
    expect(resolveCircleCardPlatformOwnerPreviewMode("teams")).toBe("teams");
    expect(resolveCircleCardPlatformOwnerPreviewMode("bcn-included-pro")).toBe("bcn-included-pro");
    expect(resolveCircleCardPlatformOwnerPreviewMode("bad-value")).toBe("platform-owner");
  });

  it("resolves supported platform owner card type preview modes", () => {
    expect(resolveCircleCardPlatformOwnerCardTypePreviewMode("personal")).toBe("personal");
    expect(resolveCircleCardPlatformOwnerCardTypePreviewMode("business")).toBe("business");
    expect(resolveCircleCardPlatformOwnerCardTypePreviewMode("creator")).toBe("creator");
    expect(resolveCircleCardPlatformOwnerCardTypePreviewMode("team")).toBe("team");
    expect(resolveCircleCardPlatformOwnerCardTypePreviewMode("bad-value")).toBe("personal");
  });

  it("resolves supported platform owner sandbox modes", () => {
    expect(resolveCircleCardPlatformOwnerSandboxMode("off")).toBe("off");
    expect(resolveCircleCardPlatformOwnerSandboxMode("on")).toBe("on");
    expect(resolveCircleCardPlatformOwnerSandboxMode("bad-value")).toBe("off");
  });

  it("maps platform owner preview modes to UI-only entitlements", () => {
    const ownerEntitlement = resolveCircleCardEntitlement({ role: "ADMIN" });

    expect(
      resolveCircleCardPlatformOwnerPreviewEntitlement("free", ownerEntitlement)
    ).toMatchObject({ plan: "FREE", source: "FREE" });
    expect(
      resolveCircleCardPlatformOwnerPreviewEntitlement("pro", ownerEntitlement)
    ).toMatchObject({ plan: "PRO", source: "PRO_SUBSCRIPTION" });
    expect(
      resolveCircleCardPlatformOwnerPreviewEntitlement("teams", ownerEntitlement)
    ).toMatchObject({ plan: "TEAMS", source: "TEAMS_SUBSCRIPTION" });
    expect(
      resolveCircleCardPlatformOwnerPreviewEntitlement("bcn-included-pro", ownerEntitlement)
    ).toMatchObject({ plan: "PRO", source: "BCN_INCLUDED_PRO" });
    expect(
      resolveCircleCardPlatformOwnerPreviewEntitlement("platform-owner", ownerEntitlement)
    ).toBe(ownerEntitlement);
  });

  it("maps card type feature matrix statuses for membership preview combinations", () => {
    const freeBusiness = resolveCircleCardPlatformOwnerFeatureMatrix({
      membershipMode: "free",
      cardTypeMode: "business"
    });
    const proBusiness = resolveCircleCardPlatformOwnerFeatureMatrix({
      membershipMode: "pro",
      cardTypeMode: "business"
    });
    const teamsTeam = resolveCircleCardPlatformOwnerFeatureMatrix({
      membershipMode: "teams",
      cardTypeMode: "team"
    });
    const platformOwnerCreator = resolveCircleCardPlatformOwnerFeatureMatrix({
      membershipMode: "platform-owner",
      cardTypeMode: "creator"
    });

    expect(freeBusiness.find((row) => row.id === "business-card")?.status).toBe("Requires Pro");
    expect(proBusiness.find((row) => row.id === "business-card")?.status).toBe("Available");
    expect(teamsTeam.find((row) => row.id === "team-card")?.status).toBe("Available");
    expect(teamsTeam.find((row) => row.id === "team-analytics")?.status).toBe("Available");
    expect(platformOwnerCreator.every((row) => row.status === "Platform Preview")).toBe(true);
  });

  it("builds an owner-only launch checklist with safe billing readiness states", () => {
    const checklist = buildCircleCardPlatformOwnerLaunchChecklist({
      billingReadiness: {
        billingEnabled: false,
        pro: {
          monthlyPriceConfigured: false,
          annualPriceConfigured: false
        },
        teams: {
          monthlyPriceConfigured: false,
          annualPriceConfigured: false
        }
      },
      platformOwnerDiagnostics: {
        currentUserEmail: "owner@example.com",
        currentUserRole: "ADMIN",
        ownerEmailAllowlistPresent: true,
        hasAdminAccess: true,
        platformOwnerResolved: true
      },
      appUrlConfigured: true,
      nextAuthUrlConfigured: true,
      cronSecretConfigured: true,
      resendConfigured: true,
      analyticsConfigured: true,
      cardAvailable: true,
      publicCardHref: "/card/owner",
      referralCentreHref: "/dashboard/circle-card?section=referrals#referral-centre",
      adminHref: "/admin/circle-card",
      proHref: "/circle-card/pro",
      teamsHref: "/circle-card/teams",
      walletContactCount: 2,
      discoverCandidateCount: 1,
      notificationCount: 3
    });
    const billingGroup = checklist.find((group) => group.id === "billing-readiness");

    expect(checklist).toHaveLength(5);
    expect(billingGroup?.items.find((item) => item.id === "circle-card-billing-flag")).toMatchObject({
      status: "ready",
      message: "CIRCLE_CARD_BILLING_ENABLED is false. Billing is safely disabled."
    });
    expect(billingGroup?.items.find((item) => item.id === "stripe-pro-price-ids")).toMatchObject({
      status: "future",
      message: "Pro price IDs missing. Billing is disabled, so paid checkout remains inactive."
    });
  });

  it("registers future modules and roadmap items as foundation data", () => {
    expect(CIRCLE_CARD_CONTROL_CENTRE_DEVELOPMENT_MODULES).toHaveLength(7);
    expect(CIRCLE_CARD_CONTROL_CENTRE_ROADMAP.some((item) => item.status === "completed")).toBe(true);
    expect(CIRCLE_CARD_CONTROL_CENTRE_ROADMAP.some((item) => item.status === "pending")).toBe(true);
  });
});

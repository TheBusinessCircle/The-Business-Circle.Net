import { describe, expect, it } from "vitest";
import {
  getCircleCardRoutes,
  isCircleCardDashboardPath,
  preferCircleCardRuntimePath,
  resolveCircleCardAuthReturnPath
} from "@/lib/circle-card/routes";

describe("Circle Card runtime routes", () => {
  it("preserves the existing BCN route surface", () => {
    expect(getCircleCardRoutes("bcn")).toEqual({
      landing: "/circle-card",
      pro: "/circle-card/pro",
      teams: "/circle-card/teams",
      communityStandards: "/circle-card/community-standards",
      dashboard: "/dashboard/circle-card",
      onboarding: "/dashboard/circle-card/onboarding",
      studio: "/dashboard/circle-card/studio",
      wallet: "/dashboard/circle-card/wallet",
      testimonial: "/dashboard/circle-card/testimonial"
    });
  });

  it("provides the clean standalone route surface", () => {
    expect(getCircleCardRoutes("circle-card")).toEqual({
      landing: "/",
      pro: "/pro",
      teams: "/teams",
      communityStandards: "/community-standards",
      dashboard: "/app",
      onboarding: "/app/onboarding",
      studio: "/app/studio",
      wallet: "/app/wallet",
      testimonial: "/app/testimonial"
    });
  });

  it("maps legacy Circle Card links only for the standalone runtime", () => {
    expect(
      preferCircleCardRuntimePath(
        "/dashboard/circle-card?section=referrals#referral-centre",
        "circle-card"
      )
    ).toBe("/app?section=referrals#referral-centre");
    expect(preferCircleCardRuntimePath("/circle-card/pro?source=dashboard", "circle-card"))
      .toBe("/pro?source=dashboard");
    expect(preferCircleCardRuntimePath("/dashboard/circle-card/studio", "bcn"))
      .toBe("/dashboard/circle-card/studio");
  });

  it("recognises both legacy and clean authenticated route families", () => {
    expect(isCircleCardDashboardPath("/dashboard/circle-card/wallet")).toBe(true);
    expect(isCircleCardDashboardPath("/app/wallet")).toBe(true);
    expect(isCircleCardDashboardPath("/dashboard")).toBe(false);
  });

  it("allows only Circle Card destinations after standalone authentication", () => {
    expect(
      resolveCircleCardAuthReturnPath(
        "/dashboard/circle-card?section=settings",
        "circle-card"
      )
    ).toBe("/app?section=settings");
    expect(resolveCircleCardAuthReturnPath("/circle-card/pro?source=dashboard", "circle-card"))
      .toBe("/pro?source=dashboard");
    expect(resolveCircleCardAuthReturnPath("/card/example?spin=return", "circle-card"))
      .toBe("/card/example?spin=return");
  });

  it.each([
    "/admin",
    "/membership",
    "/messages",
    "//attacker.example",
    "https://attacker.example",
    "/%2f%2fattacker.example",
    "/app/%255c%255cattacker.example",
    "/app/../../admin",
    "/app#settings"
  ])(
    "falls back to /app for disallowed standalone auth return %s",
    (path) => {
      expect(resolveCircleCardAuthReturnPath(path, "circle-card")).toBe("/app");
    }
  );

  it("preserves valid BCN relative return paths", () => {
    expect(resolveCircleCardAuthReturnPath("/dashboard?notice=welcome", "bcn"))
      .toBe("/dashboard?notice=welcome");
  });
});

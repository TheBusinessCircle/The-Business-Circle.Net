import { describe, expect, it } from "vitest";
import {
  buildJoinConfirmationHref,
  buildMembershipDecisionHref,
  shouldUseMobileJoin
} from "@/lib/join/routing";

const tierCases = [
  ["foundation", "FOUNDATION"],
  ["inner-circle", "INNER_CIRCLE"],
  ["core", "CORE"]
] as const;

describe("public to paid join routing", () => {
  it.each(tierCases)("preserves %s monthly and annual membership CTA choices", (slug, tier) => {
    expect(
      buildMembershipDecisionHref({
        tier,
        period: "monthly",
        from: "/",
        invite: " bcn-test "
      })
    ).toBe(`/membership?from=%2F&tier=${slug}&period=monthly&invite=BCN-TEST&auth=register`);

    expect(
      buildJoinConfirmationHref({
        tier,
        period: "annual",
        from: "/membership",
        invite: " bcn-test "
      })
    ).toBe(
      `/join?from=%2Fmembership&tier=${slug}&period=annual&invite=BCN-TEST&auth=register`
    );
  });

  it("keeps direct join confirmation pointed at /join with tier, billing, invite, and safe from", () => {
    expect(
      buildJoinConfirmationHref({
        tier: "CORE",
        period: "monthly",
        billing: "cancelled",
        invite: "core-123",
        from: "https://evil.example/steal"
      })
    ).toBe("/join?tier=core&period=monthly&billing=cancelled&invite=CORE-123&auth=register");
  });

  it("preserves the audit source marker on membership selection links only when expected", () => {
    expect(
      buildMembershipDecisionHref({
        tier: "FOUNDATION",
        period: "monthly",
        source: "audit"
      })
    ).toBe("/membership?tier=foundation&period=monthly&source=audit");

    expect(
      buildMembershipDecisionHref({
        tier: "CORE",
        period: "annual",
        source: "newsletter"
      })
    ).toBe("/membership?tier=core&period=annual");
  });

  it("uses mobile join only for mobile-sized or mobile user-agent requests", () => {
    expect(
      shouldUseMobileJoin(
        new Headers({
          "sec-ch-viewport-width": "390"
        })
      )
    ).toBe(true);

    expect(
      shouldUseMobileJoin(
        new Headers({
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
      )
    ).toBe(false);
  });
});

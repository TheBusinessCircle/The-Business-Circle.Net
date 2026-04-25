import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MembershipTier } from "@prisma/client";
import {
  JoinCheckoutPrep,
  resolveInitialJoinStep,
  transitionJoinStep
} from "@/components/auth/join-checkout-prep";
import type { FoundingOfferTierSnapshot } from "@/types";

(globalThis as { React?: typeof React }).React = React;

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => createElement("a", { href, className }, children)
}));

function createOfferSnapshot(
  tier: MembershipTier,
  overrides: Partial<FoundingOfferTierSnapshot> = {}
): FoundingOfferTierSnapshot {
  return {
    tier,
    badgeLabel: `${tier} badge`,
    offerLabel: `${tier} offer`,
    foundingPrice: 30,
    foundingAnnualPrice: 300,
    standardPrice: 60,
    standardAnnualPrice: 600,
    limit: 50,
    claimed: 12,
    remaining: 38,
    available: true,
    statusLabel: "Available",
    launchClosedLabel: "Founder allocation closed.",
    ...overrides
  };
}

describe("join checkout prep", () => {
  const foundingOfferByTier = {
    FOUNDATION: createOfferSnapshot("FOUNDATION"),
    INNER_CIRCLE: createOfferSnapshot("INNER_CIRCLE"),
    CORE: createOfferSnapshot("CORE")
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a simple two-step transition contract for continue and back", () => {
    expect(resolveInitialJoinStep(false)).toBe("tier");
    expect(resolveInitialJoinStep(true)).toBe("account");
    expect(transitionJoinStep("continue")).toBe("account");
    expect(transitionJoinStep("back")).toBe("tier");
  });

  it("renders the tier detail panel before account setup starts", () => {
    const html = renderToStaticMarkup(
      React.createElement(JoinCheckoutPrep, {
        initialSelectedTier: "FOUNDATION",
        initialBillingInterval: "monthly",
        initialShowAccountSetup: false,
        isAuthenticated: false,
        hasActiveSubscription: false,
        currentTier: "FOUNDATION",
        currentBillingInterval: null,
        foundingOfferByTier
      })
    );

    expect(html).toContain("Step 1 of 2");
    expect(html).toContain("Continue To Account Setup");
    expect(html).not.toContain("Secure account setup");
  });

  it("renders the account setup panel in place with the selected tier preserved", () => {
    const html = renderToStaticMarkup(
      React.createElement(JoinCheckoutPrep, {
        initialSelectedTier: "INNER_CIRCLE",
        initialBillingInterval: "annual",
        initialShowAccountSetup: true,
        isAuthenticated: false,
        hasActiveSubscription: false,
        currentTier: "FOUNDATION",
        currentBillingInterval: null,
        foundingOfferByTier
      })
    );

    expect(html).toContain("Secure account setup");
    expect(html).toContain("Back to membership selection");
    expect(html).toContain("Inner Circle selected");
    expect(html).toContain("Continue to Secure Checkout");
  });
});

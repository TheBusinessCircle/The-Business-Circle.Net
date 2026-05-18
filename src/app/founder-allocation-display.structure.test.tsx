import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MembershipTier } from "@prisma/client";
import { JoinCheckoutPrep } from "@/components/auth/join-checkout-prep";
import { MembershipGuidedSelector } from "@/components/public/membership-guided-selector";
import { getFounderAllocationLine } from "@/lib/founding-offer-copy";
import type { FoundingOfferTierSnapshot } from "@/types";

(globalThis as { React?: typeof React }).React = React;

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    onClick
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => createElement("a", { href, className, onClick }, children)
}));

vi.mock("framer-motion", () => {
  const passthrough = (tag: string) =>
    function MotionComponent({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) {
      const passthroughProps = { ...props };

      for (const motionProp of [
        "initial",
        "animate",
        "exit",
        "transition",
        "whileHover",
        "whileTap",
        "layout"
      ]) {
        delete passthroughProps[motionProp];
      }

      return createElement(tag, passthroughProps, children);
    };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => createElement(React.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_target, prop) => passthrough(String(prop))
      }
    ),
    useReducedMotion: () => true
  };
});

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

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

const foundingOfferByTier: Record<MembershipTier, FoundingOfferTierSnapshot> = {
  FOUNDATION: createOfferSnapshot("FOUNDATION", {
    limit: 50,
    claimed: 0,
    remaining: 50
  }),
  INNER_CIRCLE: createOfferSnapshot("INNER_CIRCLE", {
    limit: 24,
    claimed: 20,
    remaining: 4
  }),
  CORE: createOfferSnapshot("CORE", {
    limit: 12,
    claimed: 12,
    remaining: 0,
    available: false,
    statusLabel: "Sold out"
  })
};

describe("founder allocation display drift", () => {
  it("uses the same allocation line for each tier on membership and join surfaces", () => {
    for (const tier of Object.keys(foundingOfferByTier) as MembershipTier[]) {
      const expectedLine = getFounderAllocationLine(foundingOfferByTier[tier]);
      const membershipMarkup = renderToStaticMarkup(
        createElement(MembershipGuidedSelector, {
          initialSelectedTier: tier,
          initialBillingInterval: "monthly",
          foundingOfferByTier,
          faqTitle: "Questions",
          faqDescription: "Useful answers.",
          faqItems: []
        })
      );
      const joinMarkup = renderToStaticMarkup(
        createElement(JoinCheckoutPrep, {
          initialSelectedTier: tier,
          initialBillingInterval: "monthly",
          initialShowAccountSetup: false,
          isAuthenticated: false,
          hasActiveSubscription: false,
          currentTier: "FOUNDATION",
          currentBillingInterval: null,
          foundingOfferByTier
        })
      );

      expect(membershipMarkup).toContain(expectedLine);
      expect(joinMarkup).toContain(expectedLine);
    }
  });

  it("keeps public founder allocation route data on the server snapshot helper", () => {
    const membershipPage = readSource("src/app/(public)/membership/page.tsx");
    const joinPage = readSource("src/app/(auth)/join/page.tsx");
    const joinDesktopPage = readSource("src/app/(auth)/join-desktop/page.tsx");
    const joinMobilePage = readSource("src/app/(auth)/join-mobile/page.tsx");

    expect(membershipPage).toContain("getFoundingOfferByTier(foundingOffer)");
    expect(joinPage).toContain("getFoundingOfferByTier(foundingOffer)");
    expect(joinDesktopPage).not.toMatch(/founder place|founder allocation/i);
    expect(joinMobilePage).not.toMatch(/founder place|founder allocation/i);
  });
});

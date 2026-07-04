import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(
  "src/app/(member)/dashboard/circle-card/page.tsx",
  "utf8"
);
const router = readFileSync(
  "src/components/circle-card/circle-card-section-router.tsx",
  "utf8"
);
const currentCard = readFileSync(
  "src/components/circle-card/circle-card-current-card-selector.tsx",
  "utf8"
);

describe("Circle Card workspace navigation", () => {
  it("keeps one prominent QR action and the compact action hub labels", () => {
    expect(dashboard).toContain("Circle Card Workspace");
    expect(dashboard).toContain("shadow-gold-soft sm:w-44");
    for (const label of ["Public Card", "Edit", "Wallet", "Referrals", "Analytics", "Share", "Settings"]) {
      expect(dashboard).toContain(label);
    }
  });

  it("maps every section controller item to a concrete workspace target", () => {
    for (const target of [
      "circle-card-home",
      "current-card",
      "wallet",
      "business-card-builder",
      "referral-centre",
      "share-assets",
      "circle-card-settings"
    ]) {
      expect(dashboard).toContain(`"${target}"`);
    }
    expect(router).toContain('"referrals"');
    expect(router).toContain("circle-card-open-section");
    expect(router).toContain("behavior: window.matchMedia");
  });

  it("keeps Home and Current Card open while Owner Tools stays closed", () => {
    expect(dashboard).toMatch(/id="circle-card-home"[\s\S]*?defaultOpen/);
    expect(currentCard).toMatch(/id="current-card"[\s\S]*?defaultOpen/);
    expect(dashboard).toContain('id="owner-tools"');
    expect(dashboard).not.toContain('id="owner-tools" open');
  });

  it("uses a wrapped mobile controller without horizontal scrolling", () => {
    expect(dashboard).toContain("grid grid-cols-4 gap-1.5 sm:grid-cols-7");
    expect(dashboard).not.toContain('aria-label="Circle Card sections"\n        className="sticky top-0');
  });
});

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
const memberLayout = readFileSync("src/app/(member)/layout.tsx", "utf8");

describe("Circle Card workspace navigation", () => {
  it("keeps one prominent QR action and the compact action hub labels", () => {
    expect(dashboard).toContain('<span className="hidden sm:inline">Circle Card</span>');
    expect(dashboard).toContain("shadow-gold-soft sm:w-44");
    for (const label of ["Public Card", "Studio", "Wallet", "Trust", "Referrals", "Settings"]) {
      expect(dashboard).toContain(label);
    }
  });

  it("maps every section controller item to a concrete workspace target", () => {
    for (const target of [
      "circle-card-home",
      "my-cards",
      "circle-studio",
      "wallet",
      "circle-trust",
      "business-card-builder",
      "creator-pro-studio",
      "referral-centre",
      "analytics",
      "circle-card-settings"
    ]) {
      expect(dashboard).toContain(`"${target}"`);
    }
    expect(router).toContain('"referrals"');
    expect(router).toContain("circle-card-open-section");
    expect(router).toContain("behavior: window.matchMedia");
  });

  it("keeps collapsible content available while Owner Tools stays closed", () => {
    expect(dashboard).toMatch(/id="circle-card-home"[\s\S]*?defaultOpen/);
    expect(currentCard).toMatch(/id="current-card"[\s\S]*?defaultOpen/);
    expect(dashboard).toContain('id="owner-tools"');
    expect(dashboard).not.toContain('id="owner-tools" open');
  });

  it("uses a wrapped mobile controller without horizontal scrolling", () => {
    expect(dashboard).toContain("grid grid-cols-5 gap-1.5 sm:grid-cols-10");
    expect(dashboard).not.toContain('aria-label="Circle Card sections"\n        className="sticky top-0');
  });

  it("uses branded member navigation language without changing routes", () => {
    for (const label of ["Your Cards", "Studio", "Wallet", "Trust", "Insights", "Referrals", "Settings"]) {
      expect(memberLayout).toContain(`label: "${label}"`);
    }
    expect(memberLayout).toContain('const workspaceTitle = showCircleCardShell ? "Circle Card"');
    expect(memberLayout).not.toContain('label: "My Circle Card"');
  });
});

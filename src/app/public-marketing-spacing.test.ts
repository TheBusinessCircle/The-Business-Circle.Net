import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_CONFIG } from "@/config/site";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const targetPages = [
  ["home", "src/app/(public)/page.tsx"],
  ["about", "src/app/(public)/about/page.tsx"],
  ["membership", "src/app/(public)/membership/page.tsx"],
  ["founder", "src/app/(public)/founder/page.tsx"],
  ["insights", "src/app/(public)/insights/page.tsx"],
  ["contact", "src/app/(public)/contact/page.tsx"]
] as const;

describe("public marketing spacing system", () => {
  it("keeps shared spacing utilities available for public pages", () => {
    const globals = readSource("src/app/globals.css");

    expect(globals).toContain(".public-page-stack");
    expect(globals).toContain(".public-content-stack");
    expect(globals).toContain(".public-section");
    expect(globals).toContain(".public-hero-spacing");
    expect(globals).toContain(".public-hero-spacing-tight");
    expect(globals).toContain(".public-page-top");
    expect(globals).toContain(".public-visual-frame");
    expect(globals).toContain(".public-page-top + *");
    expect(globals).toContain(":not(script):not(style):not(template):not([hidden])");
    expect(globals).not.toContain(".public-page-stack {\n    @apply w-full min-w-0 space-y");
    expect(globals).not.toContain(".public-content-stack {\n    @apply w-full min-w-0 space-y");
  });

  it("keeps invisible JSON-LD scripts from creating top visual dead space", () => {
    const pagesWithJsonLdBeforeVisual = [
      readSource("src/app/(public)/page.tsx"),
      readSource("src/app/(public)/about/page.tsx"),
      readSource("src/app/(public)/membership/page.tsx"),
      readSource("src/app/(public)/founder/page.tsx")
    ];

    for (const source of pagesWithJsonLdBeforeVisual) {
      expect(source.indexOf("<JsonLd")).toBeLessThan(source.indexOf("<PublicTopVisual"));
    }

    const globals = readSource("src/app/globals.css");

    expect(globals).toContain(".public-page-stack > :where(:not(script):not(style):not(template):not([hidden])) ~ :where(:not(script):not(style):not(template):not([hidden]))");
  });

  it.each(targetPages)("keeps the %s page on the shared public stack", (_, path) => {
    expect(readSource(path)).toContain("public-page-stack");
  });

  it("keeps shared hero, CTA, FAQ, and top visual components on tighter defaults", () => {
    const hero = readSource("src/components/public/hero-section.tsx");
    const cta = readSource("src/components/public/cta-section.tsx");
    const faq = readSource("src/components/public/faq-section.tsx");
    const topVisual = readSource("src/components/visual-media/public-top-visual.tsx");
    const pageHeroImage = readSource("src/components/visual-media/page-hero-image.tsx");
    const publicShell = readSource("src/components/public/public-site-shell.tsx");

    expect(hero).toContain("public-hero-spacing");
    expect(cta).toContain("public-hero-spacing");
    expect(faq).toContain("public-section");
    expect(topVisual).toContain("public-page-top public-visual-shell");
    expect(pageHeroImage).toContain("public-visual-frame");
    expect(publicShell).toContain("pt-2");

    for (const source of [hero, cta, topVisual, pageHeroImage]) {
      expect(source).not.toContain("py-28");
      expect(source).not.toContain("lg:py-36");
      expect(source).not.toContain("min-h-[36rem]");
      expect(source).not.toContain("min-h-[28rem]");
    }
  });

  it("keeps membership tier and billing handoff intact while the layout tightens", () => {
    const membershipPage = readSource("src/app/(public)/membership/page.tsx");
    const membershipSelector = readSource("src/components/public/membership-guided-selector.tsx");

    expect(membershipPage).toContain("resolveMembershipTierInput");
    expect(membershipPage).toContain("resolveMembershipBillingInterval");
    expect(membershipSelector).toContain("buildMembershipDecisionHref");
    expect(membershipSelector).toContain("buildJoinConfirmationHref");
    expect(membershipSelector).toContain("updateMembershipUrl(selectionHref)");
  });

  it("keeps the public navigation routes available", () => {
    expect(SITE_CONFIG.publicNavigation.map((item) => item.href)).toEqual([
      "/",
      "/about",
      "/membership",
      "/founder",
      "/insights",
      "/contact"
    ]);
  });
});

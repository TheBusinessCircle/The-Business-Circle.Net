import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const publicProfile = readFileSync(
  join(root, "src/components/circle-card/public-circle-card-profile.tsx"),
  "utf8"
);
const trustPanel = readFileSync(
  join(root, "src/components/circle-card/public-circle-trust-panel.tsx"),
  "utf8"
);
const qrPanel = readFileSync(
  join(root, "src/components/circle-card/circle-card-qr-panel.tsx"),
  "utf8"
);
const publicThemeClasses = readFileSync(
  join(root, "src/lib/circle-card/public-theme-classes.ts"),
  "utf8"
);
const trustPage = readFileSync(
  join(root, "src/app/(public)/card/[slug]/trust/page.tsx"),
  "utf8"
);
const themeResolver = readFileSync(join(root, "src/lib/circle-card/theme.ts"), "utf8");

describe("public Circle Card Studio theme contract", () => {
  it("puts Studio canary data attributes on every public layout root", () => {
    expect(themeResolver).toContain('"data-cc-identity"');
    expect(themeResolver).toContain('"data-cc-hero"');
    expect(themeResolver).toContain('"data-cc-button"');
    expect(themeResolver).toContain('"data-cc-surface"');
    expect(themeResolver).toContain('"data-cc-profile"');
    expect(themeResolver).toContain('"data-cc-background"');
    expect(themeResolver).toContain('"data-cc-trust"');
    expect(themeResolver).toContain('"data-cc-links"');
    expect(publicProfile.match(/{...circleStudioAttributes}/g)).toHaveLength(3);
    expect(publicProfile.match(/circleCardPublicThemeClasses\.backgroundShell/g)).toHaveLength(3);
  });

  it("themes Personal, Creator and Business hero/action/profile/social surfaces", () => {
    expect(publicProfile).toContain('if (publicLayout === "CLASSIC")');
    expect(publicProfile).toContain('if (publicLayout === "CREATOR")');
    expect(publicProfile).toContain("circleCardPublicThemeClasses.heroShell");
    expect(publicProfile).toContain("circleCardPublicThemeClasses.profileFrame");
    expect(publicProfile).toContain("circleCardPublicThemeClasses.actionPanel");
    expect(publicProfile).toContain("circleCardPublicThemeClasses.socialPill");
    expect(publicProfile).toContain("circleCardPublicThemeClasses.quickConnectCard");
  });

  it("themes QR/share, Trust, links, icons and section cards from shared variables", () => {
    expect(qrPanel).toContain("circleCardPublicThemeClasses.qrPanel");
    expect(trustPanel).toContain("circleCardPublicThemeClasses.trustPanel");
    expect(publicProfile).toContain("circleCardPublicThemeClasses.sectionCard");
    expect(publicProfile).toContain("circleCardPublicThemeClasses.linkCard");
    expect(publicProfile).toContain("circleCardPublicThemeClasses.iconSurface");
    expect(publicThemeClasses).toContain("bg-[var(--cc-theme-trust-bg)]");
    expect(publicThemeClasses).toContain("bg-[var(--cc-theme-qr-bg)]");
    expect(publicThemeClasses).toContain("bg-[var(--cc-theme-link-bg)]");
  });

  it("does not keep fixed cyan or default dark panels in themed public sections", () => {
    const themedPublicSections = [publicProfile, trustPanel, qrPanel].join("\n");
    expect(themedPublicSections).not.toMatch(/border-cyan|bg-cyan|text-cyan/);
    expect(themedPublicSections).not.toContain("bg-[#071126]");
    expect(themedPublicSections).not.toContain("bg-[#030813]");
    expect(themedPublicSections).not.toContain("rgba(8,19,43");
  });

  it("carries uploaded background image variables to the public root", () => {
    expect(publicThemeClasses).toContain("[background:var(--cc-theme-page-bg)]");
    expect(themeResolver).toContain("--cc-bg-image");
    expect(themeResolver).toContain("backgroundImageUrl");
    expect(themeResolver).toContain('data-cc-fine-background');
  });

  it("applies the same outer background shell to Circle Trust", () => {
    expect(trustPage).toContain("resolveCircleCardLiveTheme(card)");
    expect(trustPage).toContain("circleCardPublicThemeClasses.backgroundShell");
    expect(trustPage).toContain("{...liveTheme.attributes}");
    expect(trustPage).not.toContain("bg-[image:var(--cc-theme-page-bg)]");
  });
});

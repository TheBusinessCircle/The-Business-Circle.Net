import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const manager = readFileSync(join(root, "src/components/circle-card/circle-card-brand-partnerships-manager.tsx"), "utf8");
const dashboard = readFileSync(join(root, "src/app/(member)/dashboard/circle-card/page.tsx"), "utf8");
const publicProfile = readFileSync(join(root, "src/components/circle-card/public-circle-card-profile.tsx"), "utf8");

describe("Creator Brand Partnerships structure", () => {
  it("uses a dedicated Creator Studio collection with inline CRUD", () => {
    expect(dashboard).toContain('const brandPartnershipsHref = cardHref("creator-brand-partnerships")');
    expect(dashboard).toContain("<CircleCardBrandPartnershipsManager");
    expect(manager).toContain('id="creator-brand-partnerships"');
    expect(manager).toContain("upsertCircleCardBrandPartnershipInlineAction");
    expect(manager).toContain("toggleCircleCardBrandPartnershipInlineAction");
    expect(manager).toContain("deleteCircleCardBrandPartnershipInlineAction");
  });

  it("reuses the image uploader and exposes Free and Pro limits", () => {
    expect(manager).toContain("CircleCardImageUploadField");
    expect(manager).toContain("Unlock unlimited Brand Partnerships with Creator Pro.");
    expect(dashboard).toContain("CIRCLE_CARD_BRAND_PARTNERSHIP_FREE_LIMIT");
    expect(dashboard).toContain("CIRCLE_CARD_BRAND_PARTNERSHIP_PRO_LIMIT");
  });

  it("renders previous collaborations or the Media Kit interest fallback", () => {
    expect(publicProfile).toContain("Brands I&apos;ve Worked With");
    expect(publicProfile).toContain("Visit Campaign");
    expect(publicProfile).toContain("Open to Brand Partnerships");
    expect(publicProfile).toContain("card.mediaKit?.whatICreate");
  });
});

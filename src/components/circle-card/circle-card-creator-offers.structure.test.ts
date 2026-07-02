import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const actions = readFileSync(join(root, "src/actions/circle-card.actions.ts"), "utf8");
const manager = readFileSync(join(root, "src/components/circle-card/circle-card-creator-offers-manager.tsx"), "utf8");
const dashboard = readFileSync(join(root, "src/app/(member)/dashboard/circle-card/page.tsx"), "utf8");
const publicProfile = readFileSync(join(root, "src/components/circle-card/public-circle-card-profile.tsx"), "utf8");
const publicService = readFileSync(join(root, "src/server/circle-card/public-card.service.ts"), "utf8");

describe("Creator Offers structure", () => {
  it("uses a collapsed Creator Studio collection with inline CRUD and its own anchor", () => {
    expect(dashboard).toContain('const creatorOffersHref = cardHref("creator-offers")');
    expect(dashboard).toContain("<CircleCardCreatorOffersManager");
    expect(manager).toContain('id="creator-offers"');
    expect(manager).toContain("<details data-circle-card-module-details");
    expect(manager).not.toContain("<details open");
    expect(manager).toContain("upsertCircleCardCreatorOfferInlineAction");
    expect(manager).toContain("toggleCircleCardCreatorOfferInlineAction");
    expect(manager).toContain("deleteCircleCardCreatorOfferInlineAction");
  });

  it("reuses image uploads and enforces Free and Pro limits server-side", () => {
    expect(manager).toContain("CircleCardImageUploadField");
    expect(manager).toContain('uploadKind="gallery-image"');
    expect(manager).toContain("Unlock unlimited Creator Offers with Creator Pro.");
    expect(actions).toContain("CIRCLE_CARD_CREATOR_OFFER_FREE_LIMIT");
    expect(actions).toContain("CIRCLE_CARD_CREATOR_OFFER_PRO_LIMIT");
    expect(actions).toContain("if (existingIndex < 0 && offers.length >= itemLimit)");
  });

  it("renders a Creator-only public section with tracked CTAs and lazy images", () => {
    expect(publicService).toContain("visibleCircleCardCreatorOffers({");
    expect(publicProfile).toContain('card.cardType === "CREATOR" && card.creatorOffers.length');
    expect(publicProfile).toContain("Support My Work");
    expect(publicProfile).toContain('loading="lazy"');
    expect(publicProfile).toContain('source: "creator_offer"');
  });

  it("keeps duplicate and reorder controls explicitly out of scope", () => {
    expect(manager).toContain("Duplicate — Coming Soon");
    expect(manager).toContain("Reorder — Coming Soon");
  });
});

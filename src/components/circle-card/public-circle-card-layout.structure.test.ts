import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const publicService = readFileSync(
  join(root, "src/server/circle-card/public-card.service.ts"),
  "utf8"
);
const publicProfile = readFileSync(
  join(root, "src/components/circle-card/public-circle-card-profile.tsx"),
  "utf8"
);
const dashboard = readFileSync(
  join(root, "src/app/(member)/dashboard/circle-card/page.tsx"),
  "utf8"
);

describe("public Circle Card layout wiring", () => {
  it("carries persisted cardType from Prisma into the public DTO", () => {
    expect(publicService).toContain("cardType: true");
    expect(publicService).toContain("cardType: card.cardType");
  });

  it("selects every public layout from cardType rather than profileLayout or accountType", () => {
    expect(publicProfile).toContain("resolvePublicCircleCardLayout(card.cardType)");
    expect(publicProfile).toContain('if (publicLayout === "CLASSIC")');
    expect(publicProfile).toContain('if (publicLayout === "CREATOR")');
    expect(publicProfile).not.toContain('if (card.profileLayout === "CLASSIC")');
    expect(publicProfile).not.toContain('if (card.profileLayout === "CREATOR")');
  });

  it("keeps Business-only sections gated by persisted Business cardType", () => {
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !card.services.length');
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !card.products.length');
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !card.documents.length');
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !booking');
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !card.openingHours');
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !card.galleryItems.length');
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" || !card.reviews.length');
  });

  it("uses Creator cardType for Creator dashboard tooling", () => {
    expect(dashboard).toContain('isCreatorLayout={card.cardType === "CREATOR"}');
  });
});

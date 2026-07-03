import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const actions = readFileSync(join(root, "src/actions/circle-card.actions.ts"), "utf8");
const manager = readFileSync(
  join(root, "src/components/circle-card/circle-card-reviews-manager.tsx"),
  "utf8"
);
const publicProfile = readFileSync(
  join(root, "src/components/circle-card/public-circle-card-profile.tsx"),
  "utf8"
);
const publicService = readFileSync(
  join(root, "src/server/circle-card/public-card.service.ts"),
  "utf8"
);

describe("Circle Card reviews wiring", () => {
  it("uses inline card-scoped review mutations and revalidates public output", () => {
    expect(manager).toContain("event.preventDefault()");
    expect(manager).toContain("upsertCircleCardReviewItemInlineAction");
    expect(manager).toContain("toggleCircleCardReviewItemInlineAction");
    expect(manager).toContain("deleteCircleCardReviewItemInlineAction");
    expect(actions).toContain("writeCircleCardReviewItems(card.contentBlocks, nextReviews)");
    expect(actions).toContain("revalidateCircleCardPaths(card.slug)");
  });

  it("keeps the manager anchored and public rendering card-scoped", () => {
    expect(manager).toContain('id="business-card-reviews"');
    expect(publicService).toContain("visibleCircleCardReviewItems({");
    expect(publicProfile).toContain('card.cardType !== "BUSINESS" && card.cardType !== "CREATOR"');
    expect(publicProfile).toContain("<PublicCircleCardReviews");
  });
});

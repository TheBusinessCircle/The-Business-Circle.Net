import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const actions = readFileSync(join(root, "src/actions/circle-card.actions.ts"), "utf8");
const manager = readFileSync(join(root, "src/components/circle-card/circle-card-press-proof-manager.tsx"), "utf8");
const dashboard = readFileSync(join(root, "src/app/(member)/dashboard/circle-card/page.tsx"), "utf8");
const publicProfile = readFileSync(join(root, "src/components/circle-card/public-circle-card-profile.tsx"), "utf8");
const publicService = readFileSync(join(root, "src/server/circle-card/public-card.service.ts"), "utf8");

describe("Creator Press & Proof structure", () => {
  it("uses a collapsed Creator Studio collection with inline CRUD and its own anchor", () => {
    expect(dashboard).toContain('const pressProofHref = cardHref("creator-press-proof")');
    expect(dashboard).toContain("<CircleCardPressProofManager");
    expect(manager).toContain('id="creator-press-proof"');
    expect(manager).toContain("<details data-circle-card-module-details");
    expect(manager).not.toContain("<details open");
    expect(manager).toContain("upsertCircleCardPressProofItemInlineAction");
    expect(manager).toContain("toggleCircleCardPressProofItemInlineAction");
    expect(manager).toContain("deleteCircleCardPressProofItemInlineAction");
  });

  it("reuses image uploads and enforces Free and Pro limits server-side", () => {
    expect(manager).toContain("CircleCardImageUploadField");
    expect(manager).toContain('uploadKind="gallery-image"');
    expect(manager).toContain("Unlock unlimited Press & Proof with Creator Pro.");
    expect(actions).toContain("CIRCLE_CARD_PRESS_PROOF_FREE_LIMIT");
    expect(actions).toContain("CIRCLE_CARD_PRESS_PROOF_PRO_LIMIT");
    expect(actions).toContain("if (existingIndex < 0 && items.length >= itemLimit)");
  });

  it("renders Creator-only public proof with source CTAs and lazy images", () => {
    expect(publicService).toContain("visibleCircleCardPressProofItems({");
    expect(publicProfile).toContain('card.cardType === "CREATOR" && card.pressProofItems.length');
    expect(publicProfile).toContain("Proof &amp; Milestones");
    expect(publicProfile).toContain("View Source");
    expect(publicProfile).toContain('loading="lazy"');
    expect(publicProfile).toContain('source: "creator_press_proof"');
  });

  it("keeps duplicate and reorder controls explicitly out of scope", () => {
    expect(manager).toContain("Duplicate — Coming Soon");
    expect(manager).toContain("Reorder — Coming Soon");
  });
});

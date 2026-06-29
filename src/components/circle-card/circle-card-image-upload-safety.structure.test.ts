import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const uploadField = readFileSync(
  join(root, "src/components/circle-card/circle-card-image-upload-field.tsx"),
  "utf8"
);
const saveForm = readFileSync(
  join(root, "src/components/circle-card/circle-card-save-form.tsx"),
  "utf8"
);
const galleryManager = readFileSync(
  join(root, "src/components/circle-card/circle-card-gallery-manager.tsx"),
  "utf8"
);
const smartLinkManager = readFileSync(
  join(root, "src/components/circle-card/circle-card-smart-link-manager.tsx"),
  "utf8"
);
const dashboard = readFileSync(
  join(root, "src/app/(member)/dashboard/circle-card/page.tsx"),
  "utf8"
);
const actions = readFileSync(join(root, "src/actions/circle-card.actions.ts"), "utf8");

describe("Circle Card image upload safety", () => {
  it("uploads through fetch with non-submit controls", () => {
    expect(uploadField).toContain('fetch("/api/circle-card/upload"');
    expect(uploadField.match(/type="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(uploadField).toContain('{uploading ? "Uploading" : "Upload"}');
  });

  it("restores the saved preview and crop after upload failure", () => {
    expect(uploadField).toContain("setSelectedPreviewUrl(null)");
    expect(uploadField).toContain("commitAdjustments(previousAdjustmentsRef.current)");
    expect(uploadField).toContain("Your existing image has not changed.");
  });

  it("does not refresh an existing card after an inline save", () => {
    expect(saveForm).not.toContain("router.refresh()");
    expect(saveForm).toContain("if (!existingCardId && state.cardId)");
    expect(dashboard).toContain("existingCardId={card?.id}");
  });

  it("keeps Gallery and featured-link saves client-side", () => {
    expect(galleryManager).toContain("event.preventDefault()");
    expect(galleryManager).toContain("upsertCircleCardGalleryItemInlineAction");
    expect(actions).toContain('notice: "Gallery image saved"');
    expect(smartLinkManager).toContain("event.preventDefault()");
    expect(smartLinkManager).toContain("upsertCircleCardLinkInlineAction");
  });
});

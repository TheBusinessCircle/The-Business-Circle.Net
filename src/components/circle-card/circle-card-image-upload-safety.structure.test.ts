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
const smartLinkFields = readFileSync(
  join(root, "src/components/circle-card/circle-card-smart-link-fields.tsx"),
  "utf8"
);
const dashboard = readFileSync(
  join(root, "src/app/(member)/dashboard/circle-card/page.tsx"),
  "utf8"
);
const actions = readFileSync(join(root, "src/actions/circle-card.actions.ts"), "utf8");
const publicGallery = readFileSync(
  join(root, "src/components/circle-card/public-circle-card-gallery.tsx"),
  "utf8"
);
const publicCardService = readFileSync(
  join(root, "src/server/circle-card/public-card.service.ts"),
  "utf8"
);

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

  it("keeps independent featured-link image state and clears drafts only after save", () => {
    expect(smartLinkFields).toContain('name="imageUrl"');
    expect(smartLinkFields).toContain("value={imageUrl}");
    expect(smartLinkFields).toContain("onValueChange={setImageUrl}");
    expect(smartLinkFields).toContain("window.sessionStorage.setItem(imageDraftKey, imageUrl)");
    expect(smartLinkManager).toContain('featuredLinkImageDraftKey(cardId, "new")');
    expect(smartLinkManager).toContain("featuredLinkImageDraftKey(cardId, customLink.id)");
    expect(smartLinkManager).toContain("clearFeaturedLinkImageDraft(imageDraftKey)");
  });

  it("synchronizes a gallery upload directly into the save field", () => {
    expect(uploadField).toContain("commitImageUrl(uploadedImageUrl);");
    expect(galleryManager).toContain('name="imageUrl"');
    expect(galleryManager).toContain("new FormData(event.currentTarget)");
    expect(actions).toContain('imageUrl: formData.get("imageUrl")');
    expect(actions).toContain("imageUrl: parsed.data.imageUrl");
  });

  it("enables valid uploaded URLs without waiting for image onLoad and restores new-item drafts", () => {
    expect(galleryManager).toContain("const hasValidImageUrl = isValidCircleCardGalleryImageUrl(imageUrl)");
    expect(galleryManager).toContain('disabled={saving || !hasValidImageUrl}');
    expect(galleryManager).not.toContain("imageReady");
    expect(galleryManager).toContain("window.sessionStorage.setItem(draftKey");
    expect(galleryManager).toContain("window.sessionStorage.getItem(draftKey)");
    expect(galleryManager).toContain("window.sessionStorage.removeItem(draftKey)");
  });

  it("blocks missing gallery images and removes failed public images", () => {
    expect(galleryManager).toContain('disabled={saving || !hasValidImageUrl}');
    expect(galleryManager).toContain("Upload a valid gallery image before saving.");
    expect(galleryManager).toContain("Image missing or invalid");
    expect(publicGallery).toContain("isValidCircleCardGalleryImageUrl(item.imageUrl)");
    expect(publicGallery).toContain("onError={() => markFailed(item.id)}");
    expect(publicGallery).not.toContain("invisible opacity-0");
    expect(publicCardService).toContain("const galleryItems = visibleCircleCardGalleryItems({");
    expect(publicCardService).not.toContain(
      "imageUrl: await resolvePublicUploadImageUrl(item.imageUrl, SITE_CONFIG.url)"
    );
  });
});

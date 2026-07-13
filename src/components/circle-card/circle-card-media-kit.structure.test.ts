import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const manager = readFileSync(join(root, "src/components/circle-card/circle-card-media-kit-manager.tsx"), "utf8");
const dashboard = readFileSync(join(root, "src/app/(member)/dashboard/circle-card/page.tsx"), "utf8");
const publicProfile = readFileSync(join(root, "src/components/circle-card/public-circle-card-profile.tsx"), "utf8");

describe("Creator Media Kit structure", () => {
  it("uses the Creator Studio inline manager and Free lock", () => {
    expect(dashboard).toContain('const mediaKitHref = cardHref("creator-media-kit")');
    expect(dashboard).toContain("<CircleCardMediaKitManager");
    expect(manager).toContain('id="creator-media-kit"');
    expect(manager).toContain("saveCircleCardMediaKitInlineAction");
    expect(manager).toContain("Live Media Kit is included with Creator Pro.");
  });

  it("keeps file delivery out of launch without deleting stored values", () => {
    expect(manager).not.toContain("CircleCardLinkFileUploadField");
    expect(manager).not.toContain('helperText="PDF only, up to 10MB"');
    expect(manager).toContain('type="hidden" name="fileUrl"');
    expect(manager).toContain('type="hidden" name="externalMediaKitUrl"');
  });

  it("renders populated Creator media kit data without changing other layouts", () => {
    expect(publicProfile).toContain('card.cardType !== "CREATOR" || !mediaKit');
    expect(publicProfile).toContain("Available for Collaborations");
    expect(publicProfile).toContain("Audience Snapshot");
    expect(publicProfile).toContain("Download Media Kit");
    expect(publicProfile).toContain("View Media Kit");
    expect(publicProfile).toContain("What I Create");
  });
});

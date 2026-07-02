import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const dashboard = readFileSync(
  join(root, "src/app/(member)/dashboard/circle-card/page.tsx"),
  "utf8"
);
const publicProfile = readFileSync(
  join(root, "src/components/circle-card/public-circle-card-profile.tsx"),
  "utf8"
);

describe("Creator Pro Studio foundation", () => {
  it("renders the creator-first studio and all seven foundation modules", () => {
    expect(dashboard).toContain('id="creator-pro-studio"');
    expect(dashboard).toContain("Creator Pro Studio");
    expect(dashboard).toContain("Showcase your content, grow collaborations, and build your Circle Trust.");
    for (const moduleName of [
      "Featured Content",
      "Media Kit",
      "Brand Partnerships",
      "Audience Snapshot",
      "Creator Offers",
      "Press / Proof",
      "Circle Trust"
    ]) {
      expect(dashboard).toContain(`name: "${moduleName}"`);
    }
  });

  it("shows completion, next actions and Free/Pro positioning", () => {
    expect(dashboard).toContain("Creator Profile Completion");
    expect(dashboard).toContain("Next best action");
    expect(dashboard).toContain('label: "Add your creator bio"');
    expect(dashboard).toContain('label: "Add your best social platform"');
    expect(dashboard).toContain('label: "Start building your Circle Trust"');
    expect(dashboard).toContain("Creator Pro helps you showcase content, attract collaborations and build Circle Trust.");
    expect(dashboard).toContain("entitlementLabel={circleCardEntitlement.label}");
  });

  it("uses real Creator data and suppresses empty public sections", () => {
    expect(publicProfile).toContain("creatorSocialRows.length");
    expect(publicProfile).toContain('heading: "Creator platforms & community"');
    expect(publicProfile).toContain('eyebrow: "Featured Content"');
    expect(publicProfile).toContain("<PublicRecommendations recommendations={card.recommendations} />");
    expect(publicProfile).toContain("card.approvedWalletTestimonialCount > 0 || card.reviews.length > 0");
  });
});

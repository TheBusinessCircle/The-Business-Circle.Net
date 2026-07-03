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
      "Live Media Kit",
      "Brand Partnerships",
      "Audience Snapshot",
      "Creator Offers",
      "Press & Proof",
      "Circle Trust"
    ]) {
      expect(dashboard).toContain(`name: "${moduleName}"`);
    }
  });

  it("shows completion, next actions and Free/Pro positioning", () => {
    expect(dashboard).toContain("Creator Profile Strength");
    expect(dashboard).toContain("Complete your creator profile to improve brand opportunities and build your Circle Trust.");
    expect(dashboard).toContain("Next best action");
    expect(dashboard).toContain('label: "Add your creator bio"');
    expect(dashboard).toContain('label: "Add your best social platform"');
    expect(dashboard).toContain('label: "Add your first featured content"');
    expect(dashboard).toContain('label: "Complete your Live Media Kit"');
    expect(dashboard).toContain('label: "Add your Audience Snapshot"');
    expect(dashboard).toContain('label: "Add a Creator Offer"');
    expect(dashboard).toContain('label: "Add Press & Proof"');
    expect(dashboard).toContain('label: "Start building your Circle Trust"');
    expect(dashboard).toContain("Creator Pro helps you showcase content, attract collaborations and build Circle Trust.");
    expect(dashboard).toContain("entitlementLabel={circleCardEntitlement.label}");
  });

  it("shows module counts, consistent actions and compact public shortcuts", () => {
    expect(dashboard).toContain('metric: `${featuredContentCount} active`');
    expect(dashboard).toContain('metric: `${creatorOfferCount} active`');
    expect(dashboard).toContain('metric: `${proofCount} active`');
    expect(dashboard).toContain('action: featuredContentCount > 0 ? "Manage Featured Content"');
    expect(dashboard).toContain('action: creatorOfferCount > 0 ? "Manage Offers"');
    expect(dashboard).toContain("View public Creator Card");
    expect(dashboard).toContain("Copy public link");
    expect(dashboard).toContain("Share Creator Card");
    expect(dashboard).toContain("Build my Circle Trust");
  });

  it("uses real Creator data and suppresses empty public sections", () => {
    expect(publicProfile).toContain("creatorSocialRows.length");
    expect(publicProfile).toContain('heading: "Creator platforms & community"');
    expect(publicProfile).toContain('eyebrow: "Ways To Work Together"');
    expect(publicProfile).toContain("<PublicRecommendations recommendations={card.recommendations} />");
    expect(publicProfile).toContain("<PublicCircleTrustPanel");
  });
});

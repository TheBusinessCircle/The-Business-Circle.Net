import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), "utf8");
const dashboard = read("src/app/(member)/dashboard/circle-card/page.tsx");
const publicProfile = read("src/components/circle-card/public-circle-card-profile.tsx");
const creatorStudioSource = dashboard.slice(
  dashboard.indexOf("function CreatorProStudio"),
  dashboard.indexOf("function UpgradeTriggerColumn")
);

describe("Creator Pro completion polish", () => {
  it("uses existing Creator modules in strength without adding another launcher", () => {
    for (const signal of [
      "hasFeaturedContent",
      "hasMediaKit",
      "hasWhatICreate",
      "hasAudienceSnapshot",
      "hasBrandPartnershipOrOpenToData",
      "hasCreatorOffer",
      "hasPressProof"
    ]) {
      expect(dashboard).toContain(`${signal}:`);
    }
    expect(creatorStudioSource.match(/name: "/g)).toHaveLength(7);
  });

  it("uses creator-first empty states across existing modules", () => {
    expect(read("src/components/circle-card/circle-card-featured-content-manager.tsx")).toContain("Add your best video, post or episode so visitors instantly understand your content.");
    expect(read("src/components/circle-card/circle-card-media-kit-manager.tsx")).toContain("Give brands a clear reason to work with you.");
    expect(read("src/components/circle-card/circle-card-audience-snapshot-manager.tsx")).toContain("Help brands understand who your content reaches.");
    expect(read("src/components/circle-card/circle-card-brand-partnerships-manager.tsx")).toContain("Show previous collaborations, or highlight what brands you want to work with.");
    expect(read("src/components/circle-card/circle-card-creator-offers-manager.tsx")).toContain("Promote affiliate links, merch, courses, communities or paid content.");
    expect(read("src/components/circle-card/circle-card-press-proof-manager.tsx")).toContain("Add proof, mentions, awards or milestones that build credibility.");
  });

  it("orders the populated Creator story from content through trust and next steps", () => {
    const storyMarkers = [
      'card.featuredContentItems.length',
      'renderCreatorMediaKitSection()',
      'renderCreatorAudienceSnapshotSection()',
      'renderCreatorBrandPartnershipsSection()',
      'card.pressProofItems.length',
      'card.creatorOffers.length',
      'renderTrustScoreCard({ reviewsId: "creator-reviews" })',
      'renderFeaturedLinksSection({'
    ];
    const positions = storyMarkers.map((marker) => publicProfile.lastIndexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it("keeps mobile actions clear of the bottom utility area", () => {
    expect(dashboard).toContain('className="space-y-4 pb-20 sm:pb-0"');
    expect(dashboard).toContain('className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"');
    expect(dashboard).toContain("h-11 min-w-0");
  });
});

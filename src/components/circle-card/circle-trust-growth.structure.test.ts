import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), "utf8");
const dashboard = read("src/app/(member)/dashboard/circle-card/page.tsx");
const progressPanel = read("src/components/circle-card/circle-trust-progress-panel.tsx");
const publicProfile = read("src/components/circle-card/public-circle-card-profile.tsx");
const trustDomain = read("src/lib/circle-card/circle-trust.ts");

describe("Circle Trust V1 growth polish", () => {
  it("recalculates from stored historical facts without a persisted score", () => {
    expect(trustDomain).toContain("scoreContribution");
    expect(trustDomain).toContain("verifiedConnectionCount");
    expect(trustDomain).toContain("verifiedTestimonials.length");
    expect(trustDomain).toContain("hasHistoricalActivity");
    expect(trustDomain).toContain("founding-member");
    expect(trustDomain).toContain("bcn-member");
  });

  it("places the same compact trust progress panel in Business and Creator workspaces", () => {
    expect(dashboard.match(/<CircleTrustProgressPanel/g)).toHaveLength(2);
    expect(dashboard).toContain('cardType="BUSINESS"');
    expect(dashboard).toContain('cardType="CREATOR"');
    expect(progressPanel).toContain("Build Your Circle Trust");
    expect(progressPanel).toContain("Completed Trust Signals");
    expect(progressPanel).toContain("Available Trust Signals");
    expect(progressPanel).toContain("Next recommended action");
    expect(progressPanel).not.toContain("% complete");
  });

  it("keeps Pro as an opportunity rather than a score grant", () => {
    expect(progressPanel).toContain("Upgrading does not add points by itself.");
    expect(dashboard).toContain("Completing this module helps strengthen your Circle Trust.");
  });

  it("adds Creator-only trust hierarchy while preserving Spin To Connect", () => {
    expect(publicProfile).toContain("<CircleCardSpinToConnect");
    expect(publicProfile).toContain("Circle Trust {card.trust.score}");
    expect(publicProfile).toContain('eyebrow: "Ways To Work Together"');
  });
});

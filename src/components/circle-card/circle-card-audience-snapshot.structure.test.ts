import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const manager = readFileSync(join(root, "src/components/circle-card/circle-card-audience-snapshot-manager.tsx"), "utf8");
const dashboard = readFileSync(join(root, "src/app/(member)/dashboard/circle-card/page.tsx"), "utf8");
const publicProfile = readFileSync(join(root, "src/components/circle-card/public-circle-card-profile.tsx"), "utf8");

describe("Creator Audience Snapshot structure", () => {
  it("uses a dedicated Creator Studio module with inline saving and Free lock", () => {
    expect(dashboard).toContain('const audienceHref = cardHref("creator-audience")');
    expect(dashboard).toContain("<CircleCardAudienceSnapshotManager");
    expect(manager).toContain('id="creator-audience"');
    expect(manager).toContain("saveCircleCardAudienceSnapshotInlineAction");
    expect(manager).toContain("Audience Snapshot is included with Creator Pro.");
  });

  it("keeps every audience value creator-controlled without API or chart UI", () => {
    expect(manager).toContain("Every value is entered and controlled by you.");
    expect(manager).not.toContain("fetch(");
    expect(manager).not.toContain("<canvas");
    expect(manager).not.toContain("recharts");
  });

  it("renders premium populated stat cards on Creator profiles only", () => {
    expect(publicProfile).toContain('card.cardType !== "CREATOR" || !snapshot');
    expect(publicProfile).toContain("Who Watches My Content");
    expect(publicProfile).toContain("Monthly Reach");
    expect(publicProfile).toContain("Audience Interests");
    expect(publicProfile).toContain("Creator Notes");
  });
});

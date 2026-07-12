import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const actions = readFileSync(join(root, "src/actions/circle-card.actions.ts"), "utf8");
const publicService = readFileSync(
  join(root, "src/server/circle-card/public-card.service.ts"),
  "utf8"
);
const studioPage = readFileSync(
  join(root, "src/app/(member)/dashboard/circle-card/studio/page.tsx"),
  "utf8"
);
const uploadRoute = readFileSync(
  join(root, "src/app/api/circle-card/upload/route.ts"),
  "utf8"
);
const memberLayout = readFileSync(join(root, "src/app/(member)/layout.tsx"), "utf8");

describe("Circle Card authoritative entitlement wiring", () => {
  it("derives every Circle Card mutation user from the server access loader", () => {
    expect(actions).toContain("loadCircleCardAccessForUser(user.id)");
    expect(actions).toContain("access: CircleCardAccessSnapshot");
    expect(actions).not.toContain("resolveCircleCardAccessLevel({");
    expect(actions).not.toContain("!user.hasActiveSubscription && user.role");
  });

  it("uses snapshot limits and capabilities for standalone Pro mutation paths", () => {
    expect(actions).toContain("existingCardCount >= user.access.limits.circleCards");
    expect(actions).toContain("activeLinkCount >= input.user.access.limits.activeLinks");
    expect(actions).toContain("user.access.capabilities.circleStudio");
    expect(actions).toContain("user.access.capabilities.businessBuilder");
    expect(actions).toContain("user.access.capabilities.expandedCreatorLimits");
    expect(actions).toContain("user.access.capabilities.creatorMediaKit");
    expect(actions).toContain("user.access.capabilities.creatorAudienceSnapshot");
  });

  it("derives Studio and protected image uploads from the same snapshot", () => {
    expect(studioPage).toContain("loadCircleCardAccessForUser(session.user.id)");
    expect(studioPage).toContain("circleCardAccess.capabilities.circleStudio");
    expect(uploadRoute).toContain("loadCircleCardAccessForUser(authResult.user.id)");
    expect(uploadRoute).toContain('kind === "background-image"');
    expect(uploadRoute).toContain('kind === "gallery-image"');
  });

  it("labels standalone Pro correctly in the member shell", () => {
    expect(memberLayout).toContain("loadCircleCardAccessForUser(session.user.id)");
    expect(memberLayout).toContain("circleCardAccess.entitlement.label");
    expect(memberLayout).not.toContain("getCircleCardAccountLabel({");
  });

  it("applies Free downgrade visibility without deleting stored Pro configuration", () => {
    expect(publicService).toContain("loadCircleCardAccessForUser(card.userId)");
    expect(publicService).toContain("export const getPublicCircleCard = cache(loadPublicCircleCard)");
    expect(publicService).toContain("freePublicCard?.id !== card.id");
    expect(publicService).toContain("slice(0, circleCardAccess.limits.activeLinks)");
    expect(publicService).toContain("circleCardAccess.capabilities.businessBuilder ?");
    expect(publicService).toContain("circleCardAccess.capabilities.creatorMediaKit ?");
    expect(publicService).toContain("circleCardAccess.capabilities.creatorAudienceSnapshot ?");
    expect(publicService).toContain("circleCardAccess.capabilities.circleStudio ? storedThemeMetadata : {}");
    expect(publicService).not.toContain("data: { contentBlocks: createEmptyCircleCardContentBlocks() }");
  });
});

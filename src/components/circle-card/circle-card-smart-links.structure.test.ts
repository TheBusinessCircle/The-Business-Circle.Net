import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const fields = readFileSync(
  join(root, "src/components/circle-card/circle-card-smart-link-fields.tsx"),
  "utf8"
);
const actions = readFileSync(join(root, "src/actions/circle-card.actions.ts"), "utf8");
const publicService = readFileSync(
  join(root, "src/server/circle-card/public-card.service.ts"),
  "utf8"
);
const publicProfile = readFileSync(
  join(root, "src/components/circle-card/public-circle-card-profile.tsx"),
  "utf8"
);

describe("Circle Card smart-link lifecycle", () => {
  it("maps the visible URL and attachment fields into the server form contract", () => {
    expect(fields).toContain('name="url"');
    expect(fields).toContain("value={label}");
    expect(fields).toContain("LINK_TYPE_LABELS[nextType]");
    expect(fields).toContain('name="imageUrl"');
    expect(fields).toContain("CircleCardLinkFileUploadField");
    expect(actions).toMatch(/CIRCLE_CARD_LINK_FORM_FIELDS = \[[\s\S]*?"url"/);
    expect(actions).toMatch(/CIRCLE_CARD_LINK_FORM_FIELDS = \[[\s\S]*?"fileUrl"/);
    expect(actions).toMatch(/CIRCLE_CARD_LINK_FORM_FIELDS = \[[\s\S]*?"imageUrl"/);
  });

  it("loads only active links and removes unsafe stored destinations", () => {
    expect(publicService).toMatch(/customLinks: \{[\s\S]*?isActive: true/);
    expect(publicService).toContain("isSafeCircleCardExternalUrl(link.url)");
    expect(publicService).toContain("isSafeCircleCardLinkDestination(link.fileUrl)");
    expect(publicProfile).toContain("isSafeCircleCardLinkDestination(destination)");
  });

  it("renders smart links through existing click tracking", () => {
    expect(publicProfile).toContain('eventType="CUSTOM_LINK_CLICK"');
    expect(publicProfile).toContain("linkId: link.id");
    expect(publicProfile).toContain("type: link.type");
  });
});

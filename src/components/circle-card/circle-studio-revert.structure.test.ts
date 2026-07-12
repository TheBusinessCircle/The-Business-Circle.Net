import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const studio = readFileSync("src/components/circle-card/circle-studio.tsx", "utf8");
const studioPage = readFileSync(
  "src/app/(member)/dashboard/circle-card/studio/page.tsx",
  "utf8"
);
const action = readFileSync("src/actions/circle-card.actions.ts", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");

describe("Circle Studio safe revert contract", () => {
  it("persists a separate previous-active snapshot and loads its availability", () => {
    expect(schema).toContain("studioPreviousActiveMetadata Json?");
    expect(studioPage).toContain("studioPreviousActiveMetadata: true");
    expect(studioPage).toContain(
      "hasPreviousActiveDesign={Boolean(card.studioPreviousActiveMetadata)}"
    );
  });

  it("keeps restore server-controlled and Pro-only", () => {
    expect(action).toContain('submittedIntent === "revert"');
    expect(action).toContain(
      'intent === "revert" && !user.access.capabilities.circleStudio'
    );
    expect(action).toContain("studioPreviousActiveMetadata: currentMetadata");
    expect(action).not.toContain("studioDraftMetadata: previousMetadata");
  });

  it("only offers restore when an active Pro user has a saved snapshot", () => {
    expect(studio).toContain('value="revert"');
    expect(studio).toContain("canActivate && hasPreviousActiveDesign");
    expect(studio).toContain("without deleting your current design or private draft");
  });
});

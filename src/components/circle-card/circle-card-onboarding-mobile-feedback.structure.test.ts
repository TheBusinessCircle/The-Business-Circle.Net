import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const flow = readFileSync(
  join(process.cwd(), "src/components/circle-card/circle-card-onboarding-flow.tsx"),
  "utf8"
);
const page = readFileSync(
  join(process.cwd(), "src/app/(member)/dashboard/circle-card/onboarding/page.tsx"),
  "utf8"
);

describe("Circle Card onboarding save feedback and restoration", () => {
  it("renders saving and transport errors inside the fixed mobile toolbar", () => {
    const toolbarStart = flow.indexOf('className="fixed inset-x-0 bottom-0');
    const toolbarEnd = flow.indexOf("</CardContent>", toolbarStart);
    const toolbar = flow.slice(toolbarStart, toolbarEnd);

    expect(toolbarStart).toBeGreaterThan(-1);
    expect(toolbar).toContain("Saving...");
    expect(toolbar).toContain("animate-spin");
    expect(toolbar).toContain('role="alert"');
    expect(toolbar).toContain("message");
    expect(flow).toContain("We could not save that yet. Your details are still here—try again.");
    expect(flow).toContain("pb-[max(9rem,env(safe-area-inset-bottom))]");
  });

  it("restores the saved image, crop values and readiness-selected step after refresh", () => {
    expect(page).toContain("initialStep={firstIncompleteCircleCardStep(readiness)}");
    expect(page).toContain("normalizeSafeCircleCardImageUrl(card?.profileImageUrl)");
    expect(page).toContain("profileImagePositionX: card?.profileImagePositionX ?? 50");
    expect(page).toContain("profileImagePositionY: card?.profileImagePositionY ?? 50");
    expect(page).toContain("profileImageScale: card?.profileImageScale ?? 1");
  });
});

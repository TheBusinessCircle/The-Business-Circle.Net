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
    expect(flow).toContain("pb-[calc(9rem+env(safe-area-inset-bottom))]");
  });

  it("keeps the Step 2 description visible above the mobile toolbar", () => {
    expect(flow).toContain("<Textarea");
    expect(flow).toContain("ref={taglineRef}");
    expect(flow).toContain("maxLength={180}");
    expect(flow).toContain("min-h-[120px]");
    expect(flow).toContain("border border-silver/30");
    expect(flow).toContain("scroll-mb-[calc(9rem+env(safe-area-inset-bottom))]");
    expect(flow).toContain("onFocus={scrollDescriptionAboveToolbar}");
    expect(flow).toContain("fieldBottom > toolbarTop - 16");
  });

  it("focuses and reveals the description when Step 2 validation fails", () => {
    const descriptionValidation = flow.indexOf("if (!values.tagline.trim())");
    const validationEnd = flow.indexOf("return \"Add a short description of what you do.\"", descriptionValidation);
    const validation = flow.slice(descriptionValidation, validationEnd);

    expect(descriptionValidation).toBeGreaterThan(-1);
    expect(validation).toContain("focusDescription()");
    expect(flow).toContain("taglineRef.current?.focus({ preventScroll: true })");
    expect(flow).toContain("scrollDescriptionAboveToolbar()");
  });

  it("restores the saved image, crop values and readiness-selected step after refresh", () => {
    expect(page).toContain("initialStep={firstIncompleteCircleCardStep(readiness)}");
    expect(page).toContain("normalizeSafeCircleCardImageUrl(card?.profileImageUrl)");
    expect(page).toContain("profileImagePositionX: card?.profileImagePositionX ?? 50");
    expect(page).toContain("profileImagePositionY: card?.profileImagePositionY ?? 50");
    expect(page).toContain("profileImageScale: card?.profileImageScale ?? 1");
  });
});

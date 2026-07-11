import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/components/circle-card/circle-card-onboarding-flow.tsx"),
  "utf8"
);

describe("guided first Circle Card build structure", () => {
  it("contains the three-step welcome, private preview and explicit publish journey", () => {
    expect(source).toContain("Let’s build your Circle Card");
    expect(source).toContain("Build My Circle Card");
    expect(source).toContain("Who are you?");
    expect(source).toContain("What do you do?");
    expect(source).toContain("How should people connect?");
    expect(source).toContain("Private preview");
    expect(source).toContain("Publish My Circle Card");
    expect(source).toContain("Your Circle Card is live");
  });

  it("keeps mobile actions accessible and safe-area aware", () => {
    expect(source).toContain("min-h-[100dvh]");
    expect(source).toContain("env(safe-area-inset-bottom)");
    expect(source).toContain("overflow-x-hidden");
    expect(source).toContain("min-h-11");
    expect(source).toContain("fixed inset-x-0 bottom-0");
  });

  it("announces real progress, save errors and step focus", () => {
    expect(source).toContain('role="progressbar"');
    expect(source).toContain("aria-valuetext");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('role="alert"');
    expect(source).toContain("headingRef.current?.focus()");
  });
});

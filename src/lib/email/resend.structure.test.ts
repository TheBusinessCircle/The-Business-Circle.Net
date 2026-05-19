import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Resend transactional sender structure", () => {
  it("sends pre-rendered html/text instead of React components", () => {
    const source = readSource("src/lib/email/resend.ts");

    expect(source).toContain("const hasRenderableContent = Boolean(input.html || input.text)");
    expect(source).toContain("html: input.html");
    expect(source).toContain("text: input.text");
    expect(source).not.toContain("react: input.react");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/sitemap.ts"), "utf8");

describe("sitemap route policy", () => {
  it("includes public launch routes and excludes member profile routes", () => {
    expect(source).toContain("/membership");
    expect(source).toContain("/join");
    expect(source).toContain("/terms-of-service");
    expect(source).toContain("/privacy-policy");
    expect(source).toContain("/cookie-policy");
    expect(source).not.toMatch(/`\$\{SITE_CONFIG\.url\}\/members(?:\/|`|")/);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_INTENT_PAGE_ROUTES } from "@/config/public-intent-pages";

const source = readFileSync(join(process.cwd(), "src/app/sitemap.ts"), "utf8");

describe("sitemap route policy", () => {
  it("includes public launch routes and excludes member profile routes", () => {
    expect(source).toContain("/membership");
    expect(source).toContain("/audit");
    expect(PUBLIC_INTENT_PAGE_ROUTES).toEqual(
      expect.arrayContaining([
        "/private-business-network",
        "/business-networking-uk",
        "/business-owner-network-uk",
        "/founder-community-uk"
      ])
    );
    expect(source).toContain("PUBLIC_INTENT_PAGE_ROUTES");
    expect(source).toContain("/terms-of-service");
    expect(source).toContain("/privacy-policy");
    expect(source).toContain("/cookie-policy");
    expect(source).not.toContain("`${SITE_CONFIG.url}/join`");
    expect(source).not.toMatch(/`\$\{SITE_CONFIG\.url\}\/members(?:\/|`|")/);
  });
});

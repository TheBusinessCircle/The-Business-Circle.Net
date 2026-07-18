import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";

describe("robots output", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps private member surfaces out of crawlers", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];

    expect(disallow).toEqual(
      expect.arrayContaining([
        "/members",
        "/member",
        "/messages",
        "/calls",
        "/wins",
        "/dashboard"
      ])
    );
  });

  it("does not block public marketing routes", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];

    expect(disallow).not.toEqual(
      expect.arrayContaining([
        "/",
        "/about",
        "/membership",
        "/audit",
        "/faq",
        "/insights",
        "/contact",
        "/review",
        "/business-owner-network-uk",
        "/founder-community-uk"
      ])
    );
    expect(disallow).toEqual(expect.arrayContaining(["/join", "/join-mobile", "/join-desktop", "/api"]));
  });

  it("publishes only Circle Card public surfaces from the Circle Card runtime", () => {
    vi.stubEnv("APP_BRAND", "circle-card");
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const allow = Array.isArray(rules.allow) ? rules.allow : [rules.allow];
    const disallow = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];

    expect(result.sitemap).toBe("https://circlecard.co.uk/sitemap.xml");
    expect(allow).toEqual(expect.arrayContaining(["/", "/pro", "/teams", "/card/", "/r/"]));
    expect(disallow).toEqual(expect.arrayContaining(["/api/", "/app/", "/login"]));
    expect(allow).not.toContain("/membership");
  });
});

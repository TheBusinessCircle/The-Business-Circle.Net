import { describe, expect, it } from "vitest";
import { CANONICAL_SITE_URL } from "@/config/site-constants";
import { PUBLIC_TRUST_PHRASE } from "@/config/legal";
import { SITE_CONFIG } from "@/config/site";

describe("site config", () => {
  it("uses the canonical public site url without runtime resolution", () => {
    expect(SITE_CONFIG.url).toBe(CANONICAL_SITE_URL);
  });

  it("keeps the public brand description aligned with the trust phrase", () => {
    expect(SITE_CONFIG.description).toContain(PUBLIC_TRUST_PHRASE);
  });
});

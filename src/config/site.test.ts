import { describe, expect, it } from "vitest";
import { CANONICAL_SITE_URL } from "@/config/site-constants";
import { SITE_CONFIG } from "@/config/site";

describe("site config", () => {
  it("uses the canonical public site url without runtime resolution", () => {
    expect(SITE_CONFIG.url).toBe(CANONICAL_SITE_URL);
  });
});

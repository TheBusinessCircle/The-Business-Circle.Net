import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";

vi.mock("@/server/founder", () => ({
  listActiveFounderServices: vi.fn(async () => [])
}));

describe("runtime sitemap isolation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("emits only Circle Card canonical URLs from the Circle Card runtime", async () => {
    vi.stubEnv("APP_BRAND", "circle-card");

    const result = await sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://circlecard.co.uk/",
        "https://circlecard.co.uk/pro",
        "https://circlecard.co.uk/teams",
        "https://circlecard.co.uk/community-standards"
      ])
    );
    expect(urls.every((url) => url.startsWith("https://circlecard.co.uk/"))).toBe(true);
    expect(urls.some((url) => url.includes("/membership"))).toBe(false);
  });
});

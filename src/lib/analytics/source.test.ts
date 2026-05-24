import { describe, expect, it } from "vitest";
import { parseTrafficSource, parseUtmValue } from "@/lib/analytics/source";

describe("traffic source parsing", () => {
  it("classifies direct traffic without a referrer", () => {
    expect(parseTrafficSource(null, "/membership")).toBe("Direct");
  });

  it("classifies common social and search referrers", () => {
    expect(parseTrafficSource("https://www.linkedin.com/feed/", "/")).toBe("LinkedIn");
    expect(parseTrafficSource("https://facebook.com/story", "/")).toBe("Facebook");
    expect(parseTrafficSource("https://www.google.co.uk/search?q=bcn", "/")).toBe("Google");
    expect(parseTrafficSource("https://www.tiktok.com/@owner", "/")).toBe("TikTok");
    expect(parseTrafficSource("https://www.reddit.com/r/smallbusiness", "/")).toBe("Reddit");
  });

  it("prefers explicit UTM source on the path", () => {
    expect(parseTrafficSource("https://example.com", "/audit?utm_source=linkedin")).toBe("LinkedIn");
    expect(parseUtmValue("/audit?utm_medium=social&utm_campaign=founders", "utm_campaign")).toBe("founders");
  });
});

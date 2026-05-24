import { describe, expect, it } from "vitest";
import { isLikelyBot, parseDevice } from "@/lib/analytics/first-party";

describe("first-party analytics collection helpers", () => {
  it("flags common bot user agents", () => {
    expect(isLikelyBot("Googlebot/2.1")).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 Chrome/125 Safari/537.36")).toBe(false);
  });

  it("classifies broad device, browser, and OS details without storing sensitive data", () => {
    expect(parseDevice("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1")).toEqual({
      deviceType: "Mobile",
      browser: "Safari",
      os: "Apple"
    });
  });
});

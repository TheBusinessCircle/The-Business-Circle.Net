import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

describe("robots output", () => {
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
      expect.arrayContaining(["/", "/about", "/membership", "/join", "/faq", "/insights", "/contact"])
    );
  });
});

import { describe, expect, it } from "vitest";
import { siteContentDefaults } from "@/config/site-content";
import { normalizeSiteContentSections } from "@/lib/site-content";

describe("site content normalisation", () => {
  it("normalises stale membership FAQ wording away from both-plan language", () => {
    const content = normalizeSiteContentSections("membership", {
      ...siteContentDefaults.membership,
      faqs: siteContentDefaults.membership.faqs.map((item, index) =>
        index === 2
          ? {
              question: `Do ${["both", "plans"].join(" ")} include collaboration opportunities?`,
              answer: `Yes. ${["Both", "plans"].join(" ")} include collaboration opportunities.`
            }
          : item
      )
    });

    expect(content.faqs[2].question).toContain("all membership rooms");
    expect(content.faqs[2].answer).toContain("all membership rooms");
    expect(content.faqs[2].question).not.toMatch(new RegExp(["both", "plans"].join(" "), "i"));
    expect(content.faqs[2].answer).not.toMatch(new RegExp(["both", "plans"].join(" "), "i"));
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("launch CRO placement", () => {
  it("renders the first 7 days block on home and audit result surfaces", () => {
    const home = readSource("src/app/(public)/home/page.tsx");
    const audit = readSource("src/app/(public)/audit/founder-audit-client.tsx");
    const component = readSource("src/components/public/launch-cro-blocks.tsx");

    expect(component).toContain("Your first 7 days inside The Business Circle");
    expect(home).toContain("<FirstSevenDaysBlock");
    expect(audit).toContain("<FirstSevenDaysBlock");
  });

  it("renders the membership decision stages and tier guidance", () => {
    const membership = readSource("src/app/(public)/membership/page.tsx");
    const selector = readSource("src/components/public/membership-guided-selector.tsx");

    expect(membership).toContain("WHO_ITEMS");
    expect(membership).toContain("HOW_ITEMS");
    expect(membership).toContain("WHEN_ITEMS");
    expect(membership).toContain("TIER_DECISION_ITEMS");
    expect(membership).toContain('id="choose-membership"');
    expect(selector).toContain("Pricing Begins Here");
    expect(selector).toContain("buildJoinConfirmationHref");
  });

  it("renders the FAQ and contact audit CTA", () => {
    const faq = readSource("src/app/(public)/faq/page.tsx");
    const contact = readSource("src/app/(public)/contact/page.tsx");

    expect(faq).toContain("<AuditFitCta");
    expect(contact).toContain("<AuditFitCta");
  });

  it("renders the insights CTA on article and topic pages", () => {
    const article = readSource("src/app/(public)/insights/[slug]/page.tsx");
    const topic = readSource("src/app/(public)/insights/topic/[clusterSlug]/page.tsx");

    expect(article).toContain("<InsightsRoomCta");
    expect(topic).toContain("<InsightsRoomCta");
  });

  it("renders the Growth Architect launch review CTA on founder surfaces", () => {
    const founder = readSource("src/app/(public)/founder/page.tsx");
    const memberGrowthArchitect = readSource(
      "src/app/(member)/member/growth-architect/page.tsx"
    );

    expect(founder).toContain("<GrowthArchitectSupportCta");
    expect(memberGrowthArchitect).toContain("<GrowthArchitectSupportCta");
    expect(founder).toContain("Launch%20Review%20CTA");
    expect(memberGrowthArchitect).toContain("Launch%20Review%20CTA");
  });
});

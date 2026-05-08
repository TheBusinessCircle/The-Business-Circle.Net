import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("launch CRO placement", () => {
  it("renders the first 7 days block on home, membership, and audit result surfaces", () => {
    const home = readSource("src/app/(public)/home/page.tsx");
    const membership = readSource("src/app/(public)/membership/page.tsx");
    const audit = readSource("src/app/(public)/audit/founder-audit-client.tsx");
    const component = readSource("src/components/public/launch-cro-blocks.tsx");

    expect(component).toContain("Your first 7 days inside The Business Circle");
    expect(home).toContain("<FirstSevenDaysBlock");
    expect(membership).toContain("<FirstSevenDaysBlock");
    expect(audit).toContain("<FirstSevenDaysBlock");
  });

  it("renders the membership outcome comparison", () => {
    const membership = readSource("src/app/(public)/membership/page.tsx");
    const component = readSource("src/components/public/launch-cro-blocks.tsx");

    expect(membership).toContain("<TierOutcomeComparison");
    expect(component).toContain("Best for entering the environment and building from a clearer base.");
    expect(component).toContain("Best for stronger conversations, visibility, and momentum.");
    expect(component).toContain("Best for highest-signal access");
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

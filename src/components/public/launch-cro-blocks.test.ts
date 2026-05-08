import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AuditFitCta,
  FirstSevenDaysBlock,
  GrowthArchitectSupportCta,
  InsightsRoomCta,
  TierOutcomeComparison
} from "@/components/public/launch-cro-blocks";

describe("launch CRO blocks", () => {
  it("renders the first 7 days onboarding path", () => {
    const markup = renderToStaticMarkup(createElement(FirstSevenDaysBlock));

    expect(markup).toContain("Your first 7 days inside The Business Circle");
    expect(markup).toContain("Set up your member profile");
    expect(markup).toContain("Vote on The Circle Blueprint");
    expect(markup).toContain("Decide whether Foundation, Inner Circle, or Core fits your next move");
  });

  it("renders outcome-based membership tier comparison", () => {
    const markup = renderToStaticMarkup(createElement(TierOutcomeComparison));

    expect(markup).toContain("Foundation");
    expect(markup).toContain("Best for entering the environment and building from a clearer base.");
    expect(markup).toContain("Inner Circle");
    expect(markup).toContain("Best for stronger conversations, visibility, and momentum.");
    expect(markup).toContain("Core");
    expect(markup).toContain("Best for highest-signal access");
    expect(markup).toContain("Highest signal");
  });

  it("renders the audit fit CTA", () => {
    const markup = renderToStaticMarkup(createElement(AuditFitCta));

    expect(markup).toContain("Still unsure where you fit?");
    expect(markup).toContain("Run the Founder Audit and get a guided room recommendation.");
    expect(markup).toContain("Start the Founder Audit");
    expect(markup).toContain("/audit");
  });

  it("renders the insights room CTA", () => {
    const markup = renderToStaticMarkup(createElement(InsightsRoomCta));

    expect(markup).toContain("You do not need more noise.");
    expect(markup).toContain("You need the right room.");
    expect(markup).toContain("Start the Founder Audit");
    expect(markup).toContain("Explore Membership");
  });

  it("renders the Growth Architect support CTA without mixing it into membership", () => {
    const markup = renderToStaticMarkup(
      createElement(GrowthArchitectSupportCta, {
        href: "/founder/services/growth-architect-clarity-audit"
      })
    );

    expect(markup).toContain("For owners who need direct support:");
    expect(markup).toContain("Request Growth Architect support");
    expect(markup).toContain("separate founder-led service");
  });
});

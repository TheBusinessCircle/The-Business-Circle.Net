import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public conversion, SEO, AEO and GEO structure", () => {
  it("tracks the requested Founder Audit conversion events", () => {
    const analytics = readSource("src/lib/analytics.ts");
    const auditClient = readSource("src/app/(public)/audit/founder-audit-client.tsx");
    const trackedCta = readSource("src/components/public/tracked-public-cta-link.tsx");

    expect(analytics).toContain('auditCtaClicked: "audit_cta_clicked"');
    expect(analytics).toContain('founderAuditStarted: "founder_audit_started"');
    expect(analytics).toContain('founderAuditCompleted: "founder_audit_completed"');
    expect(analytics).toContain('membershipSelectedFromAudit: "membership_selected_from_audit"');
    expect(trackedCta).toContain("trackPublicCtaAuditClicked");
    expect(auditClient).toContain("trackFounderAuditStarted");
    expect(auditClient).toContain("trackFounderAuditCompleted");
    expect(auditClient).toContain("trackMembershipSelectedFromAudit");
  });

  it("makes the Founder Audit the primary cold visitor CTA on educational public routes", () => {
    const auditCta = readSource("src/components/public/founder-audit-cta.tsx");
    const twoPath = readSource("src/components/public/answer-block.tsx");
    const intentPage = readSource("src/components/public/seo-intent-page.tsx");
    const insightsHub = readSource("src/app/(public)/insights/page.tsx");
    const insightArticle = readSource("src/app/(public)/insights/[slug]/page.tsx");

    expect(auditCta).toContain("buildFounderAuditHref");
    expect(auditCta).toContain("source");
    expect(auditCta).toContain("topic");
    expect(twoPath).toContain("FounderAuditCta");
    expect(intentPage).toContain('buildFounderAuditHref({ source: "intent"');
    expect(insightsHub).toContain('buildFounderAuditHref({ source: "insights"');
    expect(insightArticle).toContain('buildFounderAuditHref({ source: "insights", topic: insight.clusterSlug })');
  });

  it("keeps the homepage split between public invitation and founder operating system", () => {
    const home = readSource("src/app/(public)/home/page.tsx");
    const dashboard = readSource("src/app/(member)/dashboard/page.tsx");

    expect(home).toContain("Business owners do not need more noise. They need a better room.");
    expect(home).toContain('label="Step Inside"');
    expect(home).toContain('label="Run the Founder Audit"');
    expect(home).toContain('label="Explore Membership"');
    expect(home).toContain("href={STEP_INSIDE_HREF}");
    expect(home).toContain("Why BCN exists");
    expect(home).toContain("What changes after joining");
    expect(home).toContain("Founder Signals");
    expect(home).toContain("How the environment works");
    expect(home).toContain("Membership Invitation");

    expect(home.indexOf("<WhatBcnActuallyIsSection")).toBeLessThan(
      home.indexOf("<WhatChangesAfterJoiningSection")
    );
    expect(home.indexOf("<WhatChangesAfterJoiningSection")).toBeLessThan(
      home.indexOf("<FounderSignalsSection")
    );
    expect(home.indexOf("<FounderSignalsSection")).toBeLessThan(
      home.indexOf("<InsideEnvironmentSection")
    );
    expect(home.indexOf("<InsideEnvironmentSection")).toBeLessThan(
      home.indexOf("<MembershipInvitationSection")
    );

    expect(dashboard).toContain("Your Founder Momentum");
    expect(dashboard).toContain("getMemberHomeNextAction");
    expect(dashboard).toContain("CONNECTION_WIN_TAG");
    expect(dashboard).toContain("memberConnectionWin");
  });

  it("keeps structured data and crawler files aligned with public visibility", () => {
    const structuredData = readSource("src/lib/structured-data.ts");
    const membershipPage = readSource("src/app/(public)/membership/page.tsx");
    const auditPage = readSource("src/app/(public)/audit/page.tsx");
    const intentPage = readSource("src/components/public/seo-intent-page.tsx");
    const articlePage = readSource("src/app/(public)/insights/[slug]/page.tsx");
    const robots = readSource("src/app/robots.ts");
    const llms = readSource("public/llms.txt");

    expect(structuredData).toContain('"@type": "Organization"');
    expect(structuredData).toContain('"@type": "WebSite"');
    expect(structuredData).toContain('"@type": "Person"');
    expect(structuredData).toContain('"@type": "Service"');
    expect(structuredData).toContain('"@type": "FAQPage"');
    expect(structuredData).toContain('"@type": "BreadcrumbList"');
    expect(structuredData).toContain('"@type": "Article"');
    expect(membershipPage).toContain("buildServiceSchema");
    expect(auditPage).toContain("buildServiceSchema");
    expect(intentPage).toContain("buildServiceSchema");
    expect(articlePage).toContain("answerSummary: insight.aeoSummary");
    expect(articlePage).toContain("topicCluster");
    expect(articlePage).toContain("groupedRelatedInsights");
    expect(robots).toContain('"/founder"');
    expect(robots).toContain('"/insights"');
    expect(llms).toContain("https://thebusinesscircle.net/founder");
    expect(llms).toContain("https://thebusinesscircle.net/insights/topic/ai-search-and-visibility");
  });
});

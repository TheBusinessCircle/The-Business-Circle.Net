import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuditIntelligencePanel } from "@/components/admin/growth-intelligence/audit-intelligence-panel";
import { TopPagesTable } from "@/components/admin/growth-intelligence/top-pages-table";

describe("Growth Intelligence empty states", () => {
  it("explains when visitor data has not been collected yet", () => {
    const markup = renderToStaticMarkup(createElement(TopPagesTable, { pages: [] }));

    expect(markup).toContain(
      "No visitor data has been collected yet. Growth Intelligence will begin populating as people visit the public site."
    );
  });

  it("explains when Founder Audit completions are not available yet", () => {
    const markup = renderToStaticMarkup(
      createElement(AuditIntelligencePanel, {
        hasAuditData: false,
        summary: {
          started: 0,
          completed: 0,
          completionRate: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0
        },
        distributions: {
          scoreDistribution: [],
          resultTypes: [],
          recommendedTiers: [],
          weakAreas: [],
          strongAreas: [],
          auditsByDay: [],
          auditsByTrafficSource: []
        }
      })
    );

    expect(markup).toContain(
      "No Founder Audit completions yet. Results will appear here once visitors complete the audit."
    );
  });
});

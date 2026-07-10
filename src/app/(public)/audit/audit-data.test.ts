import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FOUNDER_AUDIT_CATEGORY_MAP,
  FOUNDER_AUDIT_QUESTIONS,
  calculateFounderAuditScore,
  getFounderAuditBottleneck,
  getFounderAuditRecommendation
} from "./audit-data";

describe("founder audit data and scoring", () => {
  it("contains the 10 required founder audit questions", () => {
    expect(FOUNDER_AUDIT_QUESTIONS).toHaveLength(10);
    expect(FOUNDER_AUDIT_QUESTIONS[0]?.question).toBe(
      "How clear is your current direction in business?"
    );
    expect(FOUNDER_AUDIT_QUESTIONS[9]?.answers.map((answer) => answer.score)).toEqual([3, 2, 1]);
  });

  it("maps normalized score bands to the correct membership tier recommendation", () => {
    expect(getFounderAuditRecommendation(10).tierSlug).toBe("foundation");
    expect(getFounderAuditRecommendation(17).tierSlug).toBe("foundation");
    expect(getFounderAuditRecommendation(18).tierSlug).toBe("inner-circle");
    expect(getFounderAuditRecommendation(23).tierSlug).toBe("inner-circle");
    expect(getFounderAuditRecommendation(24).tierSlug).toBe("core");
    expect(getFounderAuditRecommendation(30).tierSlug).toBe("core");
  });

  it("maps audit questions to the expected diagnostic categories", () => {
    expect(
      FOUNDER_AUDIT_QUESTIONS.map((question) => FOUNDER_AUDIT_CATEGORY_MAP[question.id].category)
    ).toEqual([
      "Direction",
      "Structure",
      "Decision-making",
      "Environment",
      "Momentum",
      "Visibility",
      "Support",
      "Growth readiness",
      "Collaboration",
      "Owner pressure"
    ]);
  });

  it("uses the lowest scoring answer as the likely bottleneck", () => {
    expect(getFounderAuditBottleneck([3, 3, 3, 1, 3, 3, 3, 3, 3, 3])).toMatchObject({
      questionId: "circle",
      category: "Environment",
      score: 1
    });

    expect(getFounderAuditBottleneck([3, 3, 3, 3, 3, 3, 3, 2, 1, 3])).toMatchObject({
      questionId: "network-opportunity",
      category: "Collaboration",
      score: 1
    });
  });

  it("keeps bottleneck ties stable by question order", () => {
    expect(getFounderAuditBottleneck([2, 3, 2, 3, 3, 3, 3, 3, 3, 3])).toMatchObject({
      questionId: "direction",
      category: "Direction",
      score: 2
    });
  });

  it("calculates the selected answer score and keeps audit copy free of em dashes", () => {
    expect(calculateFounderAuditScore([1, 2, 3, 2, 1])).toBe(9);

    const auditFiles = [
      "src/app/(public)/audit/audit-data.ts",
      "src/app/(public)/audit/founder-audit-client.tsx",
      "src/app/(public)/audit/page.tsx"
    ].map((path) => readFileSync(join(process.cwd(), path), "utf8"));

    const emDash = String.fromCharCode(8212);

    for (const source of auditFiles) {
      expect(source).not.toContain(emDash);
    }
  });
});

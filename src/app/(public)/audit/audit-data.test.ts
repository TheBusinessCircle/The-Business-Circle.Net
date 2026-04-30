import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FOUNDER_AUDIT_QUESTIONS,
  calculateFounderAuditScore,
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

  it("maps score ranges to the correct membership tier recommendation", () => {
    expect(getFounderAuditRecommendation(10).tierSlug).toBe("foundation");
    expect(getFounderAuditRecommendation(15).tierSlug).toBe("foundation");
    expect(getFounderAuditRecommendation(16).tierSlug).toBe("inner-circle");
    expect(getFounderAuditRecommendation(23).tierSlug).toBe("inner-circle");
    expect(getFounderAuditRecommendation(24).tierSlug).toBe("core");
    expect(getFounderAuditRecommendation(30).tierSlug).toBe("core");
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

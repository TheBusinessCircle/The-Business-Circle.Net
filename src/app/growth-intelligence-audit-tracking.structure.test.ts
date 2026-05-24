import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Founder Audit first-party tracking", () => {
  it("tracks audit start and completion into the Growth Intelligence collector", () => {
    const source = readFileSync("src/app/(public)/audit/founder-audit-client.tsx", "utf8");

    expect(source).toContain('eventName: "audit_started"');
    expect(source).toContain('eventName: "audit_completed"');
    expect(source).toContain("recommendedTier");
    expect(source).toContain("weaknesses");
    expect(source).toContain("strengths");
  });
});

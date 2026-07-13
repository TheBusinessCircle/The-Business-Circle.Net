import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Circle Card Pro launch scope", () => {
  it("keeps the public Pro checkout monthly-only and server-selected", () => {
    const checkoutButtons = source("src/components/circle-card/circle-card-pro-checkout-buttons.tsx");
    const proPage = source("src/app/(public)/circle-card/pro/page.tsx");

    expect(checkoutButtons).toContain("body: JSON.stringify({ intent })");
    expect(checkoutButtons).not.toContain("period:");
    expect(checkoutButtons).not.toContain("priceId");
    expect(proPage).toContain("£9.99 per month");
    expect(proPage).not.toContain("annualLabel");
    expect(proPage).not.toContain("annual pricing");
    expect(proPage).not.toContain("free trial");
  });

  it("does not sell deferred file links or Teams as part of Pro", () => {
    const proPage = source("src/app/(public)/circle-card/pro/page.tsx");
    const teamsPage = source("src/app/(public)/circle-card/teams/page.tsx");

    expect(proPage).not.toContain("Uploaded/private file links");
    expect(proPage).not.toContain("Circle Card Teams");
    expect(teamsPage).toContain(
      "Teams billing and checkout are deferred beyond the monthly Circle Card Pro launch."
    );
    expect(teamsPage).not.toContain("Checkout CTA prepared");
  });
});

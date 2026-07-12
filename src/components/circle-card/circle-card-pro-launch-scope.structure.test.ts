import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Circle Card Pro launch scope", () => {
  it("keeps the public Pro checkout monthly-only", () => {
    const checkoutButtons = source(
      "src/components/circle-card/circle-card-pro-checkout-buttons.tsx"
    );
    const proPage = source("src/app/(public)/circle-card/pro/page.tsx");

    expect(checkoutButtons).toContain("body: JSON.stringify({})");
    expect(checkoutButtons).not.toContain("period:");
    expect(checkoutButtons).not.toContain("priceId");
    expect(proPage).toContain('monthlyLabel="£9.99/month"');
    expect(proPage).not.toContain("annualLabel");
  });

  it("marks uploaded/private file links and Teams billing as deferred", () => {
    const proPage = source("src/app/(public)/circle-card/pro/page.tsx");
    const teamsPage = source("src/app/(public)/circle-card/teams/page.tsx");

    expect(proPage).toContain("Uploaded/private file links (deferred)");
    expect(teamsPage).toContain(
      "Teams billing and checkout are deferred beyond the monthly Circle Card Pro launch."
    );
    expect(teamsPage).not.toContain("Checkout CTA prepared");
  });
});

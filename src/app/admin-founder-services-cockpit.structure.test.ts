import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("admin founder services cockpit structure", () => {
  it("keeps the key sales cockpit sections and responsive client card structure", () => {
    const page = readSource("src/app/(admin)/admin/founder-services/page.tsx");

    expect(page).toContain("Founder Services");
    expect(page).toContain("Sync Stripe Products");
    expect(page).toContain("Export CSV");
    expect(page).toContain("grid gap-4 sm:grid-cols-2 xl:grid-cols-4");
    expect(page).toContain("Client list");
    expect(page).toContain("md:hidden");
    expect(page).toContain("Open Client");
    expect(page).toContain("Pipeline board");
    expect(page).toContain("Stripe catalog");
    expect(page).toContain("Create discount code");
    expect(page).toContain("Manual calendar");
    expect(page).toContain("Discount code library");
  });

  it("renders the checkout email composer fields in the opened client workflow", () => {
    const detailPage = readSource("src/app/(admin)/admin/founder-services/[requestId]/page.tsx");
    const composer = readSource("src/components/admin/founder-service-checkout-email-composer.tsx");

    expect(detailPage).toContain("Client overview");
    expect(detailPage).toContain("Email history");
    expect(detailPage).toContain("FounderServiceCheckoutEmailComposer");
    expect(composer).toContain("To");
    expect(composer).toContain("Subject");
    expect(composer).toContain("Opening message");
    expect(composer).toContain("Selected service");
    expect(composer).toContain("Price");
    expect(composer).toContain("Discount code");
    expect(composer).toContain("Preview email");
    expect(composer).toContain("Send checkout email");
    expect(composer).toContain("window.confirm");
  });
});

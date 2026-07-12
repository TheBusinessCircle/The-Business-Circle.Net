import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actionsSource = readFileSync("src/actions/circle-card.actions.ts", "utf8");
const dashboardSource = readFileSync(
  "src/app/(member)/dashboard/circle-card/page.tsx",
  "utf8"
);
const scannerSource = readFileSync(
  "src/server/circle-card/business-card-scanner.service.ts",
  "utf8"
);
const publicCardSource = readFileSync(
  "src/server/circle-card/public-card.service.ts",
  "utf8"
);
const walletPageSource = readFileSync(
  "src/app/(member)/dashboard/circle-card/wallet/page.tsx",
  "utf8"
);
const testimonialPageSource = readFileSync(
  "src/app/(member)/dashboard/circle-card/testimonial/page.tsx",
  "utf8"
);
const reportActionSource = readFileSync("src/actions/circle-card-report.actions.ts", "utf8");
const linkFileRouteSource = readFileSync(
  "src/app/api/circle-card/link-file/[filename]/route.ts",
  "utf8"
);
const linkAccessRouteSource = readFileSync(
  "src/app/api/circle-card/link-access/route.ts",
  "utf8"
);

function exportedActionSource(name: string, nextName: string) {
  const start = actionsSource.indexOf(`export async function ${name}`);
  const end = actionsSource.indexOf(`export async function ${nextName}`, start + 1);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return actionsSource.slice(start, end);
}

describe("Circle Card downgrade target privacy structure", () => {
  it.each([
    ["saveCircleWalletContactAction", "spinToConnectCircleCardAction"],
    ["spinToConnectCircleCardAction", "saveBusinessCardScanWalletContactAction"],
    ["saveMatchedBusinessCardCircleCardAction", "saveMatchedBusinessCardAndSendConnectionRequestAction"],
    ["saveMatchedBusinessCardAndSendConnectionRequestAction", "generateBusinessCardClaimLinkAction"],
    ["sendCircleCardConnectionRequestAction", "acceptCircleCardConnectionRequestAction"]
  ])("protects %s with the authoritative public target predicate", (name, nextName) => {
    expect(exportedActionSource(name, nextName)).toContain(
      "enforcePublicCircleCardTargetAccess"
    );
  });

  it("protects card-link resolution and Wallet testimonial submission", () => {
    expect(
      exportedActionSource("resolveCircleCardLinkAction", "sendCircleCardConnectionRequestAction")
    ).toContain("isPublicCircleCardTargetWithinOwnerPlan");
    expect(
      exportedActionSource(
        "submitCircleCardWalletTestimonialAction",
        "approveCircleCardWalletTestimonialAction"
      )
    ).toContain("isPublicCircleCardTargetWithinOwnerPlan");
  });

  it("batch-filters dashboard discovery and scanned-card matches", () => {
    expect(dashboardSource).toContain("filterPublicCircleCardTargetsWithinOwnerPlans");
    expect(dashboardSource).toContain("planVisibleExternalCardIds");
    expect(scannerSource).toContain("filterPublicCircleCardTargetsWithinOwnerPlans(matches)");
  });

  it("uses the same plan selection before direct public rendering", () => {
    expect(publicCardSource).toContain("selectCircleCardsWithinPlan(");
    expect(publicCardSource).toContain("planVisibleOwnerCards.some");
  });

  it("removes locked Wallet cards from testimonial and relationship target surfaces", () => {
    expect(walletPageSource).toContain("filterPublicCircleCardTargetsWithinOwnerPlans");
    expect(walletPageSource).toContain("planVisibleWalletCardIds");
    expect(testimonialPageSource).toContain("filterPublicCircleCardTargetsWithinOwnerPlans");
    expect(testimonialPageSource).toContain("planVisibleTargetIds");
  });

  it("guards reports and future file-link delivery at the server boundary", () => {
    expect(reportActionSource).toContain("isPublicCircleCardTargetWithinOwnerPlan(card)");
    expect(linkFileRouteSource).toContain("isPublicCircleCardTargetWithinOwnerPlan");
    expect(linkAccessRouteSource).toContain("isPublicCircleCardTargetWithinOwnerPlan");
  });
});

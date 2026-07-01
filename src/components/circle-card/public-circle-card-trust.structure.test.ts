import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const profile = readFileSync(
  join(root, "src/components/circle-card/public-circle-card-profile.tsx"),
  "utf8"
);
const dashboard = readFileSync(
  join(root, "src/app/(member)/dashboard/circle-card/page.tsx"),
  "utf8"
);
const walletForm = readFileSync(
  join(root, "src/components/circle-card/circle-card-wallet-testimonial-form.tsx"),
  "utf8"
);
const publicService = readFileSync(
  join(root, "src/server/circle-card/public-card.service.ts"),
  "utf8"
);
const directFlow = readFileSync(
  join(root, "src/app/(member)/dashboard/circle-card/testimonial/page.tsx"),
  "utf8"
);
const loginForm = readFileSync(join(root, "src/components/auth/login-form.tsx"), "utf8");
const loginPage = readFileSync(join(root, "src/app/(auth)/login/page.tsx"), "utf8");
const sectionRouter = readFileSync(
  join(root, "src/components/circle-card/circle-card-section-router.tsx"),
  "utf8"
);

describe("public Circle Card trust journey", () => {
  it("renders honest trust score content and both public testimonial entry points", () => {
    expect(profile).toContain('id="circle-card-trust"');
    expect(profile).toContain("circleCardTrustSummary(card.approvedWalletTestimonialCount)");
    expect(profile).toContain("verified connection testimonial");
    expect(profile).toContain('id="circle-card-testimonial"');
    expect(profile).toContain("Already connected? Share your experience.");
    expect(profile).toContain("testimonialLoginHref");
    expect(profile).toContain("testimonialFlowHref");
  });

  it("places the lower testimonial CTA before every QR/share section", () => {
    expect(profile.match(/renderTestimonialCta\(\)/g)).toHaveLength(4);
    expect(profile.match(/renderTestimonialCta\(\)\}\s*\{renderShareQrSection/g)).toHaveLength(3);
  });

  it("opens a dedicated target-preserving flow and keeps the wallet panel obvious", () => {
    expect(dashboard).toContain("testimonialForCardId");
    expect(dashboard).toContain('if (value === "wallet")');
    expect(walletForm).toContain("initialTargetCardId");
    expect(walletForm).toContain("hasPendingTestimonial");
    expect(walletForm).toContain("You’ve already sent a testimonial for approval.");
    expect(directFlow).toContain("Leave a testimonial for ${targetName}");
    expect(directFlow).toContain("Save to wallet and continue");
    expect(directFlow).toContain("You cannot leave a testimonial for your own card.");
    expect(directFlow).toContain("initialTargetCardId={selectedContact?.targetCardId ?? \"\"}");
  });

  it("preserves testimonial intent through login, registration, and legacy wallet links", () => {
    expect(profile).toContain("testimonialLoginHref");
    expect(loginForm).toContain("returnTo=${encodeURIComponent(safeFrom)}");
    expect(loginPage).toContain("returnTo=${encodeURIComponent(from)}");
    expect(sectionRouter).toContain('requestedSection === "wallet" ? "network"');
  });

  it("publishes approved wallet proof only and keeps pending or rejected proof private", () => {
    expect(publicService).toContain('where: { status: "APPROVED" }');
    expect(publicService).toContain("averageWalletTestimonialRating");
    expect(publicService).not.toContain('where: { status: "REJECTED" }');
  });
});

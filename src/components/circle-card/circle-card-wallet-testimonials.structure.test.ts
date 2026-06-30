import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  join(root, "prisma/migrations/20260630230000_wallet_testimonials_trust_score/migration.sql"),
  "utf8"
);
const actions = readFileSync(join(root, "src/actions/circle-card.actions.ts"), "utf8");
const dashboard = readFileSync(join(root, "src/app/(member)/dashboard/circle-card/page.tsx"), "utf8");
const walletForm = readFileSync(
  join(root, "src/components/circle-card/circle-card-wallet-testimonial-form.tsx"),
  "utf8"
);
const reviewManager = readFileSync(
  join(root, "src/components/circle-card/circle-card-reviews-manager.tsx"),
  "utf8"
);
const publicService = readFileSync(join(root, "src/server/circle-card/public-card.service.ts"), "utf8");

describe("Circle Card wallet testimonial trust workflow", () => {
  it("stores relational approval state and enforces one pending testimonial", () => {
    expect(schema).toContain("model CircleCardWalletTestimonial");
    expect(schema).toContain("walletVerifiedAt");
    expect(migration).toContain("CircleCardWalletTestimonial_one_pending_per_reviewer_target");
    expect(migration).toContain('WHERE "status" = \'PENDING\'');
  });

  it("rechecks wallet ownership, self-review, visibility and duplicate pending server-side", () => {
    expect(actions).toContain("prisma.circleWalletContact.findFirst");
    expect(actions).toContain("userId: { not: user.id }");
    expect(actions).toContain('cardType: "BUSINESS"');
    expect(actions).toContain("isPublished: true");
    expect(actions).toContain("archivedAt: null");
    expect(actions).toContain('status: "PENDING"');
    expect(actions).toContain("wallet-testimonial-pending-exists");
  });

  it("shows wallet entry and owner approval without publishing pending records", () => {
    expect(dashboard).toContain("walletTestimonialContacts");
    expect(walletForm).toContain("Search people in your wallet");
    expect(reviewManager).toContain("Pending wallet testimonials");
    expect(reviewManager).toContain("approveCircleCardWalletTestimonialAction");
    expect(reviewManager).toContain("rejectCircleCardWalletTestimonialAction");
    expect(publicService).toContain('where: { status: "APPROVED" }');
    expect(publicService).toContain("approvedWalletTestimonialCount");
    expect(publicService).toContain("verifiedConnection: Boolean(testimonial.walletVerifiedAt)");
  });
});

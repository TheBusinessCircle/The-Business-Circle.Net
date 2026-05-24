import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("admin testimonial request structure", () => {
  it("includes the review request link card with copyable URL and message", () => {
    const source = readSource("src/app/(admin)/admin/testimonials/page.tsx");

    expect(source).toContain("Review Request Link");
    expect(source).toContain("reviewRequestUrl");
    expect(source).toContain("Copy suggested message");
    expect(source).toContain("Google review link is not configured.");
    expect(source).toContain("stats.googleClicks");
    expect(source).toContain("`${SITE_CONFIG.url}/testimonial`");
  });

  it("includes the non-member testimonial request form and server action", () => {
    const source = readSource("src/app/(admin)/admin/testimonials/page.tsx");

    expect(source).toContain("Send Non-Member Testimonial Request");
    expect(source).toContain("sendTestimonialRequestEmailAction");
    expect(source).toContain('name="recipientName"');
    expect(source).toContain('name="recipientEmail"');
    expect(source).toContain('name="companyName"');
    expect(source).toContain('name="auditBusinessName"');
    expect(source).toContain('name="contextNote"');
    expect(source).toContain("TestimonialProofType.GROWTH_ARCHITECT");
  });

  it("selects the external request permission fields for the admin review queue", () => {
    const service = readSource("src/server/testimonials/testimonial.service.ts");

    expect(service).toContain("adminTestimonialSelect");
    expect(service).toContain("export type AdminTestimonial");
    expect(service).toContain("allowDisplayName: true");
    expect(service).toContain("allowDisplayCompany: true");
    expect(service).toContain("allowDisplayRole: true");
    expect(service).toContain("allowDisplayTestimonial: true");
    expect(service).toContain("allowMarketingUse: true");
    expect(service).toContain("roleTitle: true");
    expect(service).toContain("companyName: true");
    expect(service).toContain("sourceType: true");
    expect(service).toContain("isExternalRequest: true");
    expect(service).toContain("select: adminTestimonialSelect");
  });
});

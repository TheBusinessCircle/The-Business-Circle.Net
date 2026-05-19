import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("admin testimonial request structure", () => {
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
});

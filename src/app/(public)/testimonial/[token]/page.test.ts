import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TestimonialProofType,
  TestimonialSourceType,
  TestimonialStatus
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getExternalTestimonialRequestByTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/actions/testimonial.actions", () => ({
  submitExternalTestimonialAction: vi.fn()
}));

vi.mock("@/server/testimonials", () => ({
  getExternalTestimonialRequestByToken: getExternalTestimonialRequestByTokenMock
}));

import ExternalTestimonialPage from "@/app/(public)/testimonial/[token]/page";

async function renderPage(input: {
  token: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const element = await ExternalTestimonialPage({
    params: Promise.resolve({ token: input.token }),
    searchParams: Promise.resolve(input.searchParams ?? {})
  });

  return renderToStaticMarkup(element as ReactElement);
}

describe("external testimonial token page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the valid testimonial request form", async () => {
    getExternalTestimonialRequestByTokenMock.mockResolvedValue({
      id: "testimonial_1",
      sourceType: TestimonialSourceType.EXTERNAL_REQUEST,
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      status: TestimonialStatus.PENDING,
      authorName: "Jordan Client",
      authorRole: "Founder",
      businessName: "Client Studio",
      businessWebsite: "https://client.example.com",
      submittedEmail: "jordan@example.com",
      quote: "",
      outcome: null
    });

    const markup = await renderPage({ token: "token_valid_123456" });

    expect(markup).toContain("Share your experience for review");
    expect(markup).toContain("Jordan Client");
    expect(markup).toContain("jordan@example.com");
    expect(markup).toContain("Send testimonial for review");
  });

  it("shows a safe error for an invalid token", async () => {
    getExternalTestimonialRequestByTokenMock.mockResolvedValue(null);

    const markup = await renderPage({ token: "invalid_token" });

    expect(markup).toContain("This testimonial link is unavailable");
    expect(markup).not.toContain("Share your experience for review");
  });
});

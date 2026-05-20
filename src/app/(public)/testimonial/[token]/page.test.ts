import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TestimonialProofType,
  TestimonialSourceType,
  TestimonialStatus
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getExternalTestimonialRequestByTokenMock = vi.hoisted(() => vi.fn());
const getTestimonialCopyStateMock = vi.hoisted(() => vi.fn());

vi.mock("@/actions/testimonial.actions", () => ({
  submitExternalTestimonialAction: vi.fn()
}));

vi.mock("@/server/testimonials", () => ({
  externalTestimonialRequestIsAvailable: (request: {
    sourceType: TestimonialSourceType;
    status: TestimonialStatus;
    quote: string;
    completedAt?: Date | null;
    requestExpiresAt?: Date | null;
  } | null) =>
    Boolean(
      request &&
        ["EXTERNAL_REQUEST", "NON_MEMBER", "AUDIT_CLIENT"].includes(String(request.sourceType)) &&
        String(request.status) !== "ARCHIVED" &&
        !request.completedAt &&
        !request.quote.trim() &&
        (!request.requestExpiresAt || request.requestExpiresAt > new Date())
    ),
  getExternalTestimonialRequestByToken: getExternalTestimonialRequestByTokenMock,
  getTestimonialCopyState: getTestimonialCopyStateMock
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
      sourceType: TestimonialSourceType.AUDIT_CLIENT,
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      status: TestimonialStatus.PENDING,
      authorName: "Jordan Client",
      authorRole: "Founder",
      businessName: "Client Studio",
      companyName: "Client Studio",
      roleTitle: "Founder",
      businessWebsite: "https://client.example.com",
      submittedEmail: "jordan@example.com",
      recipientName: "Jordan Client",
      recipientEmail: "jordan@example.com",
      submittedByName: "Jordan Client",
      submittedByEmail: "jordan@example.com",
      quote: "",
      outcome: null,
      completedAt: null,
      requestExpiresAt: new Date("2099-01-01T00:00:00Z")
    });

    const markup = await renderPage({ token: "token_valid_123456" });

    expect(markup).toContain("Share your experience for review");
    expect(markup).toContain("Jordan Client");
    expect(markup).not.toContain('value="jordan@example.com"');
    expect(markup).toContain("Public display permissions");
    expect(markup).toContain("Display my testimonial publicly");
    expect(markup).toContain("Display my role/title");
    expect(markup).toContain("Copy testimonial");
    expect(markup).toContain("Submit testimonial");
    expect(markup).toContain("Leave Google review");
    expect(markup).toContain("https://g.page/r/CZfk3NbmnutQEAI/review");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain("Once you have written your testimonial, you can copy it first");
    expect(markup).toContain(
      "You can paste the same testimonial into Google if you are happy to leave it there too."
    );
  });

  it("does not prefill internal requester details as the testimonial giver", async () => {
    getExternalTestimonialRequestByTokenMock.mockResolvedValue({
      id: "testimonial_trevor_regression",
      sourceType: TestimonialSourceType.AUDIT_CLIENT,
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      status: TestimonialStatus.PENDING,
      authorName: "Trevor Smith",
      authorRole: "Founder",
      businessName: "The Business Circle Network",
      companyName: "Client Studio",
      roleTitle: "Founder",
      businessWebsite: "https://thebusinesscircle.net",
      submittedEmail: "trevor@thebusinesscircle.net",
      recipientName: "Jordan Client",
      recipientEmail: "jordan@example.com",
      submittedByName: "Jordan Client",
      submittedByEmail: "jordan@example.com",
      submittedByCompany: "Client Studio",
      quote: "",
      outcome: null,
      completedAt: null,
      requestExpiresAt: new Date("2099-01-01T00:00:00Z")
    });

    const markup = await renderPage({ token: "token_valid_123456" });

    expect(markup).toContain("Jordan Client");
    expect(markup).toContain("Client Studio");
    expect(markup).not.toContain("Trevor Smith");
    expect(markup).not.toContain("trevor@thebusinesscircle.net");
    expect(markup).not.toContain('value="Jordan Client"');
    expect(markup).not.toContain('value="jordan@example.com"');
  });

  it("shows a safe error for an invalid token", async () => {
    getExternalTestimonialRequestByTokenMock.mockResolvedValue(null);

    const markup = await renderPage({ token: "invalid_token" });

    expect(markup).toContain("This testimonial link is unavailable");
    expect(markup).not.toContain("Share your experience for review");
  });

  it("shows the submitted testimonial and Google review CTA after completion", async () => {
    getExternalTestimonialRequestByTokenMock.mockResolvedValue(null);
    getTestimonialCopyStateMock.mockResolvedValue({
      id: "testimonial_1",
      testimonialText: "The audit helped me understand what to fix first and why it mattered.",
      quote: "The audit helped me understand what to fix first and why it mattered."
    });

    const markup = await renderPage({
      token: "token_valid_123456",
      searchParams: {
        submitted: "1",
        testimonialId: "testimonial_1"
      }
    });

    expect(markup).toContain("Thank you");
    expect(markup).toContain("The audit helped me understand what to fix first and why it mattered.");
    expect(markup).toContain("Copy testimonial");
    expect(markup).toContain("Leave Google review");
    expect(markup).toContain("https://g.page/r/CZfk3NbmnutQEAI/review");
    expect(markup).toContain(
      "If you are happy to leave the same words as a Google review, you can copy your testimonial below"
    );
  });

  it("shows unavailable for completed or archived tokens", async () => {
    getExternalTestimonialRequestByTokenMock.mockResolvedValue({
      id: "testimonial_2",
      sourceType: TestimonialSourceType.AUDIT_CLIENT,
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      status: TestimonialStatus.ARCHIVED,
      authorName: "Jordan Client",
      quote: "",
      completedAt: null,
      requestExpiresAt: null
    });

    const markup = await renderPage({ token: "token_archived_123456" });

    expect(markup).toContain("This testimonial link is unavailable");
  });
});

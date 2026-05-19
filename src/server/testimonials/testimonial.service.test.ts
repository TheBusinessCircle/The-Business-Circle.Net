import {
  TestimonialProofType,
  TestimonialSourceType,
  TestimonialStatus
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  testimonial: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  user: {
    findUnique: vi.fn()
  }
}));

const sendTransactionalEmailMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: dbMock
}));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: sendTransactionalEmailMock
}));

import {
  approveTestimonial,
  archiveTestimonial,
  createExternalTestimonial,
  createMemberTestimonial,
  listApprovedTestimonials,
  rejectTestimonial,
  sendTestimonialRequestEmail
} from "@/server/testimonials/testimonial.service";

describe("testimonial service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendTransactionalEmailMock.mockResolvedValue({
      sent: true,
      skipped: false,
      id: "email_1"
    });
  });

  it("creates member testimonials as pending BCN member proof by default", async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: "user_1",
      name: "Alex Owner",
      email: "alex@example.com",
      image: "https://example.com/alex.jpg",
      profile: {
        business: {
          companyName: "Alex Studio",
          website: "https://alex.example.com"
        }
      }
    });
    dbMock.testimonial.create.mockResolvedValue({ id: "testimonial_1" });

    await createMemberTestimonial({
      memberId: "user_1",
      quote: "The Business Circle helped me find clearer context before a decision.",
      outcome: "A better next move.",
      permissionToDisplay: true,
      displayPublicName: true,
      displayBusinessName: true,
      displayProfileImage: false
    });

    expect(dbMock.testimonial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: TestimonialSourceType.MEMBER_PROFILE,
          proofType: TestimonialProofType.BCN_MEMBER,
          status: TestimonialStatus.PENDING,
          memberId: "user_1",
          permissionToDisplay: true
        })
      })
    );
  });

  it("only queries approved testimonials that have display permission", async () => {
    const createdAt = new Date("2026-05-08T10:00:00Z");
    dbMock.testimonial.findMany.mockResolvedValue([
      {
        id: "testimonial_1",
        proofType: TestimonialProofType.BCN_MEMBER,
        quote: "A clearer room made the next decision easier.",
        outcome: null,
        rating: null,
        displayPublicName: false,
        displayBusinessName: false,
        displayProfileImage: false,
        authorName: "Private Member",
        authorRole: "Founder",
        businessName: "Private Ltd",
        businessWebsite: "https://private.example.com",
        imageUrl: "https://example.com/private.jpg",
        approvedAt: createdAt,
        createdAt,
        member: {
          image: "https://example.com/member.jpg"
        }
      }
    ]);

    const testimonials = await listApprovedTestimonials(TestimonialProofType.BCN_MEMBER, 3);

    expect(dbMock.testimonial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: TestimonialStatus.APPROVED,
          permissionToFeaturePublicly: true,
          proofType: TestimonialProofType.BCN_MEMBER
        },
        take: 3
      })
    );
    expect(testimonials[0]).toMatchObject({
      authorName: "Business Circle Member",
      businessName: null,
      imageUrl: null
    });
  });

  it("pending testimonials are excluded from public display queries", async () => {
    dbMock.testimonial.findMany.mockResolvedValue([]);

    await listApprovedTestimonials(TestimonialProofType.BCN_MEMBER, 6);

    expect(dbMock.testimonial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: TestimonialStatus.APPROVED
        })
      })
    );
    expect(dbMock.testimonial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          status: TestimonialStatus.PENDING
        })
      })
    );
  });

  it("testimonials without display permission are excluded from public display queries", async () => {
    dbMock.testimonial.findMany.mockResolvedValue([]);

    await listApprovedTestimonials(TestimonialProofType.GROWTH_ARCHITECT, 6);

    expect(dbMock.testimonial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          permissionToFeaturePublicly: true,
          proofType: TestimonialProofType.GROWTH_ARCHITECT
        })
      })
    );
  });

  it("creates external request testimonials from a token as pending external proof", async () => {
    dbMock.testimonial.findUnique.mockResolvedValue({
      id: "testimonial_1",
      sourceType: TestimonialSourceType.EXTERNAL_REQUEST,
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      quote: ""
    });
    dbMock.testimonial.update.mockResolvedValue({ id: "testimonial_1" });

    await createExternalTestimonial({
      requestToken: "token_1234567890123456",
      authorName: "Client Name",
      authorRole: "Founder",
      businessName: "Client Studio",
      businessWebsite: "https://client.example.com",
      quote: "The Growth Architect work helped us name the real constraint.",
      outcome: "A clearer action order.",
      submittedEmail: "client@example.com",
      permissionToDisplay: true,
      displayPublicName: true,
      displayBusinessName: true
    });

    expect(dbMock.testimonial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "testimonial_1" },
        data: expect.objectContaining({
          sourceType: TestimonialSourceType.EXTERNAL_REQUEST,
          status: TestimonialStatus.PENDING,
          quote: "The Growth Architect work helped us name the real constraint.",
          permissionToDisplay: true,
          approvedAt: null,
          approvedByAdminId: null,
          displayProfileImage: false
        })
      })
    );
  });

  it("admin can generate a testimonial request token and send the request email", async () => {
    dbMock.testimonial.create.mockResolvedValue({
      id: "testimonial_request_1",
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      sourceType: TestimonialSourceType.AUDIT_CLIENT,
      status: TestimonialStatus.PENDING,
      authorName: "Jordan Client",
      quote: "",
      requestToken: "token_1234567890abcdef",
      submittedEmail: "jordan@example.com"
    });

    const result = await sendTestimonialRequestEmail({
      recipientName: "Jordan Client",
      recipientEmail: "jordan@example.com",
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      companyName: "Jordan Studio",
      auditBusinessName: "Growth audit",
      contextNote: "A short note about the strategy work.",
      requestedByAdminId: "admin_1"
    });

    expect(dbMock.testimonial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: TestimonialSourceType.AUDIT_CLIENT,
          proofType: TestimonialProofType.GROWTH_ARCHITECT,
          status: TestimonialStatus.PENDING,
          authorName: "Jordan Client",
          quote: "",
          permissionToDisplay: false,
          submittedEmail: "jordan@example.com",
          recipientName: "Jordan Client",
          recipientEmail: "jordan@example.com",
          companyName: "Jordan Studio",
          auditBusinessName: "Growth audit",
          isExternalRequest: true,
          requestedByAdminId: "admin_1",
          adminNotes: "A short note about the strategy work.",
          requestToken: expect.any(String)
        })
      })
    );
    expect(result.requestToken).toBe("token_1234567890abcdef");
    expect(dbMock.testimonial.create.mock.calls[0]?.[0].data.requestToken).not.toBe(
      "bcn_test_preview_token"
    );
    expect(result.testimonialUrl).toBe(
      "https://thebusinesscircle.net/testimonial/token_1234567890abcdef"
    );
  });

  it("testimonial request email payload contains the secure submission link", async () => {
    dbMock.testimonial.create.mockResolvedValue({
      id: "testimonial_request_2",
      proofType: TestimonialProofType.BCN_MEMBER,
      sourceType: TestimonialSourceType.EXTERNAL_REQUEST,
      status: TestimonialStatus.PENDING,
      authorName: "Alex Member",
      quote: "",
      requestToken: "token_bcn_1234567890",
      submittedEmail: "alex@example.com"
    });

    await sendTestimonialRequestEmail({
      recipientName: "Alex Member",
      recipientEmail: "alex@example.com",
      proofType: TestimonialProofType.BCN_MEMBER,
      requestedByAdminId: "admin_1"
    });

    const emailPayload = sendTransactionalEmailMock.mock.calls[0]?.[0];

    expect(emailPayload).toMatchObject({
      to: "alex@example.com",
      subject: "Could you share a few words about The Business Circle?"
    });
    expect(emailPayload.text).toContain(
      "https://thebusinesscircle.net/testimonial/token_bcn_1234567890"
    );
    expect(emailPayload.html).toContain(
      "https://thebusinesscircle.net/testimonial/token_bcn_1234567890"
    );
  });

  it("external testimonial submission remains pending and does not auto approve", async () => {
    dbMock.testimonial.findUnique.mockResolvedValue({
      id: "testimonial_2",
      sourceType: TestimonialSourceType.EXTERNAL_REQUEST,
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      quote: ""
    });
    dbMock.testimonial.update.mockResolvedValue({ id: "testimonial_2" });

    await createExternalTestimonial({
      requestToken: "token_external_123456",
      authorName: "Client Name",
      quote: "The work helped us make the next decision with more confidence.",
      permissionToDisplay: true
    });

    expect(dbMock.testimonial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TestimonialStatus.PENDING,
          approvedAt: null,
          approvedByAdminId: null
        })
      })
    );
    expect(dbMock.testimonial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          status: TestimonialStatus.APPROVED
        })
      })
    );
  });

  it("allows audit-client token submissions once and records display permissions", async () => {
    dbMock.testimonial.findUnique.mockResolvedValue({
      id: "testimonial_3",
      sourceType: TestimonialSourceType.AUDIT_CLIENT,
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      status: TestimonialStatus.PENDING,
      quote: "",
      completedAt: null,
      requestExpiresAt: new Date("2099-01-01T00:00:00Z"),
      recipientEmail: "client@example.com",
      companyName: "Client Studio",
      roleTitle: "Founder",
      isExternalRequest: true
    });
    dbMock.testimonial.update.mockResolvedValue({ id: "testimonial_3" });

    await createExternalTestimonial({
      requestToken: "token_audit_client_123456",
      authorName: "Client Name",
      authorRole: "Founder",
      businessName: "Client Studio",
      quote: "The audit made the next steps clearer and easier to prioritise.",
      submittedEmail: "client@example.com",
      allowDisplayName: true,
      allowDisplayCompany: true,
      allowDisplayRole: true,
      allowDisplayTestimonial: true,
      allowMarketingUse: true
    });

    expect(dbMock.testimonial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "testimonial_3" },
        data: expect.objectContaining({
          sourceType: TestimonialSourceType.AUDIT_CLIENT,
          status: TestimonialStatus.PENDING,
          allowDisplayName: true,
          allowDisplayCompany: true,
          allowDisplayRole: true,
          allowDisplayTestimonial: true,
          allowMarketingUse: true,
          permissionToFeaturePublicly: true,
          permissionToUseInMarketing: true,
          completedAt: expect.any(Date)
        })
      })
    );
  });

  it("rejects duplicate submissions for a completed audit-client token", async () => {
    dbMock.testimonial.findUnique.mockResolvedValue({
      id: "testimonial_4",
      sourceType: TestimonialSourceType.AUDIT_CLIENT,
      proofType: TestimonialProofType.GROWTH_ARCHITECT,
      status: TestimonialStatus.PENDING,
      quote: "Already submitted.",
      completedAt: new Date("2026-05-19T12:00:00Z"),
      requestExpiresAt: new Date("2099-01-01T00:00:00Z")
    });

    await expect(
      createExternalTestimonial({
        requestToken: "token_audit_client_123456",
        authorName: "Client Name",
        quote: "Trying to submit again."
      })
    ).rejects.toThrow("testimonial-request-not-found");
    expect(dbMock.testimonial.update).not.toHaveBeenCalled();
  });

  it("admin approval changes status and records the approving admin", async () => {
    dbMock.testimonial.update.mockResolvedValue({ id: "testimonial_1" });

    await approveTestimonial("testimonial_1", "admin_1");

    expect(dbMock.testimonial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "testimonial_1" },
        data: expect.objectContaining({
          status: TestimonialStatus.APPROVED,
          approvedByAdminId: "admin_1",
          approvedAt: expect.any(Date)
        })
      })
    );
  });

  it("rejected testimonials are excluded from public display queries", async () => {
    dbMock.testimonial.findMany.mockResolvedValue([]);

    await listApprovedTestimonials(TestimonialProofType.GROWTH_ARCHITECT, 6);

    expect(dbMock.testimonial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          status: TestimonialStatus.REJECTED
        })
      })
    );
    expect(dbMock.testimonial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: TestimonialStatus.APPROVED
        })
      })
    );
  });

  it("archived testimonials are excluded from public display queries", async () => {
    dbMock.testimonial.findMany.mockResolvedValue([]);

    await listApprovedTestimonials(undefined, 6);

    expect(dbMock.testimonial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          status: TestimonialStatus.ARCHIVED
        })
      })
    );
    expect(dbMock.testimonial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: TestimonialStatus.APPROVED
        })
      })
    );
  });

  it("reject and archive helpers move testimonials out of public status", async () => {
    dbMock.testimonial.update.mockResolvedValue({ id: "testimonial_1" });

    await rejectTestimonial("testimonial_1");
    await archiveTestimonial("testimonial_1");

    expect(dbMock.testimonial.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ status: TestimonialStatus.REJECTED })
      })
    );
    expect(dbMock.testimonial.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: { status: TestimonialStatus.ARCHIVED }
      })
    );
  });
});

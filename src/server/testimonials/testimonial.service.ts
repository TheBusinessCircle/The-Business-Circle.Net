import "server-only";

import { randomBytes } from "node:crypto";
import { createElement } from "react";
import {
  Prisma,
  TestimonialProofType,
  TestimonialSourceType,
  TestimonialStatus
} from "@prisma/client";
import { TestimonialRequestEmail } from "@/emails";
import { renderEmailHtml } from "@/emails/render";
import { buildBrandedEmailText } from "@/emails/text";
import { SITE_CONFIG } from "@/config/site";
import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email/resend";

export type ApprovedTestimonial = {
  id: string;
  proofType: TestimonialProofType;
  quote: string;
  outcome: string | null;
  rating: number | null;
  authorName: string;
  authorRole: string | null;
  businessName: string | null;
  businessWebsite: string | null;
  imageUrl: string | null;
  approvedAt: Date | null;
  createdAt: Date;
};

export type AdminTestimonialFilters = {
  proofType?: TestimonialProofType;
  status?: TestimonialStatus;
  sourceType?: TestimonialSourceType;
  limit?: number;
};

export type CreateMemberTestimonialInput = {
  memberId: string;
  quote: string;
  outcome?: string | null;
  permissionToDisplay: boolean;
  displayPublicName?: boolean;
  displayBusinessName?: boolean;
  displayProfileImage?: boolean;
};

export type CreateExternalTestimonialInput = {
  requestToken: string;
  authorName: string;
  authorRole?: string | null;
  businessName?: string | null;
  businessWebsite?: string | null;
  quote: string;
  outcome?: string | null;
  submittedEmail?: string | null;
  permissionToDisplay: boolean;
  displayPublicName?: boolean;
  displayBusinessName?: boolean;
};

export type SendTestimonialRequestEmailInput = {
  recipientName: string;
  recipientEmail: string;
  proofType: TestimonialProofType;
  contextNote?: string | null;
  requestedByAdminId: string;
};

export type UpdateAdminTestimonialInput = {
  testimonialId: string;
  quote: string;
  authorName: string;
  authorRole?: string | null;
  businessName?: string | null;
  businessWebsite?: string | null;
  outcome?: string | null;
  proofType: TestimonialProofType;
  status: TestimonialStatus;
  permissionToDisplay: boolean;
  displayPublicName: boolean;
  displayBusinessName: boolean;
  displayProfileImage: boolean;
  adminNotes?: string | null;
  adminId?: string | null;
};

function testimonialProofLabel(proofType: TestimonialProofType) {
  if (proofType === TestimonialProofType.BCN_MEMBER) {
    return "The Business Circle";
  }

  if (proofType === TestimonialProofType.GROWTH_ARCHITECT) {
    return "Growth Architect work";
  }

  return "The Business Circle Network";
}

function testimonialSubjectContext(proofType: TestimonialProofType) {
  if (proofType === TestimonialProofType.BCN_MEMBER) {
    return "bcn" as const;
  }

  if (proofType === TestimonialProofType.GROWTH_ARCHITECT) {
    return "growth" as const;
  }

  return "general" as const;
}

export function testimonialRequestSubject(proofType: TestimonialProofType) {
  if (proofType === TestimonialProofType.BCN_MEMBER) {
    return "Could you share a few words about The Business Circle?";
  }

  if (proofType === TestimonialProofType.GROWTH_ARCHITECT) {
    return "Could you share a few words about working with Trevor?";
  }

  return "Could you share a few words about your experience?";
}

export function buildTestimonialRequestUrl(requestToken: string) {
  return new URL(`/testimonial/${encodeURIComponent(requestToken)}`, SITE_CONFIG.url).toString();
}

function buildTestimonialRequestText(input: {
  recipientName: string;
  proofType: TestimonialProofType;
  testimonialUrl: string;
  contextNote?: string | null;
}) {
  const proofLabel = testimonialProofLabel(input.proofType);
  const bodyLines = [
    `Hi ${input.recipientName.trim().split(/\s+/)[0] || input.recipientName.trim()},`,
    "",
    `I hope you are well. This is a simple request for a short testimonial for ${proofLabel}.`,
    "A few honest sentences about what became clearer, easier, or more useful is enough.",
    "Your response is reviewed before anything is displayed publicly.",
    "You can choose which name and business details may be shown."
  ];

  if (input.contextNote?.trim()) {
    bodyLines.push("", "Context:", input.contextNote.trim());
  }

  return buildBrandedEmailText({
    eyebrow: "Testimonial request",
    heading: "Could you share a few words?",
    bodyLines,
    ctaLabel: "Share your testimonial",
    ctaUrl: input.testimonialUrl,
    fallbackNotice: "If the button does not work, copy and paste the link above into your browser."
  });
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function normalizeRequiredText(value: string) {
  return value.trim();
}

function createRequestToken() {
  return randomBytes(24).toString("hex");
}

function toApprovedTestimonial(
  testimonial: Prisma.TestimonialGetPayload<{
    include: {
      member: {
        select: {
          image: true;
        };
      };
    };
  }>
): ApprovedTestimonial {
  const fallbackAuthor =
    testimonial.proofType === TestimonialProofType.BCN_MEMBER
      ? "Business Circle Member"
      : "Business Circle Client";

  return {
    id: testimonial.id,
    proofType: testimonial.proofType,
    quote: testimonial.quote,
    outcome: testimonial.outcome,
    rating: testimonial.rating,
    authorName: testimonial.displayPublicName ? testimonial.authorName : fallbackAuthor,
    authorRole: testimonial.displayPublicName ? testimonial.authorRole : null,
    businessName: testimonial.displayBusinessName ? testimonial.businessName : null,
    businessWebsite: testimonial.displayBusinessName ? testimonial.businessWebsite : null,
    imageUrl: testimonial.displayProfileImage
      ? testimonial.imageUrl ?? testimonial.member?.image ?? null
      : null,
    approvedAt: testimonial.approvedAt,
    createdAt: testimonial.createdAt
  };
}

export async function listApprovedTestimonials(
  proofType?: TestimonialProofType,
  limit = 6
): Promise<ApprovedTestimonial[]> {
  const testimonials = await db.testimonial.findMany({
    where: {
      status: TestimonialStatus.APPROVED,
      permissionToDisplay: true,
      ...(proofType ? { proofType } : {})
    },
    include: {
      member: {
        select: {
          image: true
        }
      }
    },
    orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(limit, 1), 24)
  });

  return testimonials.map(toApprovedTestimonial);
}

export async function listAdminTestimonials(filters: AdminTestimonialFilters = {}) {
  const where: Prisma.TestimonialWhereInput = {
    ...(filters.proofType ? { proofType: filters.proofType } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.sourceType ? { sourceType: filters.sourceType } : {})
  };

  return db.testimonial.findMany({
    where,
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      requestedByAdmin: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      approvedByAdmin: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(filters.limit ?? 100, 1), 200)
  });
}

export async function getLatestMemberTestimonial(memberId: string) {
  return db.testimonial.findFirst({
    where: {
      memberId,
      sourceType: TestimonialSourceType.MEMBER_PROFILE
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function createMemberTestimonial(input: CreateMemberTestimonialInput) {
  const member = await db.user.findUnique({
    where: {
      id: input.memberId
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      profile: {
        select: {
          business: {
            select: {
              companyName: true,
              website: true
            }
          }
        }
      }
    }
  });

  if (!member) {
    throw new Error("testimonial-member-not-found");
  }

  return db.testimonial.create({
    data: {
      sourceType: TestimonialSourceType.MEMBER_PROFILE,
      proofType: TestimonialProofType.BCN_MEMBER,
      status: TestimonialStatus.PENDING,
      memberId: member.id,
      authorName: member.name || member.email,
      businessName: member.profile?.business?.companyName ?? null,
      businessWebsite: member.profile?.business?.website ?? null,
      quote: normalizeRequiredText(input.quote),
      outcome: normalizeOptionalText(input.outcome),
      permissionToDisplay: input.permissionToDisplay,
      displayPublicName: input.displayPublicName ?? true,
      displayBusinessName: input.displayBusinessName ?? true,
      displayProfileImage: input.displayProfileImage ?? false,
      imageUrl: member.image ?? null,
      submittedEmail: member.email
    }
  });
}

export async function createExternalTestimonialRequest(input: {
  proofType: TestimonialProofType;
  authorName?: string | null;
  authorRole?: string | null;
  businessName?: string | null;
  businessWebsite?: string | null;
  submittedEmail?: string | null;
  requestedByAdminId?: string | null;
  adminNotes?: string | null;
}) {
  return db.testimonial.create({
    data: {
      sourceType: TestimonialSourceType.EXTERNAL_REQUEST,
      proofType: input.proofType,
      status: TestimonialStatus.PENDING,
      authorName: normalizeOptionalText(input.authorName) ?? "Client testimonial request",
      authorRole: normalizeOptionalText(input.authorRole),
      businessName: normalizeOptionalText(input.businessName),
      businessWebsite: normalizeOptionalText(input.businessWebsite),
      quote: "",
      permissionToDisplay: false,
      displayPublicName: true,
      displayBusinessName: true,
      displayProfileImage: false,
      submittedEmail: normalizeOptionalText(input.submittedEmail),
      requestToken: createRequestToken(),
      requestedByAdminId: normalizeOptionalText(input.requestedByAdminId),
      adminNotes: normalizeOptionalText(input.adminNotes)
    }
  });
}

export async function sendTestimonialRequestEmail(input: SendTestimonialRequestEmailInput) {
  const request = await createExternalTestimonialRequest({
    proofType: input.proofType,
    authorName: input.recipientName,
    submittedEmail: input.recipientEmail,
    requestedByAdminId: input.requestedByAdminId,
    adminNotes: input.contextNote
  });
  const requestToken = request.requestToken;

  if (!requestToken) {
    throw new Error("testimonial-request-token-missing");
  }

  const testimonialUrl = buildTestimonialRequestUrl(requestToken);
  const proofLabel = testimonialProofLabel(input.proofType);
  const subject = testimonialRequestSubject(input.proofType);
  const html = await renderEmailHtml(
    createElement(TestimonialRequestEmail, {
      recipientName: input.recipientName,
      proofLabel,
      testimonialUrl,
      contextNote: input.contextNote,
      subjectContext: testimonialSubjectContext(input.proofType)
    })
  );
  const text = buildTestimonialRequestText({
    recipientName: input.recipientName,
    proofType: input.proofType,
    testimonialUrl,
    contextNote: input.contextNote
  });
  const email = await sendTransactionalEmail({
    to: input.recipientEmail,
    subject,
    html,
    text,
    tags: [
      { name: "type", value: "testimonial-request" },
      { name: "proof_type", value: input.proofType },
      { name: "source", value: "admin" }
    ]
  });

  return {
    request,
    requestToken,
    testimonialUrl,
    subject,
    email
  };
}

export async function getExternalTestimonialRequestByToken(requestToken: string) {
  return db.testimonial.findUnique({
    where: {
      requestToken
    }
  });
}

export async function createExternalTestimonial(input: CreateExternalTestimonialInput) {
  const existing = await db.testimonial.findUnique({
    where: {
      requestToken: input.requestToken
    }
  });

  if (!existing || existing.sourceType !== TestimonialSourceType.EXTERNAL_REQUEST) {
    throw new Error("testimonial-request-not-found");
  }

  if (existing.quote.trim().length > 0) {
    throw new Error("testimonial-request-completed");
  }

  return db.testimonial.update({
    where: {
      id: existing.id
    },
    data: {
      sourceType: TestimonialSourceType.EXTERNAL_REQUEST,
      status: TestimonialStatus.PENDING,
      authorName: normalizeRequiredText(input.authorName),
      authorRole: normalizeOptionalText(input.authorRole),
      businessName: normalizeOptionalText(input.businessName),
      businessWebsite: normalizeOptionalText(input.businessWebsite),
      quote: normalizeRequiredText(input.quote),
      outcome: normalizeOptionalText(input.outcome),
      submittedEmail: normalizeOptionalText(input.submittedEmail),
      permissionToDisplay: input.permissionToDisplay,
      displayPublicName: input.displayPublicName ?? true,
      displayBusinessName: input.displayBusinessName ?? true,
      displayProfileImage: false,
      approvedAt: null,
      approvedByAdminId: null
    }
  });
}

export async function updateAdminTestimonial(input: UpdateAdminTestimonialInput) {
  return db.testimonial.update({
    where: {
      id: input.testimonialId
    },
    data: {
      quote: normalizeRequiredText(input.quote),
      authorName: normalizeRequiredText(input.authorName),
      authorRole: normalizeOptionalText(input.authorRole),
      businessName: normalizeOptionalText(input.businessName),
      businessWebsite: normalizeOptionalText(input.businessWebsite),
      outcome: normalizeOptionalText(input.outcome),
      proofType: input.proofType,
      status: input.status,
      permissionToDisplay: input.permissionToDisplay,
      displayPublicName: input.displayPublicName,
      displayBusinessName: input.displayBusinessName,
      displayProfileImage: input.displayProfileImage,
      adminNotes: normalizeOptionalText(input.adminNotes),
      ...(input.status === TestimonialStatus.APPROVED
        ? {
            approvedAt: new Date(),
            approvedByAdminId: normalizeOptionalText(input.adminId)
          }
        : {})
    }
  });
}

export async function approveTestimonial(testimonialId: string, approvedByAdminId: string) {
  return db.testimonial.update({
    where: {
      id: testimonialId
    },
    data: {
      status: TestimonialStatus.APPROVED,
      approvedByAdminId,
      approvedAt: new Date()
    }
  });
}

export async function rejectTestimonial(testimonialId: string) {
  return db.testimonial.update({
    where: {
      id: testimonialId
    },
    data: {
      status: TestimonialStatus.REJECTED
    }
  });
}

export async function archiveTestimonial(testimonialId: string) {
  return db.testimonial.update({
    where: {
      id: testimonialId
    },
    data: {
      status: TestimonialStatus.ARCHIVED
    }
  });
}

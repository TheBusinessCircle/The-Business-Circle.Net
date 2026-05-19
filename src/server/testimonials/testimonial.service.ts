import "server-only";

import { randomBytes } from "node:crypto";
import { createElement } from "react";
import {
  Prisma,
  TestimonialCategory,
  TestimonialDisplayLocation,
  TestimonialProofType,
  TestimonialSource,
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
  category: TestimonialCategory;
  displayLocation: TestimonialDisplayLocation;
  quote: string;
  outcome: string | null;
  rating: number | null;
  authorName: string;
  authorRole: string | null;
  businessName: string | null;
  businessWebsite: string | null;
  imageUrl: string | null;
  isHighlighted: boolean;
  approvedAt: Date | null;
  createdAt: Date;
};

export type AdminTestimonialFilters = {
  proofType?: TestimonialProofType;
  status?: TestimonialStatus;
  sourceType?: TestimonialSourceType;
  source?: TestimonialSource;
  category?: TestimonialCategory;
  displayLocation?: TestimonialDisplayLocation;
  rating?: number;
  highlighted?: boolean;
  search?: string;
  limit?: number;
};

export type CreateMemberTestimonialInput = {
  memberId: string;
  quote: string;
  outcome?: string | null;
  category?: TestimonialCategory;
  displayLocation?: TestimonialDisplayLocation;
  rating?: number | null;
  submittedByCompany?: string | null;
  submittedByRole?: string | null;
  submittedByWebsite?: string | null;
  submittedByLinkedIn?: string | null;
  permissionToFeaturePublicly?: boolean;
  permissionToUseName?: boolean;
  permissionToUseCompany?: boolean;
  permissionToUseImage?: boolean;
  permissionToUseInMarketing?: boolean;
  permissionToDisplay?: boolean;
  displayPublicName?: boolean;
  displayBusinessName?: boolean;
  displayProfileImage?: boolean;
};

export type CreateExternalTestimonialInput = {
  requestToken?: string | null;
  authorName: string;
  authorRole?: string | null;
  businessName?: string | null;
  businessWebsite?: string | null;
  submittedByLinkedIn?: string | null;
  quote: string;
  outcome?: string | null;
  submittedEmail?: string | null;
  category?: TestimonialCategory;
  displayLocation?: TestimonialDisplayLocation;
  rating?: number | null;
  source?: TestimonialSource;
  permissionToFeaturePublicly?: boolean;
  permissionToUseName?: boolean;
  permissionToUseCompany?: boolean;
  permissionToUseImage?: boolean;
  permissionToUseInMarketing?: boolean;
  allowDisplayName?: boolean;
  allowDisplayCompany?: boolean;
  allowDisplayRole?: boolean;
  allowDisplayTestimonial?: boolean;
  allowMarketingUse?: boolean;
  permissionToDisplay?: boolean;
  displayPublicName?: boolean;
  displayBusinessName?: boolean;
  trackingSource?: string | null;
  campaign?: string | null;
  ref?: string | null;
};

export type SendTestimonialRequestEmailInput = {
  recipientName: string;
  recipientEmail: string;
  proofType: TestimonialProofType;
  companyName?: string | null;
  auditBusinessName?: string | null;
  contextNote?: string | null;
  requestedByAdminId: string;
  sourceType?: TestimonialSourceType;
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
  category: TestimonialCategory;
  displayLocation: TestimonialDisplayLocation;
  status: TestimonialStatus;
  permissionToDisplay: boolean;
  permissionToFeaturePublicly: boolean;
  permissionToUseName: boolean;
  permissionToUseCompany: boolean;
  permissionToUseImage: boolean;
  permissionToUseInMarketing: boolean;
  allowDisplayName?: boolean;
  allowDisplayCompany?: boolean;
  allowDisplayRole?: boolean;
  allowDisplayTestimonial?: boolean;
  allowMarketingUse?: boolean;
  displayPublicName: boolean;
  displayBusinessName: boolean;
  displayProfileImage: boolean;
  isHighlighted: boolean;
  rating?: number | null;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  adminId?: string | null;
};

export type UpdateReviewSettingsInput = {
  googleReviewUrl?: string | null;
  googleReviewEnabled: boolean;
  showGoogleReviewButton: boolean;
  googleReviewButtonLabel: string;
  googleReviewPendingMessage: string;
  internalTestimonialsEnabled: boolean;
  publicTestimonialFormEnabled: boolean;
  requireAdminApproval: boolean;
  homepageTestimonialsEnabled: boolean;
  founderPageTestimonialsEnabled: boolean;
  auditPageTestimonialsEnabled: boolean;
};

export type PublicTestimonialQuery = {
  proofType?: TestimonialProofType;
  category?: TestimonialCategory | TestimonialCategory[];
  location?: TestimonialDisplayLocation;
  highlightedOnly?: boolean;
  limit?: number;
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
    return "Could you share a few words about your Growth Architect audit?";
  }

  return "Could you share a few words about your experience?";
}

export function buildTestimonialRequestUrl(requestToken: string) {
  return new URL(`/testimonial/${encodeURIComponent(requestToken)}`, SITE_CONFIG.url).toString();
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function normalizeRequiredText(value: string) {
  return value.trim();
}

function normalizeRating(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) {
    throw new Error("testimonial-rating-invalid");
  }

  return rounded;
}

function createRequestToken() {
  return randomBytes(24).toString("hex");
}

function requestSourceTypeIsCompletable(sourceType: TestimonialSourceType) {
  return (
    sourceType === TestimonialSourceType.EXTERNAL_REQUEST ||
    sourceType === TestimonialSourceType.NON_MEMBER ||
    sourceType === TestimonialSourceType.AUDIT_CLIENT
  );
}

function testimonialRequestIsUnavailable(testimonial: {
  sourceType: TestimonialSourceType;
  status: TestimonialStatus;
  quote: string;
  completedAt?: Date | null;
  requestExpiresAt?: Date | null;
}) {
  if (!requestSourceTypeIsCompletable(testimonial.sourceType)) {
    return true;
  }

  if (testimonial.status === TestimonialStatus.ARCHIVED) {
    return true;
  }

  if (testimonial.completedAt || testimonial.quote.trim().length > 0) {
    return true;
  }

  return Boolean(testimonial.requestExpiresAt && testimonial.requestExpiresAt < new Date());
}

export function externalTestimonialRequestIsAvailable(testimonial: {
  sourceType: TestimonialSourceType;
  status: TestimonialStatus;
  quote: string;
  completedAt?: Date | null;
  requestExpiresAt?: Date | null;
} | null) {
  return Boolean(testimonial && !testimonialRequestIsUnavailable(testimonial));
}

export function categoryToDisplayLocation(category: TestimonialCategory): TestimonialDisplayLocation {
  if (
    category === TestimonialCategory.GROWTH_ARCHITECT ||
    category === TestimonialCategory.STRATEGY_CALL
  ) {
    return TestimonialDisplayLocation.FOUNDER_PAGE;
  }

  if (category === TestimonialCategory.FOUNDER_AUDIT) {
    return TestimonialDisplayLocation.AUDIT_PAGE;
  }

  if (
    category === TestimonialCategory.BCN_EXPERIENCE ||
    category === TestimonialCategory.COMMUNITY ||
    category === TestimonialCategory.COLLABORATION
  ) {
    return TestimonialDisplayLocation.BCN_HOME;
  }

  return TestimonialDisplayLocation.ANYWHERE;
}

function proofTypeForCategory(category: TestimonialCategory) {
  if (
    category === TestimonialCategory.GROWTH_ARCHITECT ||
    category === TestimonialCategory.FOUNDER_AUDIT ||
    category === TestimonialCategory.STRATEGY_CALL
  ) {
    return TestimonialProofType.GROWTH_ARCHITECT;
  }

  if (
    category === TestimonialCategory.BCN_EXPERIENCE ||
    category === TestimonialCategory.COMMUNITY ||
    category === TestimonialCategory.COLLABORATION
  ) {
    return TestimonialProofType.BCN_MEMBER;
  }

  return TestimonialProofType.GENERAL;
}

function categoryForProofType(proofType: TestimonialProofType) {
  if (proofType === TestimonialProofType.GROWTH_ARCHITECT) {
    return TestimonialCategory.GROWTH_ARCHITECT;
  }

  if (proofType === TestimonialProofType.BCN_MEMBER) {
    return TestimonialCategory.BCN_EXPERIENCE;
  }

  return TestimonialCategory.OTHER;
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
    category: testimonial.category,
    displayLocation: testimonial.displayLocation,
    quote: testimonial.testimonialText || testimonial.quote,
    outcome: testimonial.outcome,
    rating: testimonial.rating,
    authorName: testimonial.permissionToUseName ? testimonial.authorName : fallbackAuthor,
    authorRole: testimonial.allowDisplayRole ? testimonial.authorRole : null,
    businessName: testimonial.permissionToUseCompany ? testimonial.businessName : null,
    businessWebsite: testimonial.permissionToUseCompany ? testimonial.businessWebsite : null,
    imageUrl: testimonial.permissionToUseImage
      ? testimonial.profileImageUrl ?? testimonial.imageUrl ?? testimonial.member?.image ?? null
      : null,
    isHighlighted: testimonial.isHighlighted,
    approvedAt: testimonial.approvedAt,
    createdAt: testimonial.createdAt
  };
}

export async function getReviewSettings() {
  const existing = await db.siteReviewSettings.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });

  if (existing) {
    return existing;
  }

  return db.siteReviewSettings.create({
    data: {}
  });
}

export async function updateReviewSettings(input: UpdateReviewSettingsInput) {
  const settings = await getReviewSettings();

  return db.siteReviewSettings.update({
    where: {
      id: settings.id
    },
    data: {
      googleReviewUrl: normalizeOptionalText(input.googleReviewUrl),
      googleReviewEnabled: input.googleReviewEnabled,
      showGoogleReviewButton: input.showGoogleReviewButton,
      googleReviewButtonLabel:
        normalizeOptionalText(input.googleReviewButtonLabel) ?? "Leave a Google review",
      googleReviewPendingMessage:
        normalizeOptionalText(input.googleReviewPendingMessage) ??
        "Google review link coming soon",
      internalTestimonialsEnabled: input.internalTestimonialsEnabled,
      publicTestimonialFormEnabled: input.publicTestimonialFormEnabled,
      requireAdminApproval: input.requireAdminApproval,
      homepageTestimonialsEnabled: input.homepageTestimonialsEnabled,
      founderPageTestimonialsEnabled: input.founderPageTestimonialsEnabled,
      auditPageTestimonialsEnabled: input.auditPageTestimonialsEnabled
    }
  });
}

export async function listApprovedTestimonials(
  proofTypeOrQuery?: TestimonialProofType | PublicTestimonialQuery,
  limit = 6
): Promise<ApprovedTestimonial[]> {
  const query =
    typeof proofTypeOrQuery === "object" && proofTypeOrQuery !== null
      ? proofTypeOrQuery
      : {
          proofType: proofTypeOrQuery,
          limit
        };
  const categoryFilter = Array.isArray(query.category)
    ? { in: query.category }
    : query.category;

  const testimonials = await db.testimonial.findMany({
    where: {
      status: TestimonialStatus.APPROVED,
      permissionToFeaturePublicly: true,
      ...(query.proofType ? { proofType: query.proofType } : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(query.location
        ? {
            OR: [
              { displayLocation: query.location },
              { displayLocation: TestimonialDisplayLocation.ANYWHERE }
            ]
          }
        : {}),
      ...(query.highlightedOnly ? { isHighlighted: true } : {})
    },
    include: {
      member: {
        select: {
          image: true
        }
      }
    },
    orderBy: [{ isHighlighted: "desc" }, { approvedAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(query.limit ?? limit, 1), 24)
  });

  return testimonials
    .filter((testimonial) => (testimonial.testimonialText || testimonial.quote).trim().length > 0)
    .map(toApprovedTestimonial);
}

export async function listAdminTestimonials(filters: AdminTestimonialFilters = {}) {
  const where: Prisma.TestimonialWhereInput = {
    ...(filters.proofType ? { proofType: filters.proofType } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.displayLocation ? { displayLocation: filters.displayLocation } : {}),
    ...(filters.rating ? { rating: filters.rating } : {}),
    ...(filters.highlighted != null ? { isHighlighted: filters.highlighted } : {}),
    ...(filters.search
      ? {
          OR: [
            { authorName: { contains: filters.search, mode: "insensitive" } },
            { businessName: { contains: filters.search, mode: "insensitive" } },
            { submittedEmail: { contains: filters.search, mode: "insensitive" } },
            { submittedByEmail: { contains: filters.search, mode: "insensitive" } },
            { quote: { contains: filters.search, mode: "insensitive" } },
            { testimonialText: { contains: filters.search, mode: "insensitive" } }
          ]
        }
      : {})
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
          linkedin: true,
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

  const category = input.category ?? TestimonialCategory.BCN_EXPERIENCE;
  const displayLocation = input.displayLocation ?? categoryToDisplayLocation(category);
  const quote = normalizeRequiredText(input.quote);
  const submittedByCompany =
    normalizeOptionalText(input.submittedByCompany) ?? member.profile?.business?.companyName ?? null;
  const submittedByWebsite =
    normalizeOptionalText(input.submittedByWebsite) ?? member.profile?.business?.website ?? null;
  const submittedByLinkedIn =
    normalizeOptionalText(input.submittedByLinkedIn) ?? member.profile?.linkedin ?? null;
  const permissionToFeaturePublicly =
    input.permissionToFeaturePublicly ?? input.permissionToDisplay ?? false;
  const permissionToUseName = input.permissionToUseName ?? input.displayPublicName ?? true;
  const permissionToUseCompany = input.permissionToUseCompany ?? input.displayBusinessName ?? true;
  const permissionToUseImage = input.permissionToUseImage ?? input.displayProfileImage ?? false;

  return db.testimonial.create({
    data: {
      sourceType: TestimonialSourceType.MEMBER_PROFILE,
      source: TestimonialSource.MEMBER_DASHBOARD,
      proofType: proofTypeForCategory(category),
      category,
      displayLocation,
      status: TestimonialStatus.PENDING,
      memberId: member.id,
      submittedByUserId: member.id,
      authorName: member.name || member.email,
      authorRole: normalizeOptionalText(input.submittedByRole),
      businessName: submittedByCompany,
      businessWebsite: submittedByWebsite,
      submittedByName: member.name || member.email,
      submittedByEmail: member.email,
      submittedByCompany,
      submittedByRole: normalizeOptionalText(input.submittedByRole),
      submittedByWebsite,
      submittedByLinkedIn,
      quote,
      testimonialText: quote,
      outcome: normalizeOptionalText(input.outcome),
      rating: normalizeRating(input.rating),
      permissionToDisplay: permissionToFeaturePublicly,
      permissionToFeaturePublicly,
      permissionToUseName,
      permissionToUseCompany,
      permissionToUseImage,
      permissionToUseInMarketing: input.permissionToUseInMarketing ?? false,
      displayPublicName: permissionToUseName,
      displayBusinessName: permissionToUseCompany,
      displayProfileImage: permissionToUseImage,
      imageUrl: member.image ?? null,
      profileImageUrl: member.image ?? null,
      recipientEmail: member.email,
      recipientName: member.name || member.email,
      companyName: submittedByCompany,
      roleTitle: normalizeOptionalText(input.submittedByRole),
      isExternalRequest: false,
      allowDisplayName: permissionToUseName,
      allowDisplayCompany: permissionToUseCompany,
      allowDisplayRole: permissionToUseName,
      allowDisplayTestimonial: permissionToFeaturePublicly,
      allowMarketingUse: input.permissionToUseInMarketing ?? false,
      submittedAt: new Date(),
      completedAt: new Date(),
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
  recipientName?: string | null;
  recipientEmail?: string | null;
  companyName?: string | null;
  auditBusinessName?: string | null;
  requestContext?: string | null;
  sourceType?: TestimonialSourceType;
  requestedByAdminId?: string | null;
  adminNotes?: string | null;
}) {
  const category = categoryForProofType(input.proofType);
  const recipientName = normalizeOptionalText(input.recipientName) ?? normalizeOptionalText(input.authorName);
  const recipientEmail =
    normalizeOptionalText(input.recipientEmail) ?? normalizeOptionalText(input.submittedEmail);
  const companyName = normalizeOptionalText(input.companyName) ?? normalizeOptionalText(input.businessName);
  const roleTitle = normalizeOptionalText(input.authorRole);
  const requestContext =
    normalizeOptionalText(input.requestContext) ?? normalizeOptionalText(input.adminNotes);
  const requestExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return db.testimonial.create({
    data: {
      sourceType: input.sourceType ?? TestimonialSourceType.EXTERNAL_REQUEST,
      source: TestimonialSource.EMAIL_REQUEST,
      proofType: input.proofType,
      category,
      displayLocation: categoryToDisplayLocation(category),
      status: TestimonialStatus.PENDING,
      authorName: recipientName ?? "Client testimonial request",
      authorRole: roleTitle,
      businessName: companyName,
      businessWebsite: normalizeOptionalText(input.businessWebsite),
      submittedByName: recipientName,
      submittedByEmail: recipientEmail,
      submittedByCompany: companyName,
      submittedByRole: roleTitle,
      submittedByWebsite: normalizeOptionalText(input.businessWebsite),
      quote: "",
      testimonialText: "",
      permissionToDisplay: false,
      permissionToFeaturePublicly: false,
      permissionToUseName: true,
      permissionToUseCompany: true,
      permissionToUseImage: false,
      permissionToUseInMarketing: false,
      displayPublicName: true,
      displayBusinessName: true,
      displayProfileImage: false,
      recipientEmail,
      recipientName,
      companyName,
      roleTitle,
      requestContext,
      auditBusinessName: normalizeOptionalText(input.auditBusinessName),
      isExternalRequest: true,
      allowDisplayName: false,
      allowDisplayCompany: false,
      allowDisplayRole: false,
      allowDisplayTestimonial: false,
      allowMarketingUse: false,
      requestExpiresAt,
      submittedEmail: recipientEmail,
      requestToken: createRequestToken(),
      requestedByAdminId: normalizeOptionalText(input.requestedByAdminId),
      adminNotes: requestContext
    }
  });
}

function buildTestimonialRequestText(input: {
  recipientName: string;
  proofType: TestimonialProofType;
  testimonialUrl: string;
  companyName?: string | null;
  auditBusinessName?: string | null;
  contextNote?: string | null;
}) {
  const contextLines = [
    input.companyName ? `Company: ${input.companyName}` : null,
    input.auditBusinessName ? `Audit/business: ${input.auditBusinessName}` : null,
    input.contextNote ? `Context: ${input.contextNote}` : null
  ].filter((line): line is string => Boolean(line));

  if (input.proofType === TestimonialProofType.GROWTH_ARCHITECT) {
    const firstName = input.recipientName.trim().split(/\s+/)[0] || input.recipientName.trim();

    return buildBrandedEmailText({
      eyebrow: "Testimonial request",
      heading: "Could you share a few words?",
      bodyLines: [
        `Hi ${firstName},`,
        "",
        "Thank you again for giving me the chance to look at your business.",
        "",
        "If the audit, strategy, or advice gave you clarity or helped you see what to improve next, would you be open to leaving a short testimonial?",
        "",
        "You can leave it here:",
        input.testimonialUrl,
        "",
        ...contextLines.flatMap((line) => [line, ""]),
        "Once the Google review link is live, you will also be able to copy the same words across so you do not need to write it twice.",
        "",
        "Thank you,",
        "Trev"
      ],
      ctaLabel: "Submit your testimonial",
      ctaUrl: input.testimonialUrl,
      fallbackNotice: "If the button does not work, copy and paste the link above into your browser."
    });
  }

  const firstName = input.recipientName.trim().split(/\s+/)[0] || input.recipientName.trim();

  return buildBrandedEmailText({
    eyebrow: "Testimonial request",
    heading: "Could you share a few words?",
    bodyLines: [
      `Hi ${firstName},`,
      "",
      "I just wanted to say thank you for being part of the early stages of The Business Circle Network.",
      "",
      "If the environment, conversations, insights, or support have helped you in any way, would you be open to sharing a few honest words about your experience?",
      "",
      "You can leave it here:",
      input.testimonialUrl,
      "",
      ...contextLines.flatMap((line) => [line, ""]),
      "Your testimonial helps other business owners understand what BCN is really trying to build: a calmer, more trusted place for serious founders to connect, think clearly, and grow properly.",
      "",
      "Thank you,",
      "Trev"
    ],
    ctaLabel: "Share your testimonial",
    ctaUrl: input.testimonialUrl,
    fallbackNotice: "If the button does not work, copy and paste the link above into your browser."
  });
}

export async function sendTestimonialRequestEmail(input: SendTestimonialRequestEmailInput) {
  const request = await createExternalTestimonialRequest({
    proofType: input.proofType,
    authorName: input.recipientName,
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    companyName: input.companyName,
    businessName: input.companyName,
    auditBusinessName: input.auditBusinessName,
    requestContext: input.contextNote,
    submittedEmail: input.recipientEmail,
    sourceType: input.sourceType ?? TestimonialSourceType.AUDIT_CLIENT,
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
      companyName: input.companyName,
      auditBusinessName: input.auditBusinessName,
      contextNote: input.contextNote,
      subjectContext: testimonialSubjectContext(input.proofType)
    })
  );
  const text = buildTestimonialRequestText({
    recipientName: input.recipientName,
    proofType: input.proofType,
    testimonialUrl,
    companyName: input.companyName,
    auditBusinessName: input.auditBusinessName,
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

export async function getTestimonialCopyState(testimonialId: string) {
  return db.testimonial.findUnique({
    where: {
      id: testimonialId
    },
    select: {
      id: true,
      testimonialText: true,
      quote: true
    }
  });
}

export async function createExternalTestimonial(input: CreateExternalTestimonialInput) {
  const existing = input.requestToken
    ? await db.testimonial.findUnique({
        where: {
          requestToken: input.requestToken
        }
      })
    : null;

  if (input.requestToken && !externalTestimonialRequestIsAvailable(existing)) {
    throw new Error("testimonial-request-not-found");
  }

  const category = input.category ?? existing?.category ?? TestimonialCategory.GROWTH_ARCHITECT;
  const displayLocation =
    input.displayLocation ?? existing?.displayLocation ?? categoryToDisplayLocation(category);
  const quote = normalizeRequiredText(input.quote);
  const permissionToFeaturePublicly =
    input.allowDisplayTestimonial ?? input.permissionToFeaturePublicly ?? input.permissionToDisplay ?? false;
  const permissionToUseName =
    input.allowDisplayName ?? input.permissionToUseName ?? input.displayPublicName ?? false;
  const permissionToUseCompany =
    input.allowDisplayCompany ?? input.permissionToUseCompany ?? input.displayBusinessName ?? false;
  const allowDisplayRole = input.allowDisplayRole ?? permissionToUseName;
  const permissionToUseInMarketing =
    input.allowMarketingUse ?? input.permissionToUseInMarketing ?? false;
  const trackingNotes = [input.trackingSource, input.campaign, input.ref]
    .filter(Boolean)
    .map((value) => `Tracking: ${value}`)
    .join("\n");
  const completedAt = new Date();
  const data = {
    sourceType: existing?.sourceType ?? TestimonialSourceType.EXTERNAL_REQUEST,
    source: input.source ?? (input.requestToken ? TestimonialSource.EMAIL_REQUEST : TestimonialSource.PUBLIC_FORM),
    proofType: proofTypeForCategory(category),
    category,
    displayLocation,
    status: TestimonialStatus.PENDING,
    authorName: normalizeRequiredText(input.authorName),
    authorRole: normalizeOptionalText(input.authorRole),
    businessName: normalizeOptionalText(input.businessName),
    businessWebsite: normalizeOptionalText(input.businessWebsite),
    submittedByName: normalizeRequiredText(input.authorName),
    submittedByRole: normalizeOptionalText(input.authorRole),
    submittedByCompany: normalizeOptionalText(input.businessName),
    submittedByWebsite: normalizeOptionalText(input.businessWebsite),
    submittedByLinkedIn: normalizeOptionalText(input.submittedByLinkedIn),
    quote,
    testimonialText: quote,
    outcome: normalizeOptionalText(input.outcome),
    submittedEmail: normalizeOptionalText(input.submittedEmail),
    submittedByEmail: normalizeOptionalText(input.submittedEmail),
    rating: normalizeRating(input.rating),
    permissionToDisplay: input.permissionToDisplay ?? permissionToFeaturePublicly,
    permissionToFeaturePublicly,
    permissionToUseName,
    permissionToUseCompany,
    permissionToUseImage: input.permissionToUseImage ?? false,
    permissionToUseInMarketing,
    displayPublicName: input.displayPublicName ?? permissionToUseName,
    displayBusinessName: input.displayBusinessName ?? permissionToUseCompany,
    displayProfileImage: input.permissionToUseImage ?? false,
    recipientEmail: normalizeOptionalText(input.submittedEmail) ?? existing?.recipientEmail ?? null,
    recipientName: normalizeRequiredText(input.authorName),
    companyName: normalizeOptionalText(input.businessName) ?? existing?.companyName ?? null,
    roleTitle: normalizeOptionalText(input.authorRole) ?? existing?.roleTitle ?? null,
    isExternalRequest: Boolean(input.requestToken || existing?.isExternalRequest),
    allowDisplayName: permissionToUseName,
    allowDisplayCompany: permissionToUseCompany,
    allowDisplayRole,
    allowDisplayTestimonial: permissionToFeaturePublicly,
    allowMarketingUse: permissionToUseInMarketing,
    submittedAt: completedAt,
    completedAt,
    approvedAt: null,
    approvedByAdminId: null,
    approvedByUserId: null,
    adminNotes: normalizeOptionalText(trackingNotes) ?? existing?.adminNotes ?? null
  };

  const updated = existing
    ? await db.testimonial.update({
        where: {
          id: existing.id
        },
        data
      })
    : await db.testimonial.create({
        data
      });

  await db.founderServiceRequest?.updateMany({
    where: {
      testimonialId: updated.id
    },
    data: {
      testimonialSubmittedAt: new Date(),
      serviceStatus: "TESTIMONIAL_RECEIVED"
    }
  });

  return updated;
}

export async function updateAdminTestimonial(input: UpdateAdminTestimonialInput) {
  const quote = normalizeRequiredText(input.quote);
  const updated = await db.testimonial.update({
    where: {
      id: input.testimonialId
    },
    data: {
      quote,
      testimonialText: quote,
      authorName: normalizeRequiredText(input.authorName),
      authorRole: normalizeOptionalText(input.authorRole),
      businessName: normalizeOptionalText(input.businessName),
      businessWebsite: normalizeOptionalText(input.businessWebsite),
      submittedByName: normalizeRequiredText(input.authorName),
      submittedByRole: normalizeOptionalText(input.authorRole),
      submittedByCompany: normalizeOptionalText(input.businessName),
      submittedByWebsite: normalizeOptionalText(input.businessWebsite),
      outcome: normalizeOptionalText(input.outcome),
      proofType: input.proofType,
      category: input.category,
      displayLocation: input.displayLocation,
      status: input.status,
      permissionToDisplay: input.permissionToDisplay,
      permissionToFeaturePublicly: input.permissionToFeaturePublicly,
      permissionToUseName: input.permissionToUseName,
      permissionToUseCompany: input.permissionToUseCompany,
      permissionToUseImage: input.permissionToUseImage,
      permissionToUseInMarketing: input.permissionToUseInMarketing,
      allowDisplayName: input.allowDisplayName ?? input.permissionToUseName,
      allowDisplayCompany: input.allowDisplayCompany ?? input.permissionToUseCompany,
      allowDisplayRole: input.allowDisplayRole ?? input.permissionToUseName,
      allowDisplayTestimonial: input.allowDisplayTestimonial ?? input.permissionToFeaturePublicly,
      allowMarketingUse: input.allowMarketingUse ?? input.permissionToUseInMarketing,
      displayPublicName: input.displayPublicName,
      displayBusinessName: input.displayBusinessName,
      displayProfileImage: input.displayProfileImage,
      isHighlighted: input.isHighlighted,
      rating: normalizeRating(input.rating),
      adminNotes: normalizeOptionalText(input.adminNotes),
      rejectionReason: normalizeOptionalText(input.rejectionReason),
      ...(input.status === TestimonialStatus.APPROVED
        ? {
            approvedAt: new Date(),
            approvedByAdminId: normalizeOptionalText(input.adminId),
            approvedByUserId: normalizeOptionalText(input.adminId)
          }
        : {}),
      ...(input.status === TestimonialStatus.REJECTED
        ? {
            rejectedAt: new Date()
          }
        : {})
    }
  });

  if (input.status === TestimonialStatus.APPROVED) {
    await db.founderServiceRequest?.updateMany({
      where: {
        testimonialId: updated.id
      },
      data: {
        testimonialApprovedAt: updated.approvedAt,
        serviceStatus: "TESTIMONIAL_APPROVED"
      }
    });
  }

  return updated;
}

export async function approveTestimonial(testimonialId: string, approvedByAdminId: string) {
  const updated = await db.testimonial.update({
    where: {
      id: testimonialId
    },
    data: {
      status: TestimonialStatus.APPROVED,
      approvedByAdminId,
      approvedByUserId: approvedByAdminId,
      approvedAt: new Date()
    }
  });

  await db.founderServiceRequest?.updateMany({
    where: {
      testimonialId: updated.id
    },
    data: {
      testimonialApprovedAt: updated.approvedAt,
      serviceStatus: "TESTIMONIAL_APPROVED"
    }
  });

  return updated;
}

export async function rejectTestimonial(testimonialId: string) {
  return db.testimonial.update({
    where: {
      id: testimonialId
    },
    data: {
      status: TestimonialStatus.REJECTED,
      rejectedAt: new Date()
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

export async function toggleTestimonialHighlight(testimonialId: string, highlighted: boolean) {
  return db.testimonial.update({
    where: {
      id: testimonialId
    },
    data: {
      isHighlighted: highlighted
    }
  });
}

export async function markGoogleReviewIntent(testimonialId: string) {
  return db.testimonial.update({
    where: {
      id: testimonialId
    },
    data: {
      googleReviewIntentClickedAt: new Date()
    }
  });
}

export async function markTestimonialCopiedToGoogle(testimonialId: string) {
  return db.testimonial.update({
    where: {
      id: testimonialId
    },
    data: {
      copiedToGoogleAt: new Date()
    }
  });
}

export async function markGoogleReviewConfirmed(testimonialId: string) {
  return db.testimonial.update({
    where: {
      id: testimonialId
    },
    data: {
      googleReviewCompleted: true,
      googleReviewConfirmedAt: new Date()
    }
  });
}

export async function getTestimonialTrustStats() {
  const [pending, approved, featured, googleClicks, googleConfirmed, categories] =
    await Promise.all([
      db.testimonial.count({ where: { status: TestimonialStatus.PENDING } }),
      db.testimonial.count({ where: { status: TestimonialStatus.APPROVED } }),
      db.testimonial.count({ where: { isHighlighted: true } }),
      db.testimonial.count({ where: { googleReviewIntentClickedAt: { not: null } } }),
      db.testimonial.count({ where: { googleReviewCompleted: true } }),
      db.testimonial.groupBy({
        by: ["category"],
        _count: {
          category: true
        }
      })
    ]);

  return {
    pending,
    approved,
    featured,
    googleClicks,
    googleConfirmed,
    categories
  };
}

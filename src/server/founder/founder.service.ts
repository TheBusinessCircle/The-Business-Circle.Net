import {
  FounderClientStage,
  FounderServicePaymentStatus,
  FounderServiceDiscountTag,
  FounderServiceDiscountType,
  FounderServiceStatus,
  type Prisma
} from "@prisma/client";
import { normalizeEmail } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { getFounderServicePricingForAccount } from "@/lib/founder";
import type {
  FounderServiceModel,
  FounderServiceRequestDetailModel,
  FounderServiceRequestFormPrefill,
  FounderServiceRequestListItem
} from "@/types";
import type { FounderServiceRequestFormValues } from "@/lib/validators";

type FounderUploadInput = {
  fileUrl: string;
  fileName: string;
  mimeType?: string | null;
};

type CreateFounderServiceRequestInput = FounderServiceRequestFormValues & {
  serviceSlug: string;
  userId?: string | null;
  uploads?: FounderUploadInput[];
};

type UpdateFounderServiceRequestInput = {
  requestId: string;
  paymentStatus?: FounderServicePaymentStatus;
  serviceStatus?: FounderServiceStatus;
  pipelineStage?: FounderClientStage;
  adminNotes?: string;
  adminDiscountCodeId?: string | null;
  auditStartAt?: Date | null;
  auditDueAt?: Date | null;
  callScheduledAt?: Date | null;
  checkoutLinkSentAt?: Date | null;
  taskAuditChecklistComplete?: boolean;
  taskCallCompleted?: boolean;
  taskFollowUpSent?: boolean;
};

type FounderServiceRequestAdminFilters = {
  serviceSlug?: string;
  paymentStatus?: FounderServicePaymentStatus;
  serviceStatus?: FounderServiceStatus;
  pipelineStage?: FounderClientStage;
};

type CreateFounderServiceDiscountCodeInput = {
  code: string;
  name?: string;
  type: FounderServiceDiscountType;
  percentOff?: number | null;
  amountOff?: number | null;
  currency?: string;
  expiresAt?: Date | null;
  usageLimit?: number | null;
  tag: FounderServiceDiscountTag;
  stripeCouponId?: string | null;
  stripePromotionCodeId?: string | null;
};

function toNullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapFounderService(service: {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  includes: string[];
  ctaLabel: string;
  price: number;
  currency: string;
  billingType: FounderServiceModel["billingType"];
  intakeMode: FounderServiceModel["intakeMode"];
  stripeProductId: string | null;
  stripePriceId: string | null;
  active: boolean;
}): FounderServiceModel {
  return {
    id: service.id,
    slug: service.slug,
    title: service.title,
    shortDescription: service.shortDescription,
    fullDescription: service.fullDescription,
    includes: service.includes,
    ctaLabel: service.ctaLabel,
    price: service.price,
    currency: service.currency,
    billingType: service.billingType,
    intakeMode: service.intakeMode,
    stripeProductId: service.stripeProductId,
    stripePriceId: service.stripePriceId,
    active: service.active
  };
}

export async function listActiveFounderServices(): Promise<FounderServiceModel[]> {
  const services = await db.founderService.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      fullDescription: true,
      includes: true,
      ctaLabel: true,
      price: true,
      currency: true,
      billingType: true,
      intakeMode: true,
      stripeProductId: true,
      stripePriceId: true,
      active: true
    }
  });

  return services.map(mapFounderService);
}

export async function getFounderServiceBySlug(
  slug: string
): Promise<FounderServiceModel | null> {
  const service = await db.founderService.findFirst({
    where: {
      slug,
      active: true
    },
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      fullDescription: true,
      includes: true,
      ctaLabel: true,
      price: true,
      currency: true,
      billingType: true,
      intakeMode: true,
      stripeProductId: true,
      stripePriceId: true,
      active: true
    }
  });

  return service ? mapFounderService(service) : null;
}

export async function getFounderServiceFormPrefill(
  userId?: string | null
): Promise<FounderServiceRequestFormPrefill> {
  if (!userId) {
    return {
      fullName: "",
      email: "",
      phone: "",
      businessName: "",
      website: "",
      industry: "",
      location: ""
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      profile: {
        select: {
          location: true,
          business: {
            select: {
              companyName: true,
              website: true,
              industry: true
            }
          }
        }
      }
    }
  });

  return {
    fullName: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    businessName: user?.profile?.business?.companyName ?? "",
    website: user?.profile?.business?.website ?? "",
    industry: user?.profile?.business?.industry ?? "",
    location: user?.profile?.location ?? ""
  };
}

export async function createFounderServiceRequest(
  input: CreateFounderServiceRequestInput
) {
  const service = await db.founderService.findFirst({
    where: {
      slug: input.serviceSlug,
      active: true
    },
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      currency: true,
      intakeMode: true
    }
  });

  if (!service) {
    throw new Error("service-not-found");
  }

  const userPricingContext = input.userId
    ? await db.user.findUnique({
        where: { id: input.userId },
        select: {
          role: true,
          membershipTier: true,
          subscription: {
            select: {
              status: true
            }
          }
        }
      })
    : null;
  const pricing = getFounderServicePricingForAccount(
    service,
    userPricingContext
      ? {
          role: userPricingContext.role,
          membershipTier: userPricingContext.membershipTier,
          subscriptionStatus: userPricingContext.subscription?.status ?? null
        }
      : null
  );
  const sourcePage = toNullableText(input.sourcePage) ?? "Founder Service Page";
  const sourceSection = toNullableText(input.sourceSection) ?? "Founder Service Request Form";

  return db.founderServiceRequest.create({
    data: {
      userId: input.userId ?? undefined,
      serviceId: service.id,
      serviceOwner: "Trev",
      sourcePage,
      sourceSection,
      fullName: input.fullName.trim(),
      email: normalizeEmail(input.email),
      phone: "",
      businessName: input.businessName.trim(),
      businessStage: input.businessStage || null,
      website: input.website.trim(),
      industry: "",
      location: "",
      yearsInBusiness: "",
      employeeCount: "",
      revenueRange: "PRE_REVENUE",
      instagram: null,
      tiktok: null,
      facebook: null,
      linkedin: null,
      otherSocial: null,
      businessDescription: "",
      targetAudience: "",
      productsOrServices: "",
      offers: "",
      differentiator: "",
      mainGoal: input.helpSummary.trim(),
      helpSummary: input.helpSummary.trim(),
      biggestChallenge: "",
      blockers: "",
      pastAttempts: "",
      successDefinition: "",
      marketingChannels: [],
      whyTrev: "",
      baseAmount: pricing.baseAmount,
      amount: pricing.finalAmount,
      membershipDiscountPercent: pricing.discountPercent,
      membershipTierApplied: pricing.appliedMembershipTier,
      discountLabel: pricing.discountLabel,
      currency: service.currency,
      uploads: input.uploads?.length
        ? {
            create: input.uploads.map((upload) => ({
              fileUrl: upload.fileUrl,
              fileName: upload.fileName,
              mimeType: upload.mimeType ?? null
            }))
          }
        : undefined
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      fullName: true,
      email: true,
      businessName: true,
      businessStage: true,
      helpSummary: true,
      serviceOwner: true,
      baseAmount: true,
      amount: true,
      membershipDiscountPercent: true,
      membershipTierApplied: true,
      discountLabel: true,
      currency: true,
      paymentStatus: true,
      serviceStatus: true,
      pipelineStage: true,
      auditStartAt: true,
      auditDueAt: true,
      callScheduledAt: true,
      checkoutUrl: true,
      checkoutLinkSentAt: true,
      taskAuditChecklistComplete: true,
      taskCallCompleted: true,
      taskFollowUpSent: true,
      adminDiscountCode: {
        select: {
          id: true,
          code: true,
          tag: true
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      service: {
        select: {
          id: true,
          title: true,
          slug: true,
          intakeMode: true
        }
      }
    }
  });
}

export async function getFounderServiceRequestSummary(requestId: string) {
  return db.founderServiceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      fullName: true,
      baseAmount: true,
      amount: true,
      membershipDiscountPercent: true,
      membershipTierApplied: true,
      discountLabel: true,
      currency: true,
      paymentStatus: true,
      serviceStatus: true,
      paidAt: true,
      service: {
        select: {
          title: true,
          slug: true,
          intakeMode: true
        }
      }
    }
  });
}

export async function listFounderServiceRequestsForAdmin(
  filters: FounderServiceRequestAdminFilters = {}
): Promise<FounderServiceRequestListItem[]> {
  const where: Prisma.FounderServiceRequestWhereInput = {};

  if (filters.paymentStatus) {
    where.paymentStatus = filters.paymentStatus;
  }

  if (filters.serviceStatus) {
    where.serviceStatus = filters.serviceStatus;
  }

  if (filters.pipelineStage) {
    where.pipelineStage = filters.pipelineStage;
  }

  if (filters.serviceSlug) {
    where.service = {
      is: {
        slug: filters.serviceSlug
      }
    };
  }

  const requests = await db.founderServiceRequest.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      fullName: true,
      email: true,
      businessName: true,
      businessStage: true,
      helpSummary: true,
      serviceOwner: true,
      baseAmount: true,
      amount: true,
      membershipDiscountPercent: true,
      membershipTierApplied: true,
      discountLabel: true,
      currency: true,
      paymentStatus: true,
      serviceStatus: true,
      pipelineStage: true,
      auditStartAt: true,
      auditDueAt: true,
      callScheduledAt: true,
      checkoutUrl: true,
      checkoutLinkSentAt: true,
      taskAuditChecklistComplete: true,
      taskCallCompleted: true,
      taskFollowUpSent: true,
      adminDiscountCode: {
        select: {
          id: true,
          code: true,
          tag: true
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      service: {
        select: {
          id: true,
          title: true,
          slug: true
        }
      }
    }
  });

  return requests;
}

export async function getFounderServiceRequestDetailsForAdmin(
  requestId: string
): Promise<FounderServiceRequestDetailModel | null> {
  return db.founderServiceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      fullName: true,
      email: true,
      businessName: true,
      businessStage: true,
      serviceOwner: true,
      sourcePage: true,
      sourceSection: true,
      baseAmount: true,
      amount: true,
      membershipDiscountPercent: true,
      membershipTierApplied: true,
      discountLabel: true,
      currency: true,
      paymentStatus: true,
      serviceStatus: true,
      pipelineStage: true,
      phone: true,
      website: true,
      industry: true,
      location: true,
      yearsInBusiness: true,
      employeeCount: true,
      revenueRange: true,
      instagram: true,
      tiktok: true,
      facebook: true,
      linkedin: true,
      otherSocial: true,
      businessDescription: true,
      targetAudience: true,
      productsOrServices: true,
      offers: true,
      differentiator: true,
      mainGoal: true,
      helpSummary: true,
      biggestChallenge: true,
      blockers: true,
      pastAttempts: true,
      successDefinition: true,
      marketingChannels: true,
      whyTrev: true,
      auditStartAt: true,
      auditDueAt: true,
      callScheduledAt: true,
      checkoutLinkSentAt: true,
      taskAuditChecklistComplete: true,
      taskCallCompleted: true,
      taskFollowUpSent: true,
      adminNotes: true,
      adminDiscountCode: {
        select: {
          id: true,
          code: true,
          tag: true
        }
      },
      stripeCheckoutSessionId: true,
      checkoutUrl: true,
      stripePaymentIntentId: true,
      stripeSubscriptionId: true,
      stripeInvoiceId: true,
      paidAt: true,
      uploads: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fileUrl: true,
          fileName: true,
          mimeType: true,
          createdAt: true
        }
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      service: {
        select: {
          id: true,
          title: true,
          slug: true
        }
      }
    }
  });
}

export async function updateFounderServiceRequestForAdmin(
  input: UpdateFounderServiceRequestInput
) {
  const data: Prisma.FounderServiceRequestUpdateInput = {};

  if (input.paymentStatus) {
    data.paymentStatus = input.paymentStatus;
  }

  if (input.serviceStatus) {
    data.serviceStatus = input.serviceStatus;
  }

  if (input.pipelineStage) {
    data.pipelineStage = input.pipelineStage;
  }

  if (input.adminDiscountCodeId !== undefined) {
    data.adminDiscountCode = input.adminDiscountCodeId
      ? {
          connect: {
            id: input.adminDiscountCodeId
          }
        }
      : {
          disconnect: true
        };
  }

  if (input.auditStartAt !== undefined) {
    data.auditStartAt = input.auditStartAt;
  }

  if (input.auditDueAt !== undefined) {
    data.auditDueAt = input.auditDueAt;
  }

  if (input.callScheduledAt !== undefined) {
    data.callScheduledAt = input.callScheduledAt;
  }

  if (input.checkoutLinkSentAt !== undefined) {
    data.checkoutLinkSentAt = input.checkoutLinkSentAt;
  }

  if (input.taskAuditChecklistComplete !== undefined) {
    data.taskAuditChecklistComplete = input.taskAuditChecklistComplete;
  }

  if (input.taskCallCompleted !== undefined) {
    data.taskCallCompleted = input.taskCallCompleted;
  }

  if (input.taskFollowUpSent !== undefined) {
    data.taskFollowUpSent = input.taskFollowUpSent;
  }

  if (input.adminNotes !== undefined) {
    data.adminNotes = toNullableText(input.adminNotes) ?? null;
  }

  return db.founderServiceRequest.update({
    where: { id: input.requestId },
    data
  });
}

export async function listFounderServiceDiscountCodes() {
  return db.founderServiceDiscountCode.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }]
  });
}

export async function createFounderServiceDiscountCodeRecord(
  input: CreateFounderServiceDiscountCodeInput
) {
  return db.founderServiceDiscountCode.create({
    data: {
      code: input.code.trim().toUpperCase(),
      name: toNullableText(input.name),
      type: input.type,
      percentOff: input.percentOff ?? null,
      amountOff: input.amountOff ?? null,
      currency: input.currency ?? "GBP",
      expiresAt: input.expiresAt ?? null,
      usageLimit: input.usageLimit ?? null,
      tag: input.tag,
      stripeCouponId: input.stripeCouponId ?? null,
      stripePromotionCodeId: input.stripePromotionCodeId ?? null
    }
  });
}

export async function getFounderServiceDiscountCodeById(id: string) {
  return db.founderServiceDiscountCode.findUnique({
    where: { id }
  });
}

export async function incrementFounderServiceDiscountCodeUsage(id: string) {
  return db.founderServiceDiscountCode.update({
    where: { id },
    data: {
      timesRedeemed: {
        increment: 1
      }
    }
  });
}

export async function updateFounderServiceStripeCatalogEntry(input: {
  serviceId: string;
  stripeProductId: string | null;
  stripePriceId: string | null;
}) {
  return db.founderService.update({
    where: { id: input.serviceId },
    data: {
      stripeProductId: input.stripeProductId,
      stripePriceId: input.stripePriceId
    }
  });
}

export async function exportFounderServiceRequests() {
  return db.founderServiceRequest.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      fullName: true,
      email: true,
      phone: true,
      businessName: true,
      businessStage: true,
      serviceOwner: true,
      sourcePage: true,
      sourceSection: true,
      website: true,
      industry: true,
      location: true,
      yearsInBusiness: true,
      employeeCount: true,
      revenueRange: true,
      baseAmount: true,
      amount: true,
      membershipDiscountPercent: true,
      membershipTierApplied: true,
      discountLabel: true,
      currency: true,
      paymentStatus: true,
      serviceStatus: true,
      pipelineStage: true,
      helpSummary: true,
      auditStartAt: true,
      auditDueAt: true,
      callScheduledAt: true,
      checkoutUrl: true,
      taskAuditChecklistComplete: true,
      taskCallCompleted: true,
      taskFollowUpSent: true,
      adminNotes: true,
      adminDiscountCode: {
        select: {
          code: true
        }
      },
      service: {
        select: {
          title: true,
          slug: true
        }
      },
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });
}

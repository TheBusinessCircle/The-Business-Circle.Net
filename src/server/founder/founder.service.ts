import {
  FounderServicePaymentStatus,
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
  paymentStatus: FounderServicePaymentStatus;
  serviceStatus: FounderServiceStatus;
  adminNotes?: string;
};

type FounderServiceRequestAdminFilters = {
  serviceSlug?: string;
  paymentStatus?: FounderServicePaymentStatus;
  serviceStatus?: FounderServiceStatus;
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
      phone: input.phone.trim(),
      businessName: input.businessName.trim(),
      website: input.website.trim(),
      industry: input.industry.trim(),
      location: input.location.trim(),
      yearsInBusiness: input.yearsInBusiness.trim(),
      employeeCount: input.employeeCount.trim(),
      revenueRange: input.revenueRange,
      instagram: toNullableText(input.instagram),
      tiktok: toNullableText(input.tiktok),
      facebook: toNullableText(input.facebook),
      linkedin: toNullableText(input.linkedin),
      otherSocial: toNullableText(input.otherSocial),
      businessDescription: input.businessDescription.trim(),
      targetAudience: input.targetAudience.trim(),
      productsOrServices: input.productsOrServices.trim(),
      offers: input.offers.trim(),
      differentiator: input.differentiator.trim(),
      mainGoal: input.mainGoal.trim(),
      biggestChallenge: input.biggestChallenge.trim(),
      blockers: input.blockers.trim(),
      pastAttempts: input.pastAttempts.trim(),
      successDefinition: input.successDefinition.trim(),
      marketingChannels: input.marketingChannels,
      whyTrev: input.whyTrev.trim(),
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
      serviceOwner: true,
      baseAmount: true,
      amount: true,
      membershipDiscountPercent: true,
      membershipTierApplied: true,
      discountLabel: true,
      currency: true,
      paymentStatus: true,
      serviceStatus: true,
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
      serviceOwner: true,
      baseAmount: true,
      amount: true,
      membershipDiscountPercent: true,
      membershipTierApplied: true,
      discountLabel: true,
      currency: true,
      paymentStatus: true,
      serviceStatus: true,
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
      biggestChallenge: true,
      blockers: true,
      pastAttempts: true,
      successDefinition: true,
      marketingChannels: true,
      whyTrev: true,
      adminNotes: true,
      stripeCheckoutSessionId: true,
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
  return db.founderServiceRequest.update({
    where: { id: input.requestId },
    data: {
      paymentStatus: input.paymentStatus,
      serviceStatus: input.serviceStatus,
      adminNotes: toNullableText(input.adminNotes) ?? null
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
      adminNotes: true,
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

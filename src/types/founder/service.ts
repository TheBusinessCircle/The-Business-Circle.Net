import type {
  FounderRevenueRange,
  FounderServiceIntakeMode,
  FounderServiceBillingType,
  FounderServicePaymentStatus,
  FounderServiceStatus,
  MembershipTier,
  Role
} from "@prisma/client";

export type FounderServiceModel = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  includes: string[];
  ctaLabel: string;
  price: number;
  currency: string;
  billingType: FounderServiceBillingType;
  intakeMode: FounderServiceIntakeMode;
  active: boolean;
};

export type FounderPricingViewerContext = {
  role: Role;
  membershipTier: MembershipTier;
  hasActiveSubscription: boolean;
};

export type FounderServicePricingSummary = {
  isGrowthArchitect: boolean;
  isApplicationOnly: boolean;
  baseAmount: number;
  finalAmount: number;
  discountPercent: number;
  appliedMembershipTier: MembershipTier | null;
  discountLabel: string | null;
  appliedMessage: string | null;
  memberBenefitMessage: string | null;
};

export type FounderServiceRequestListItem = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
  email: string;
  businessName: string;
  serviceOwner: string;
  baseAmount: number;
  amount: number;
  membershipDiscountPercent: number;
  membershipTierApplied: MembershipTier | null;
  discountLabel: string | null;
  currency: string;
  paymentStatus: FounderServicePaymentStatus;
  serviceStatus: FounderServiceStatus;
  service: {
    id: string;
    title: string;
    slug: string;
  };
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
};

export type FounderServiceRequestDetailModel = FounderServiceRequestListItem & {
  phone: string;
  website: string;
  industry: string;
  location: string;
  sourcePage: string | null;
  sourceSection: string | null;
  yearsInBusiness: string;
  employeeCount: string;
  revenueRange: FounderRevenueRange;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  linkedin: string | null;
  otherSocial: string | null;
  businessDescription: string;
  targetAudience: string;
  productsOrServices: string;
  offers: string;
  differentiator: string;
  mainGoal: string;
  biggestChallenge: string;
  blockers: string;
  pastAttempts: string;
  successDefinition: string;
  marketingChannels: string[];
  whyTrev: string;
  adminNotes: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;
  stripeInvoiceId: string | null;
  paidAt: Date | null;
  uploads: Array<{
    id: string;
    fileUrl: string;
    fileName: string;
    mimeType: string | null;
    createdAt: Date;
  }>;
};

export type FounderServiceRequestFormPrefill = {
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  website: string;
  industry: string;
  location: string;
};

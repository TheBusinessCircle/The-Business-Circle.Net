import type {
  BillingDiscountAppliesTo,
  BillingDiscountTag,
  BillingDiscountType,
  BillingInterval,
  BillingPriceBillingType,
  BillingProductCategory,
  BillingSyncStatus,
  MembershipTier
} from "@prisma/client";

export type BillingCatalogPriceModel = {
  id: string;
  productId: string;
  name: string;
  amount: number;
  currency: string;
  billingType: BillingPriceBillingType;
  interval: BillingInterval | null;
  isFounderPrice: boolean;
  active: boolean;
  stripePriceId: string | null;
  syncStatus: BillingSyncStatus;
  syncError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FounderControlModel = {
  id: string;
  productId: string;
  founderLimit: number;
  currentCount: number;
  remainingCount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type BillingCatalogProductModel = {
  id: string;
  slug: string;
  name: string;
  category: BillingProductCategory;
  membershipTier: MembershipTier | null;
  founderServiceId: string | null;
  description: string;
  active: boolean;
  stripeProductId: string | null;
  syncStatus: BillingSyncStatus;
  syncError: string | null;
  createdAt: Date;
  updatedAt: Date;
  founderService: {
    id: string;
    slug: string;
    title: string;
  } | null;
  prices: BillingCatalogPriceModel[];
  founderSettings: FounderControlModel | null;
};

export type BillingCatalogDiscountModel = {
  id: string;
  code: string;
  name: string | null;
  type: BillingDiscountType;
  value: number;
  appliesTo: BillingDiscountAppliesTo;
  usageLimit: number | null;
  timesUsed: number;
  expiresAt: Date | null;
  active: boolean;
  tag: BillingDiscountTag;
  stripeCouponId: string | null;
  stripePromotionCodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  specificProduct: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type ManagedMembershipPlan = {
  tier: MembershipTier;
  billingVariant: "standard" | "founding";
  billingInterval: "monthly" | "annual";
  amountMinor: number;
  checkoutPrice: number;
  monthlyEquivalentPrice: number;
  stripePriceId: string;
  planKey: string;
};

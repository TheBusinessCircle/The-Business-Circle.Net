import {
  BillingDiscountAppliesTo,
  BillingDiscountTag,
  BillingDiscountType,
  BillingPriceBillingType,
  BillingProductCategory,
  MembershipTier
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  parseBillingDiscountFormData,
  parseBillingPriceFormData,
  parseBillingProductFormData
} from "@/actions/admin/products-pricing.parsers";

function appendEntries(formData: FormData, entries: Record<string, string>) {
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

describe("products pricing form parsers", () => {
  it("accepts product creates without a product id and clears service links for memberships", () => {
    const formData = appendEntries(new FormData(), {
      name: "Foundation Membership",
      category: BillingProductCategory.MEMBERSHIP,
      description: "Managed membership record",
      active: "on",
      membershipTier: MembershipTier.FOUNDATION,
      founderServiceId: "ck1234567890123456789012",
      returnPath: "/admin/products-pricing"
    });

    const parsed = parseBillingProductFormData(formData);

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.productId).toBeUndefined();
    expect(parsed.data.membershipTier).toBe(MembershipTier.FOUNDATION);
    expect(parsed.data.founderServiceId).toBeNull();
  });

  it("clears membership tiers for service products", () => {
    const formData = appendEntries(new FormData(), {
      name: "Clarity Audit",
      category: BillingProductCategory.SERVICE,
      description: "Founder service product",
      active: "on",
      membershipTier: MembershipTier.CORE,
      founderServiceId: "ck1234567890123456789012"
    });

    const parsed = parseBillingProductFormData(formData);

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.membershipTier).toBeNull();
    expect(parsed.data.founderServiceId).toBe("ck1234567890123456789012");
  });

  it("accepts price creates without a price id", () => {
    const formData = appendEntries(new FormData(), {
      productId: "ck1234567890123456789012",
      name: "Monthly",
      amount: "3000",
      currency: "GBP",
      billingType: BillingPriceBillingType.RECURRING,
      interval: "MONTH",
      active: "on"
    });

    const parsed = parseBillingPriceFormData(formData);

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.priceId).toBeUndefined();
    expect(parsed.data.productId).toBe("ck1234567890123456789012");
  });

  it("requires a specific product for product-scoped discounts and clears stale product ids otherwise", () => {
    const invalidSpecificProduct = appendEntries(new FormData(), {
      code: "LOCAL50",
      type: BillingDiscountType.PERCENTAGE,
      value: "50",
      appliesTo: BillingDiscountAppliesTo.SPECIFIC_PRODUCT,
      active: "on",
      tag: BillingDiscountTag.LOCAL_OUTREACH
    });
    const validBroadDiscount = appendEntries(new FormData(), {
      code: "GLOBAL10",
      type: BillingDiscountType.PERCENTAGE,
      value: "10",
      appliesTo: BillingDiscountAppliesTo.ALL_PRODUCTS,
      specificProductId: "ck1234567890123456789012",
      active: "on",
      tag: BillingDiscountTag.MANUAL
    });

    const invalidParsed = parseBillingDiscountFormData(invalidSpecificProduct);
    const validParsed = parseBillingDiscountFormData(validBroadDiscount);

    expect(invalidParsed.success).toBe(false);
    expect(validParsed.success).toBe(true);
    if (!validParsed.success) {
      return;
    }

    expect(validParsed.data.specificProductId).toBeNull();
  });
});

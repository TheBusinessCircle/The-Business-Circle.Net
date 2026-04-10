import {
  BillingDiscountAppliesTo,
  BillingDiscountTag,
  BillingDiscountType,
  BillingInterval,
  BillingPriceBillingType,
  BillingProductCategory,
  MembershipTier
} from "@prisma/client";
import { z } from "zod";

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function stringEntry(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function optionalStringEntry(formData: FormData, key: string) {
  const value = stringEntry(formData, key);
  return value ? value : undefined;
}

function nullableStringEntry(formData: FormData, key: string) {
  const value = stringEntry(formData, key);
  return value ? value : null;
}

const billingProductFormSchema = z
  .object({
    productId: z.string().cuid().optional(),
    name: z.string().trim().min(3).max(120),
    category: z.nativeEnum(BillingProductCategory),
    description: z.string().trim().max(500),
    active: z.boolean(),
    membershipTier: z.nativeEnum(MembershipTier).nullable(),
    founderServiceId: z.string().cuid().nullable(),
    returnPath: z.string().optional()
  })
  .transform((value) => ({
    ...value,
    membershipTier:
      value.category === BillingProductCategory.MEMBERSHIP ? value.membershipTier : null,
    founderServiceId:
      value.category === BillingProductCategory.SERVICE ? value.founderServiceId : null
  }));

const billingPriceFormSchema = z.object({
  priceId: z.string().cuid().optional(),
  productId: z.string().cuid(),
  name: z.string().trim().min(2).max(80),
  amount: z.coerce.number().int().min(0).max(10_000_000),
  currency: z.string().trim().min(3).max(3).default("GBP"),
  billingType: z.nativeEnum(BillingPriceBillingType),
  interval: z.nativeEnum(BillingInterval).nullable(),
  isFounderPrice: z.boolean(),
  active: z.boolean(),
  returnPath: z.string().optional()
});

const billingDiscountFormSchema = z
  .object({
    code: z.string().trim().min(3).max(64),
    name: z.string().trim().max(120).optional(),
    type: z.nativeEnum(BillingDiscountType),
    value: z.coerce.number().int().min(1).max(10_000_000),
    appliesTo: z.nativeEnum(BillingDiscountAppliesTo),
    usageLimit: z
      .coerce.number()
      .int()
      .min(1)
      .max(10_000)
      .optional(),
    expiresAt: z.string().trim().optional(),
    active: z.boolean(),
    tag: z.nativeEnum(BillingDiscountTag),
    specificProductId: z.string().cuid().nullable(),
    returnPath: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (
      value.appliesTo === BillingDiscountAppliesTo.SPECIFIC_PRODUCT &&
      !value.specificProductId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A specific product is required for product-scoped discounts.",
        path: ["specificProductId"]
      });
    }
  })
  .transform((value) => ({
    ...value,
    specificProductId:
      value.appliesTo === BillingDiscountAppliesTo.SPECIFIC_PRODUCT
        ? value.specificProductId
        : null
  }));

const billingDiscountActiveFormSchema = z.object({
  discountId: z.string().cuid(),
  active: z.boolean(),
  returnPath: z.string().optional()
});

const founderControlFormSchema = z.object({
  productId: z.string().cuid(),
  founderLimit: z.coerce.number().int().min(0).max(10_000),
  active: z.boolean(),
  returnPath: z.string().optional()
});

export function parseBillingProductFormData(formData: FormData) {
  return billingProductFormSchema.safeParse({
    productId: optionalStringEntry(formData, "productId"),
    name: stringEntry(formData, "name"),
    category: stringEntry(formData, "category"),
    description: stringEntry(formData, "description") ?? "",
    active: parseBoolean(formData.get("active")),
    membershipTier: nullableStringEntry(formData, "membershipTier"),
    founderServiceId: nullableStringEntry(formData, "founderServiceId"),
    returnPath: optionalStringEntry(formData, "returnPath")
  });
}

export function parseBillingPriceFormData(formData: FormData) {
  return billingPriceFormSchema.safeParse({
    priceId: optionalStringEntry(formData, "priceId"),
    productId: stringEntry(formData, "productId"),
    name: stringEntry(formData, "name"),
    amount: stringEntry(formData, "amount"),
    currency: stringEntry(formData, "currency"),
    billingType: stringEntry(formData, "billingType"),
    interval: nullableStringEntry(formData, "interval"),
    isFounderPrice: parseBoolean(formData.get("isFounderPrice")),
    active: parseBoolean(formData.get("active")),
    returnPath: optionalStringEntry(formData, "returnPath")
  });
}

export function parseBillingDiscountFormData(formData: FormData) {
  return billingDiscountFormSchema.safeParse({
    code: stringEntry(formData, "code"),
    name: optionalStringEntry(formData, "name"),
    type: stringEntry(formData, "type"),
    value: stringEntry(formData, "value"),
    appliesTo: stringEntry(formData, "appliesTo"),
    usageLimit: optionalStringEntry(formData, "usageLimit"),
    expiresAt: optionalStringEntry(formData, "expiresAt"),
    active: parseBoolean(formData.get("active")),
    tag: stringEntry(formData, "tag"),
    specificProductId: nullableStringEntry(formData, "specificProductId"),
    returnPath: optionalStringEntry(formData, "returnPath")
  });
}

export function parseBillingDiscountActiveFormData(formData: FormData) {
  return billingDiscountActiveFormSchema.safeParse({
    discountId: stringEntry(formData, "discountId"),
    active: parseBoolean(formData.get("active")),
    returnPath: optionalStringEntry(formData, "returnPath")
  });
}

export function parseFounderControlFormData(formData: FormData) {
  return founderControlFormSchema.safeParse({
    productId: stringEntry(formData, "productId"),
    founderLimit: stringEntry(formData, "founderLimit"),
    active: parseBoolean(formData.get("active")),
    returnPath: optionalStringEntry(formData, "returnPath")
  });
}

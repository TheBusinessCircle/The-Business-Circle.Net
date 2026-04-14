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

function isSupportedDateFormat(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) ||
    /^\d{2}\/\d{2}\/\d{4}$/.test(value) ||
    /^\d{4}\/\d{2}\/\d{2}$/.test(value)
  );
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
      .max(1)
      .optional(),
    expiresAt: z.string().trim().optional(),
    expiresAtDay: z.string().trim().optional(),
    expiresAtMonth: z.string().trim().optional(),
    expiresAtYear: z.string().trim().optional(),
    active: z.boolean(),
    tag: z.nativeEnum(BillingDiscountTag),
    specificProductId: z.string().cuid().nullable(),
    returnPath: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.type === BillingDiscountType.PERCENTAGE && value.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage discounts must be between 1 and 100.",
        path: ["value"]
      });
    }

    const hasSplitExpiry =
      Boolean(value.expiresAtDay) ||
      Boolean(value.expiresAtMonth) ||
      Boolean(value.expiresAtYear);

    if (value.expiresAt && hasSplitExpiry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either the single expiry field or the day/month/year fields.",
        path: ["expiresAt"]
      });
      return;
    }

    if (hasSplitExpiry) {
      if (!value.expiresAtDay || !value.expiresAtMonth || !value.expiresAtYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expiry day, month, and year must all be provided.",
          path: ["expiresAt"]
        });
      }

      const day = Number(value.expiresAtDay);
      const month = Number(value.expiresAtMonth);
      const yearRaw = Number(value.expiresAtYear);
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;

      if (
        !Number.isFinite(day) ||
        !Number.isFinite(month) ||
        !Number.isFinite(year) ||
        day < 1 ||
        day > 31 ||
        month < 1 ||
        month > 12 ||
        year < 2000 ||
        year > 2100
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expiry date is invalid.",
          path: ["expiresAt"]
        });
      }
    } else if (value.expiresAt && !isSupportedDateFormat(value.expiresAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry dates must be YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, or use the split fields.",
        path: ["expiresAt"]
      });
    }

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
  .transform((value) => {
    const hasSplitExpiry =
      Boolean(value.expiresAtDay) ||
      Boolean(value.expiresAtMonth) ||
      Boolean(value.expiresAtYear);

    const normalizedYear = hasSplitExpiry
      ? (() => {
          const yearRaw = Number(value.expiresAtYear);
          const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
          return String(year).padStart(4, "0");
        })()
      : null;

    const expiresAt = hasSplitExpiry
      ? `${normalizedYear}-${String(value.expiresAtMonth).padStart(2, "0")}-${String(
          value.expiresAtDay
        ).padStart(2, "0")}`
      : value.expiresAt;

    return {
      ...value,
      expiresAt,
      specificProductId:
        value.appliesTo === BillingDiscountAppliesTo.SPECIFIC_PRODUCT
          ? value.specificProductId
          : null
    };
  });

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
    expiresAtDay: optionalStringEntry(formData, "expiresAtDay"),
    expiresAtMonth: optionalStringEntry(formData, "expiresAtMonth"),
    expiresAtYear: optionalStringEntry(formData, "expiresAtYear"),
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

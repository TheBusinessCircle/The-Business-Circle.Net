"use server";

import {
  BillingDiscountAppliesTo,
  BillingDiscountTag,
  BillingDiscountType,
  BillingInterval,
  BillingPriceBillingType,
  BillingProductCategory,
  MembershipTier
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import {
  createBillingDiscountWithStripe,
  syncBillingCatalogWithStripe,
  updateBillingDiscountActiveState,
  updateFounderControl,
  upsertBillingPrice,
  upsertBillingProduct
} from "@/server/products-pricing";

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(value: string | undefined, fallback: string) {
  return safeRedirectPath(value, fallback);
}

function redirectWithError(path: string, code: string): never {
  redirect(appendQueryParam(path, "error", code));
}

function redirectWithNotice(path: string, code: string): never {
  redirect(appendQueryParam(path, "notice", code));
}

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function revalidateProductsPricingPaths() {
  revalidatePath("/admin/products-pricing");
  revalidatePath("/admin/founding");
  revalidatePath("/admin/founder-services");
  revalidatePath("/membership");
  revalidatePath("/join");
  revalidatePath("/founder");
  revalidatePath("/dashboard");
}

const productSchema = z.object({
  productId: z.string().cuid().optional().or(z.literal("")),
  name: z.string().trim().min(3).max(120),
  category: z.nativeEnum(BillingProductCategory),
  description: z.string().trim().max(500),
  active: z.boolean(),
  membershipTier: z.nativeEnum(MembershipTier).optional().nullable(),
  founderServiceId: z.string().cuid().optional().nullable(),
  returnPath: z.string().optional()
});

const priceSchema = z.object({
  priceId: z.string().cuid().optional().or(z.literal("")),
  productId: z.string().cuid(),
  name: z.string().trim().min(2).max(80),
  amount: z.coerce.number().int().min(0).max(10_000_000),
  currency: z.string().trim().min(3).max(3).default("GBP"),
  billingType: z.nativeEnum(BillingPriceBillingType),
  interval: z.nativeEnum(BillingInterval).optional().nullable(),
  isFounderPrice: z.boolean(),
  active: z.boolean(),
  returnPath: z.string().optional()
});

const discountSchema = z.object({
  code: z.string().trim().min(3).max(64),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  type: z.nativeEnum(BillingDiscountType),
  value: z.coerce.number().int().min(1).max(10_000_000),
  appliesTo: z.nativeEnum(BillingDiscountAppliesTo),
  usageLimit: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().min(1).max(10_000).optional()
  ),
  expiresAt: z.string().trim().optional().or(z.literal("")),
  active: z.boolean(),
  tag: z.nativeEnum(BillingDiscountTag),
  specificProductId: z.string().cuid().optional().or(z.literal("")),
  returnPath: z.string().optional()
});

const discountActiveSchema = z.object({
  discountId: z.string().cuid(),
  active: z.boolean(),
  returnPath: z.string().optional()
});

const founderControlSchema = z.object({
  productId: z.string().cuid(),
  founderLimit: z.coerce.number().int().min(0).max(10_000),
  active: z.boolean(),
  returnPath: z.string().optional()
});

export async function upsertBillingProductAction(formData: FormData) {
  await requireAdmin();

  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/products-pricing"
  );

  const parsed = productSchema.safeParse({
    productId: formData.get("productId"),
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
    active: parseBoolean(formData.get("active")),
    membershipTier:
      typeof formData.get("membershipTier") === "string" && formData.get("membershipTier")
        ? String(formData.get("membershipTier"))
        : null,
    founderServiceId:
      typeof formData.get("founderServiceId") === "string" && formData.get("founderServiceId")
        ? String(formData.get("founderServiceId"))
        : null,
    returnPath: formData.get("returnPath")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "product-invalid");
  }

  try {
    await upsertBillingProduct({
      productId: parsed.data.productId || undefined,
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description,
      active: parsed.data.active,
      membershipTier: parsed.data.membershipTier ?? null,
      founderServiceId: parsed.data.founderServiceId || null
    });
  } catch {
    redirectWithError(returnPath, "product-save-failed");
  }

  revalidateProductsPricingPaths();
  redirectWithNotice(returnPath, "product-saved");
}

export async function upsertBillingPriceAction(formData: FormData) {
  await requireAdmin();

  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/products-pricing"
  );

  const parsed = priceSchema.safeParse({
    priceId: formData.get("priceId"),
    productId: formData.get("productId"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    billingType: formData.get("billingType"),
    interval:
      typeof formData.get("interval") === "string" && formData.get("interval")
        ? String(formData.get("interval"))
        : null,
    isFounderPrice: parseBoolean(formData.get("isFounderPrice")),
    active: parseBoolean(formData.get("active")),
    returnPath: formData.get("returnPath")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "price-invalid");
  }

  try {
    await upsertBillingPrice({
      priceId: parsed.data.priceId || undefined,
      productId: parsed.data.productId,
      name: parsed.data.name,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      billingType: parsed.data.billingType,
      interval: parsed.data.interval ?? null,
      isFounderPrice: parsed.data.isFounderPrice,
      active: parsed.data.active
    });
  } catch {
    redirectWithError(returnPath, "price-save-failed");
  }

  revalidateProductsPricingPaths();
  redirectWithNotice(returnPath, "price-saved");
}

export async function createBillingDiscountAction(formData: FormData) {
  await requireAdmin();

  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/products-pricing"
  );

  const parsed = discountSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    type: formData.get("type"),
    value: formData.get("value"),
    appliesTo: formData.get("appliesTo"),
    usageLimit: formData.get("usageLimit"),
    expiresAt: formData.get("expiresAt"),
    active: parseBoolean(formData.get("active")),
    tag: formData.get("tag"),
    specificProductId: formData.get("specificProductId"),
    returnPath: formData.get("returnPath")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "discount-invalid");
  }

  try {
    await createBillingDiscountWithStripe({
      code: parsed.data.code,
      name: parsed.data.name || undefined,
      type: parsed.data.type,
      value: parsed.data.value,
      appliesTo: parsed.data.appliesTo,
      usageLimit: parsed.data.usageLimit ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      active: parsed.data.active,
      tag: parsed.data.tag,
      specificProductId: parsed.data.specificProductId || null
    });
  } catch {
    redirectWithError(returnPath, "discount-create-failed");
  }

  revalidateProductsPricingPaths();
  redirectWithNotice(returnPath, "discount-created");
}

export async function updateBillingDiscountActiveAction(formData: FormData) {
  await requireAdmin();

  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/products-pricing"
  );

  const parsed = discountActiveSchema.safeParse({
    discountId: formData.get("discountId"),
    active: parseBoolean(formData.get("active")),
    returnPath: formData.get("returnPath")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "discount-update-invalid");
  }

  try {
    await updateBillingDiscountActiveState({
      discountId: parsed.data.discountId,
      active: parsed.data.active
    });
  } catch {
    redirectWithError(returnPath, "discount-update-failed");
  }

  revalidateProductsPricingPaths();
  redirectWithNotice(returnPath, "discount-updated");
}

export async function updateFounderControlAction(formData: FormData) {
  await requireAdmin();

  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/products-pricing"
  );

  const parsed = founderControlSchema.safeParse({
    productId: formData.get("productId"),
    founderLimit: formData.get("founderLimit"),
    active: parseBoolean(formData.get("active")),
    returnPath: formData.get("returnPath")
  });

  if (!parsed.success) {
    redirectWithError(returnPath, "founder-control-invalid");
  }

  try {
    await updateFounderControl({
      productId: parsed.data.productId,
      founderLimit: parsed.data.founderLimit,
      active: parsed.data.active
    });
  } catch (error) {
    if (error instanceof Error && error.message === "founding-limit-below-claimed") {
      redirectWithError(returnPath, "founder-limit-below-claimed");
    }

    redirectWithError(returnPath, "founder-control-failed");
  }

  revalidateProductsPricingPaths();
  redirectWithNotice(returnPath, "founder-control-updated");
}

export async function syncBillingCatalogAction(formData: FormData) {
  await requireAdmin();

  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/products-pricing"
  );

  try {
    await syncBillingCatalogWithStripe();
  } catch {
    redirectWithError(returnPath, "stripe-sync-failed");
  }

  revalidateProductsPricingPaths();
  redirectWithNotice(returnPath, "stripe-sync-complete");
}

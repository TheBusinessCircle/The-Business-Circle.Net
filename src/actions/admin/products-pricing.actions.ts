"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import {
  parseBillingDiscountActiveFormData,
  parseBillingDiscountFormData,
  parseBillingPriceFormData,
  parseBillingProductFormData,
  parseFounderControlFormData
} from "@/actions/admin/products-pricing.parsers";
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

function revalidateProductsPricingPaths() {
  revalidatePath("/admin/products-pricing");
  revalidatePath("/admin/founding");
  revalidatePath("/admin/founder-services");
  revalidatePath("/membership");
  revalidatePath("/join");
  revalidatePath("/founder");
  revalidatePath("/dashboard");
}

function parseExpiryDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  let year: number;
  let month: number;
  let day: number;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const slashMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const isoSlashMatch = value.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (slashMatch) {
    day = Number(slashMatch[1]);
    month = Number(slashMatch[2]);
    year = Number(slashMatch[3]);
  } else if (isoSlashMatch) {
    year = Number(isoSlashMatch[1]);
    month = Number(isoSlashMatch[2]);
    day = Number(isoSlashMatch[3]);
  } else {
    return null;
  }

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // Store at midday UTC to avoid timezone shifts when formatting dates.
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export async function upsertBillingProductAction(formData: FormData) {
  await requireAdmin();

  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/products-pricing"
  );

  const parsed = parseBillingProductFormData(formData);

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
      membershipTier: parsed.data.membershipTier,
      founderServiceId: parsed.data.founderServiceId
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

  const parsed = parseBillingPriceFormData(formData);

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
      interval: parsed.data.interval,
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

  const parsed = parseBillingDiscountFormData(formData);

  if (!parsed.success) {
    const expiresAtError = parsed.error.issues.find((issue) =>
      issue.path.includes("expiresAt")
    );
    if (expiresAtError) {
      redirectWithError(returnPath, "discount-expiry-invalid");
    }

    const valueError = parsed.error.issues.find((issue) => issue.path.includes("value"));
    if (valueError) {
      redirectWithError(returnPath, "discount-value-invalid");
    }

    redirectWithError(returnPath, "discount-invalid");
  }

  try {
    const expiresAt = parseExpiryDate(parsed.data.expiresAt);
    if (parsed.data.expiresAt && !expiresAt) {
      redirectWithError(returnPath, "discount-expiry-invalid");
    }

    await createBillingDiscountWithStripe({
      code: parsed.data.code,
      name: parsed.data.name || undefined,
      type: parsed.data.type,
      value: parsed.data.value,
      appliesTo: parsed.data.appliesTo,
      usageLimit: 1,
      expiresAt,
      active: parsed.data.active,
      tag: parsed.data.tag,
      specificProductId: parsed.data.specificProductId
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "discount-code-exists") {
        redirectWithError(returnPath, "discount-duplicate");
      }
      if (error.message === "discount-percent-out-of-range") {
        redirectWithError(returnPath, "discount-value-invalid");
      }
      if (error.message === "discount-product-sync-failed") {
        redirectWithError(returnPath, "discount-product-sync-failed");
      }
    }

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

  const parsed = parseBillingDiscountActiveFormData(formData);

  if (!parsed.success) {
    redirectWithError(returnPath, "discount-update-invalid");
  }

  try {
    await updateBillingDiscountActiveState({
      discountId: parsed.data.discountId,
      active: parsed.data.active
    });
  } catch (error) {
    if (error instanceof Error && error.message === "discount-already-redeemed") {
      redirectWithError(returnPath, "discount-already-redeemed");
    }

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

  const parsed = parseFounderControlFormData(formData);

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

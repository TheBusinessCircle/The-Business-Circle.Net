"use server";

import {
  FounderClientStage,
  FounderServiceDiscountTag,
  FounderServiceDiscountType,
  FounderServicePaymentStatus,
  FounderServiceStatus
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { requireAdmin } from "@/lib/session";
import {
  createFounderServiceCheckoutSession,
  createFounderServiceDiscountCodeWithStripe,
  syncFounderServiceStripeCatalog,
  updateFounderServiceRequestForAdmin
} from "@/server/founder";

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(value: string | undefined, fallback: string): string {
  return safeRedirectPath(value, fallback);
}

function redirectWithError(path: string, errorCode: string): never {
  redirect(appendQueryParam(path, "error", errorCode));
}

function redirectWithNotice(path: string, noticeCode: string): never {
  redirect(appendQueryParam(path, "notice", noticeCode));
}

function revalidateFounderServiceAdminPaths(requestId?: string) {
  revalidatePath("/admin/founder-services");
  if (requestId) {
    revalidatePath(`/admin/founder-services/${requestId}`);
  }
  revalidatePath("/founder");
}

function lastStringValue(formData: FormData, key: string): string | undefined {
  const values = formData.getAll(key);
  const raw = values.at(-1);
  return typeof raw === "string" ? raw : undefined;
}

function parseOptionalEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: string | undefined
): T[keyof T] | undefined {
  if (!value) {
    return undefined;
  }

  return Object.values(enumObject).includes(value as T[keyof T])
    ? (value as T[keyof T])
    : undefined;
}

function parseOptionalDateTime(value: string | undefined): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "true" || value === "on" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return undefined;
}

const updateFounderRequestIdentitySchema = z.object({
  requestId: z.string().cuid(),
  returnPath: z.string().optional()
});

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (value === "" || value == null) {
      return undefined;
    }

    return value;
  }, schema.optional());

const createFounderDiscountSchema = z.object({
  code: z.string().trim().min(3).max(64),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  type: z.nativeEnum(FounderServiceDiscountType),
  percentOff: optionalNumber(z.coerce.number().int().min(1).max(100)),
  amountOff: optionalNumber(z.coerce.number().int().min(1).max(1_000_000)),
  currency: z.string().trim().min(3).max(3).optional().default("GBP"),
  expiresAt: z.string().trim().optional().or(z.literal("")),
  usageLimit: optionalNumber(z.coerce.number().int().min(1).max(5000)),
  tag: z.nativeEnum(FounderServiceDiscountTag),
  returnPath: z.string().optional()
});

const createCheckoutLinkSchema = z.object({
  requestId: z.string().cuid(),
  adminDiscountCodeId: z.string().cuid().optional().or(z.literal("")),
  returnPath: z.string().optional()
});

export async function updateFounderServiceRequestAction(formData: FormData) {
  await requireAdmin();

  const identity = updateFounderRequestIdentitySchema.safeParse({
    requestId: formData.get("requestId"),
    returnPath: formData.get("returnPath")
  });

  const fallbackReturnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/founder-services"
  );

  if (!identity.success) {
    redirectWithError(fallbackReturnPath, "invalid");
  }

  const paymentStatus = parseOptionalEnumValue(
    FounderServicePaymentStatus,
    lastStringValue(formData, "paymentStatus")
  );
  const serviceStatus = parseOptionalEnumValue(
    FounderServiceStatus,
    lastStringValue(formData, "serviceStatus")
  );
  const pipelineStage = parseOptionalEnumValue(
    FounderClientStage,
    lastStringValue(formData, "pipelineStage")
  );
  const auditStartAt = parseOptionalDateTime(lastStringValue(formData, "auditStartAt"));
  const auditDueAt = parseOptionalDateTime(lastStringValue(formData, "auditDueAt"));
  const callScheduledAt = parseOptionalDateTime(lastStringValue(formData, "callScheduledAt"));
  const taskAuditChecklistComplete = parseOptionalBoolean(
    lastStringValue(formData, "taskAuditChecklistComplete")
  );
  const taskCallCompleted = parseOptionalBoolean(lastStringValue(formData, "taskCallCompleted"));
  const taskFollowUpSent = parseOptionalBoolean(lastStringValue(formData, "taskFollowUpSent"));

  if (
    (lastStringValue(formData, "paymentStatus") && !paymentStatus) ||
    (lastStringValue(formData, "serviceStatus") && !serviceStatus) ||
    (lastStringValue(formData, "pipelineStage") && !pipelineStage) ||
    (lastStringValue(formData, "auditStartAt") && auditStartAt === undefined) ||
    (lastStringValue(formData, "auditDueAt") && auditDueAt === undefined) ||
    (lastStringValue(formData, "callScheduledAt") && callScheduledAt === undefined) ||
    (lastStringValue(formData, "taskAuditChecklistComplete") && taskAuditChecklistComplete === undefined) ||
    (lastStringValue(formData, "taskCallCompleted") && taskCallCompleted === undefined) ||
    (lastStringValue(formData, "taskFollowUpSent") && taskFollowUpSent === undefined)
  ) {
    redirectWithError(fallbackReturnPath, "invalid");
  }

  const returnPath = resolveReturnPath(identity.data.returnPath, fallbackReturnPath);

  try {
    await updateFounderServiceRequestForAdmin({
      requestId: identity.data.requestId,
      paymentStatus,
      serviceStatus,
      pipelineStage,
      adminNotes:
        typeof formData.get("adminNotes") === "string" ? String(formData.get("adminNotes")) : undefined,
      adminDiscountCodeId:
        typeof formData.get("adminDiscountCodeId") === "string"
          ? String(formData.get("adminDiscountCodeId")).trim() || null
          : undefined,
      auditStartAt,
      auditDueAt,
      callScheduledAt,
      taskAuditChecklistComplete,
      taskCallCompleted,
      taskFollowUpSent
    });
  } catch {
    redirectWithError(returnPath, "not-found");
  }

  revalidateFounderServiceAdminPaths(identity.data.requestId);
  redirectWithNotice(returnPath, "request-updated");
}

export async function createFounderServiceDiscountCodeAction(formData: FormData) {
  await requireAdmin();

  const parsed = createFounderDiscountSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    type: formData.get("type"),
    percentOff: formData.get("percentOff"),
    amountOff: formData.get("amountOff"),
    currency: formData.get("currency"),
    expiresAt: formData.get("expiresAt"),
    usageLimit: formData.get("usageLimit"),
    tag: formData.get("tag"),
    returnPath: formData.get("returnPath")
  });

  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/founder-services"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "discount-invalid");
  }

  if (parsed.data.type === "PERCENT" && !parsed.data.percentOff) {
    redirectWithError(returnPath, "discount-invalid");
  }

  if (parsed.data.type === "FIXED" && !parsed.data.amountOff) {
    redirectWithError(returnPath, "discount-invalid");
  }

  try {
    await createFounderServiceDiscountCodeWithStripe({
      code: parsed.data.code,
      name: parsed.data.name || undefined,
      type: parsed.data.type,
      percentOff: parsed.data.percentOff ?? null,
      amountOff: parsed.data.amountOff ?? null,
      currency: parsed.data.currency,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      usageLimit: parsed.data.usageLimit,
      tag: parsed.data.tag
    });
  } catch {
    redirectWithError(returnPath, "discount-create-failed");
  }

  revalidateFounderServiceAdminPaths();
  redirectWithNotice(returnPath, "discount-created");
}

export async function syncFounderServiceStripeCatalogAction(formData: FormData) {
  await requireAdmin();

  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/founder-services"
  );

  try {
    await syncFounderServiceStripeCatalog();
  } catch {
    redirectWithError(returnPath, "stripe-sync-failed");
  }

  revalidateFounderServiceAdminPaths();
  redirectWithNotice(returnPath, "stripe-sync-complete");
}

export async function createFounderServiceCheckoutLinkAction(formData: FormData) {
  await requireAdmin();

  const parsed = createCheckoutLinkSchema.safeParse({
    requestId: formData.get("requestId"),
    adminDiscountCodeId: formData.get("adminDiscountCodeId"),
    returnPath: formData.get("returnPath")
  });

  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/founder-services"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "checkout-link-invalid");
  }

  try {
    await createFounderServiceCheckoutSession(parsed.data.requestId, {
      adminDiscountCodeId: parsed.data.adminDiscountCodeId || null,
      markCheckoutLinkSent: true
    });
  } catch {
    redirectWithError(returnPath, "checkout-link-failed");
  }

  revalidateFounderServiceAdminPaths(parsed.data.requestId);
  redirectWithNotice(returnPath, "checkout-link-created");
}

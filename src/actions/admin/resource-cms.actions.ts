"use server";

import {
  MembershipTier,
  Prisma,
  ResourceApprovalStatus,
  ResourceImageStatus,
  ResourceStatus,
  ResourceTier,
  ResourceType
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  RESOURCE_SCHEDULE_TIMEZONE,
  isValidResourceCategoryForTier
} from "@/config/resources";
import { safeRedirectPath } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { countWords, zonedDateTimeToUtc } from "@/lib/resources";
import { membershipTierForResourceTier } from "@/lib/db/access";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { findNextAvailableResourceSlot } from "@/server/resources/resource-publishing.service";
import {
  approveAndScheduleDailyResourceBatch,
  approveDailyResourceBatch,
  backfillResourceImages,
  formatBackfillSummary,
  approveGeneratedResource,
  generateCoverImageForResource,
  generateDailyResourceBatch,
  regenerateGeneratedResourceArticle,
  rejectGeneratedResource,
  toggleGeneratedResourceLock
} from "@/server/resources";
import { ResourceGenerationError } from "@/server/resources/resource-generation-guards";

const editorSchema = z.object({
  resourceId: z.string().cuid().optional().or(z.literal("")),
  returnPath: z.string().optional(),
  title: z.string().trim().min(8).max(180),
  slug: z.string().trim().max(220).optional().or(z.literal("")),
  excerpt: z.string().trim().min(24).max(320),
  coverImage: z.string().trim().url().optional().or(z.literal("")),
  imageDirection: z.string().trim().max(900).optional().or(z.literal("")),
  imagePrompt: z.string().trim().max(2200).optional().or(z.literal("")),
  generatedImageUrl: z.string().trim().url().optional().or(z.literal("")),
  approvalStatus: z.nativeEnum(ResourceApprovalStatus).optional(),
  imageStatus: z.nativeEnum(ResourceImageStatus).optional(),
  tier: z.nativeEnum(ResourceTier),
  category: z.string().trim().min(3).max(80),
  type: z.nativeEnum(ResourceType),
  content: z.string().trim().min(120),
  scheduledFor: z.string().trim().optional().or(z.literal("")),
  intent: z.enum(["save_draft", "schedule", "publish"])
});

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function appendQueryParams(path: string, params: Record<string, string>): string {
  const url = new URL(path, "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
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

function deriveResourceSlug(inputSlug: string, title: string): string {
  const base = slugify(inputSlug || title).replace(/(^-|-$)/g, "");

  if (!base) {
    throw new Error("invalid-slug");
  }

  return base.slice(0, 220);
}

function parseScheduledDateTime(
  value: string,
  fallbackTier: ResourceTier
): Promise<Date | null> | Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
  );

  if (!match) {
    throw new Error(`invalid-scheduled-${fallbackTier.toLowerCase()}`);
  }

  return zonedDateTimeToUtc(
    {
      year: Number.parseInt(match[1], 10),
      month: Number.parseInt(match[2], 10),
      day: Number.parseInt(match[3], 10),
      hour: Number.parseInt(match[4], 10),
      minute: Number.parseInt(match[5], 10)
    },
    RESOURCE_SCHEDULE_TIMEZONE
  );
}

function validateEditorialRules(content: string, excerpt: string) {
  const wordCount = countWords(content);
  if (wordCount < 600 || wordCount > 1200) {
    throw new Error("invalid-length");
  }

  const requiredHeadings = ["## Reality", "## Breakdown", "## Shift", "## Next step"];
  if (requiredHeadings.some((heading) => !content.includes(heading))) {
    throw new Error("invalid-structure");
  }

  if ([content, excerpt].some((value) => value.includes("—"))) {
    throw new Error("invalid-tone");
  }
}

function toStatusFromIntent(intent: z.infer<typeof editorSchema>["intent"]) {
  if (intent === "publish") {
    return ResourceStatus.PUBLISHED;
  }

  if (intent === "schedule") {
    return ResourceStatus.SCHEDULED;
  }

  return ResourceStatus.DRAFT;
}

function toApprovalStatusFromEditor(input: {
  selected?: ResourceApprovalStatus;
  finalStatus: ResourceStatus;
}) {
  if (input.finalStatus === ResourceStatus.PUBLISHED) {
    return ResourceApprovalStatus.PUBLISHED;
  }

  if (input.finalStatus === ResourceStatus.SCHEDULED) {
    return ResourceApprovalStatus.SCHEDULED;
  }

  return input.selected ?? ResourceApprovalStatus.MANUAL;
}

function toImageStatusFromEditor(input: {
  selected?: ResourceImageStatus;
  coverImage?: string;
  generatedImageUrl?: string;
  imagePrompt?: string;
}) {
  if (input.generatedImageUrl?.trim()) {
    return ResourceImageStatus.GENERATED;
  }

  if (input.coverImage?.trim()) {
    return input.selected ?? ResourceImageStatus.MANUAL;
  }

  if (input.imagePrompt?.trim()) {
    return input.selected ?? ResourceImageStatus.PROMPT_READY;
  }

  return input.selected ?? ResourceImageStatus.MANUAL;
}

function toLegacyTier(tier: ResourceTier): MembershipTier {
  return membershipTierForResourceTier(tier);
}

function toDateTimeLocalValue(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESOURCE_SCHEDULE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(value);
  const lookup = (type: string) => parts.find((part) => part.type === type)?.value || "00";

  return `${lookup("year")}-${lookup("month")}-${lookup("day")}T${lookup("hour")}:${lookup("minute")}`;
}

function revalidateResourcePaths(slug?: string) {
  revalidatePath("/dashboard/resources");
  revalidatePath("/dashboard");
  revalidatePath("/inner-circle");
  revalidatePath("/admin");
  revalidatePath("/admin/resources");

  if (slug) {
    revalidatePath(`/dashboard/resources/${slug}`);
  }
}

async function persistResourceFromFormData(formData: FormData, mode: "create" | "update") {
  const fallbackPath = mode === "create" ? "/admin/resources/new" : "/admin/resources";
  const fallbackReturnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    fallbackPath
  );

  const parsed = editorSchema.safeParse({
    resourceId: String(formData.get("resourceId") || ""),
    returnPath: String(formData.get("returnPath") || ""),
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    coverImage: String(formData.get("coverImage") || ""),
    imageDirection: String(formData.get("imageDirection") || ""),
    imagePrompt: String(formData.get("imagePrompt") || ""),
    generatedImageUrl: String(formData.get("generatedImageUrl") || ""),
    approvalStatus: String(formData.get("approvalStatus") || "") || undefined,
    imageStatus: String(formData.get("imageStatus") || "") || undefined,
    tier: String(formData.get("tier") || ""),
    category: String(formData.get("category") || ""),
    type: String(formData.get("type") || ""),
    content: String(formData.get("content") || ""),
    scheduledFor: String(formData.get("scheduledFor") || ""),
    intent: String(formData.get("intent") || "")
  });

  if (!parsed.success) {
    redirectWithError(fallbackReturnPath, "invalid");
  }

  const input = parsed.data;
  const returnPath = resolveReturnPath(input.returnPath, fallbackReturnPath);
  const session = await requireAdmin();

  if (!isValidResourceCategoryForTier(input.category, input.tier)) {
    redirectWithError(returnPath, "invalid-category");
  }

  let slug = "";
  try {
    slug = deriveResourceSlug(input.slug ?? "", input.title);
  } catch {
    redirectWithError(returnPath, "invalid-slug");
  }

  const status = toStatusFromIntent(input.intent);
  const needsEditorialValidation =
    status === ResourceStatus.PUBLISHED || status === ResourceStatus.SCHEDULED;

  if (needsEditorialValidation) {
    try {
      validateEditorialRules(input.content, input.excerpt);
    } catch (error) {
      if (error instanceof Error && error.message === "invalid-length") {
        redirectWithError(returnPath, "invalid-length");
      }

      if (error instanceof Error && error.message === "invalid-structure") {
        redirectWithError(returnPath, "invalid-structure");
      }

      if (error instanceof Error && error.message === "invalid-tone") {
        redirectWithError(returnPath, "invalid-tone");
      }

      throw error;
    }
  }

  let scheduledFor: Date | null = null;
  let publishedAt: Date | null = null;

  if (status === ResourceStatus.SCHEDULED) {
    try {
      scheduledFor =
        (await parseScheduledDateTime(input.scheduledFor ?? "", input.tier)) ??
        (await findNextAvailableResourceSlot(input.tier));
    } catch {
      redirectWithError(returnPath, "invalid-schedule");
    }

    if (scheduledFor && scheduledFor.getTime() <= Date.now()) {
      publishedAt = scheduledFor;
      scheduledFor = null;
    }
  }

  if (status === ResourceStatus.PUBLISHED) {
    publishedAt = new Date();
  }

  const finalStatus =
    publishedAt && status === ResourceStatus.SCHEDULED ? ResourceStatus.PUBLISHED : status;
  const estimatedReadMinutes = Math.max(3, Math.ceil(countWords(input.content) / 220));
  const finalApprovalStatus = toApprovalStatusFromEditor({
    selected: input.approvalStatus,
    finalStatus
  });
  const finalImageStatus = toImageStatusFromEditor({
    selected: input.imageStatus,
    coverImage: input.coverImage,
    generatedImageUrl: input.generatedImageUrl,
    imagePrompt: input.imagePrompt
  });

  try {
    const resource = await db.$transaction(async (tx) => {
      const baseData = {
        title: input.title,
        slug,
        excerpt: input.excerpt,
        coverImage: input.coverImage || null,
        imageDirection: input.imageDirection || null,
        imagePrompt: input.imagePrompt || null,
        generatedImageUrl: input.generatedImageUrl || null,
        imageStatus: finalImageStatus,
        approvalStatus: finalApprovalStatus,
        summary: input.excerpt,
        content: input.content,
        tier: input.tier,
        accessTier: toLegacyTier(input.tier),
        category: input.category,
        type: input.type,
        status: finalStatus,
        scheduledFor,
        publishedAt,
        estimatedReadMinutes,
        approvedAt:
          finalApprovalStatus === ResourceApprovalStatus.APPROVED ||
          finalApprovalStatus === ResourceApprovalStatus.SCHEDULED ||
          finalApprovalStatus === ResourceApprovalStatus.PUBLISHED
            ? new Date()
            : null,
        approvedById:
          finalApprovalStatus === ResourceApprovalStatus.APPROVED ||
          finalApprovalStatus === ResourceApprovalStatus.SCHEDULED ||
          finalApprovalStatus === ResourceApprovalStatus.PUBLISHED
            ? session.user.id
            : null,
        rejectedAt:
          finalApprovalStatus === ResourceApprovalStatus.REJECTED ? new Date() : null,
        rejectedById:
          finalApprovalStatus === ResourceApprovalStatus.REJECTED ? session.user.id : null
      };

      if (mode === "update") {
        const resourceId = input.resourceId || "";
        if (!resourceId) {
          throw new Error("invalid");
        }

        const existing = await tx.resource.findUnique({
          where: { id: resourceId },
          select: { id: true, slug: true }
        });

        if (!existing) {
          throw new Error("not-found");
        }

        return tx.resource.update({
          where: { id: resourceId },
          data: baseData,
          select: {
            id: true,
            slug: true
          }
        });
      }

      return tx.resource.create({
        data: {
          ...baseData,
          authorId: session.user.id
        },
        select: {
          id: true,
          slug: true
        }
      });
    });

    revalidateResourcePaths(resource.slug);
    redirectWithNotice(
      `/admin/resources/${resource.id}`,
      finalStatus === ResourceStatus.PUBLISHED
        ? "published"
        : finalStatus === ResourceStatus.SCHEDULED
          ? "scheduled"
          : "draft-saved"
    );
  } catch (error) {
    if (error instanceof Error && error.message === "not-found") {
      redirectWithError(returnPath, "not-found");
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithError(returnPath, "slug-exists");
    }

    throw error;
  }
}

export async function createResourceFromEditorAction(formData: FormData) {
  await persistResourceFromFormData(formData, "create");
}

export async function updateResourceFromEditorAction(formData: FormData) {
  await persistResourceFromFormData(formData, "update");
}

export async function deleteResourceAction(formData: FormData) {
  await requireAdmin();

  const resourceId = String(formData.get("resourceId") || "").trim();
  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/resources"
  );

  if (!resourceId) {
    redirectWithError(returnPath, "invalid");
  }

  try {
    const existing = await db.resource.findUnique({
      where: { id: resourceId },
      select: { slug: true }
    });

    if (!existing) {
      redirectWithError(returnPath, "not-found");
    }

    await db.resource.delete({
      where: { id: resourceId }
    });

    revalidateResourcePaths(existing.slug);
    redirectWithNotice("/admin/resources", "deleted");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirectWithError(returnPath, "not-found");
    }

    throw error;
  }
}

export async function setResourceStatusAction(formData: FormData) {
  const session = await requireAdmin();

  const resourceId = String(formData.get("resourceId") || "").trim();
  const intent = String(formData.get("intent") || "").trim();
  const returnPath = resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    "/admin/resources"
  );

  if (!resourceId || (intent !== "save_draft" && intent !== "publish")) {
    redirectWithError(returnPath, "invalid");
  }

  const status =
    intent === "publish" ? ResourceStatus.PUBLISHED : ResourceStatus.DRAFT;

  try {
    const existing = await db.resource.findUnique({
      where: { id: resourceId },
      select: { slug: true }
    });

    if (!existing) {
      redirectWithError(returnPath, "not-found");
    }

    await db.resource.update({
      where: { id: resourceId },
      data: {
        status,
        approvalStatus:
          status === ResourceStatus.PUBLISHED
            ? ResourceApprovalStatus.PUBLISHED
            : ResourceApprovalStatus.MANUAL,
        approvedAt: status === ResourceStatus.PUBLISHED ? new Date() : null,
        approvedById: status === ResourceStatus.PUBLISHED ? session.user.id : null,
        publishedAt: status === ResourceStatus.PUBLISHED ? new Date() : null,
        scheduledFor: null
      }
    });

    revalidateResourcePaths(existing.slug);
    redirectWithNotice(
      returnPath,
      status === ResourceStatus.PUBLISHED ? "published" : "draft-saved"
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirectWithError(returnPath, "not-found");
    }

    throw error;
  }
}

function resourceWorkflowReturnPath(formData: FormData, fallback = "/admin/resources") {
  return resolveReturnPath(
    typeof formData.get("returnPath") === "string"
      ? String(formData.get("returnPath"))
      : undefined,
    fallback
  );
}

function parseGenerationDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("invalid-generation-date");
  }

  return new Date(
    Date.UTC(
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10) - 1,
      Number.parseInt(match[3], 10)
    )
  );
}

function redirectWithWorkflowError(returnPath: string, error: unknown): never {
  if (error instanceof ResourceGenerationError) {
    redirectWithError(returnPath, error.code);
  }

  if (error instanceof Error && error.message === "invalid-generation-date") {
    redirectWithError(returnPath, "invalid-generation-date");
  }

  throw error;
}

export async function generateDailyResourceBatchAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resourceWorkflowReturnPath(formData);

  try {
    await generateDailyResourceBatch({
      generationDate: parseGenerationDate(String(formData.get("generationDate") || "")),
      generatedById: session.user.id,
      force: String(formData.get("force") || "") === "true",
      generateImages: String(formData.get("generateImages") || "true") !== "false"
    });

    revalidateResourcePaths();
    redirectWithNotice(returnPath, "daily-generated");
  } catch (error) {
    redirectWithWorkflowError(returnPath, error);
  }
}

export async function approveGeneratedResourceAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resourceWorkflowReturnPath(formData);
  const resourceId = String(formData.get("resourceId") || "").trim();

  if (!resourceId) {
    redirectWithError(returnPath, "invalid");
  }

  try {
    await approveGeneratedResource({ resourceId, adminUserId: session.user.id });
    revalidateResourcePaths();
    redirectWithNotice(returnPath, "resource-approved");
  } catch (error) {
    redirectWithWorkflowError(returnPath, error);
  }
}

export async function rejectGeneratedResourceAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resourceWorkflowReturnPath(formData);
  const resourceId = String(formData.get("resourceId") || "").trim();

  if (!resourceId) {
    redirectWithError(returnPath, "invalid");
  }

  try {
    await rejectGeneratedResource({ resourceId, adminUserId: session.user.id });
    revalidateResourcePaths();
    redirectWithNotice(returnPath, "resource-rejected");
  } catch (error) {
    redirectWithWorkflowError(returnPath, error);
  }
}

export async function regenerateGeneratedResourceArticleAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resourceWorkflowReturnPath(formData);
  const resourceId = String(formData.get("resourceId") || "").trim();

  if (!resourceId) {
    redirectWithError(returnPath, "invalid");
  }

  try {
    await regenerateGeneratedResourceArticle({ resourceId, adminUserId: session.user.id });
    revalidateResourcePaths();
    redirectWithNotice(returnPath, "resource-regenerated");
  } catch (error) {
    redirectWithWorkflowError(returnPath, error);
  }
}

export async function regenerateResourceImageAction(formData: FormData) {
  await requireAdmin();
  const returnPath = resourceWorkflowReturnPath(formData);
  const resourceId = String(formData.get("resourceId") || "").trim();

  if (!resourceId) {
    redirectWithError(returnPath, "invalid");
  }

  try {
    const result = await generateCoverImageForResource(resourceId);
    revalidateResourcePaths();
    redirectWithNotice(
      returnPath,
      result.status === ResourceImageStatus.GENERATED ? "image-generated" : "image-prompt-saved"
    );
  } catch (error) {
    redirectWithWorkflowError(returnPath, error);
  }
}

export async function toggleGeneratedResourceLockAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resourceWorkflowReturnPath(formData);
  const resourceId = String(formData.get("resourceId") || "").trim();

  if (!resourceId) {
    redirectWithError(returnPath, "invalid");
  }

  try {
    const result = await toggleGeneratedResourceLock({
      resourceId,
      adminUserId: session.user.id
    });
    revalidateResourcePaths();
    redirectWithNotice(returnPath, result.locked ? "resource-locked" : "resource-unlocked");
  } catch (error) {
    redirectWithWorkflowError(returnPath, error);
  }
}

export async function approveDailyResourceBatchAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resourceWorkflowReturnPath(formData);
  const batchId = String(formData.get("batchId") || "").trim();

  if (!batchId) {
    redirectWithError(returnPath, "invalid");
  }

  try {
    await approveDailyResourceBatch({ batchId, adminUserId: session.user.id });
    revalidateResourcePaths();
    redirectWithNotice(returnPath, "batch-approved");
  } catch (error) {
    redirectWithWorkflowError(returnPath, error);
  }
}

export async function approveAndScheduleDailyResourceBatchAction(formData: FormData) {
  const session = await requireAdmin();
  const returnPath = resourceWorkflowReturnPath(formData);
  const batchId = String(formData.get("batchId") || "").trim();

  if (!batchId) {
    redirectWithError(returnPath, "invalid");
  }

  try {
    await approveAndScheduleDailyResourceBatch({
      batchId,
      adminUserId: session.user.id
    });
    revalidateResourcePaths();
    redirectWithNotice(returnPath, "batch-scheduled");
  } catch (error) {
    redirectWithWorkflowError(returnPath, error);
  }
}

export async function backfillMissingResourceImagesAction(formData: FormData) {
  await requireAdmin();
  const returnPath = resourceWorkflowReturnPath(formData);
  const limit = Number.parseInt(String(formData.get("limit") || "10"), 10);
  const intent = String(formData.get("backfillIntent") || "").trim();
  const publishedOnly = String(formData.get("publishedOnly") || "") === "true";
  const dryRun = String(formData.get("dryRun") || "") === "true" || intent === "dry_run";
  const forcePromptsOnly =
    String(formData.get("forcePromptsOnly") || "") === "true" || intent === "prompts_only";

  try {
    const result = await backfillResourceImages({
      limit,
      publishedOnly,
      forcePromptsOnly,
      dryRun
    });

    revalidateResourcePaths();
    redirect(
      appendQueryParams(returnPath, {
        notice: "image-backfill-complete",
        backfillSummary: formatBackfillSummary(result)
      })
    );
  } catch (error) {
    redirectWithWorkflowError(returnPath, error);
  }
}

export { toDateTimeLocalValue };

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  DailyResourceBatchStatus,
  ResourceGenerationSource,
  ResourceApprovalStatus,
  ResourceImageStatus,
  ResourceMediaType,
  ResourceStatus,
  ResourceTier,
  ResourceType
} from "@prisma/client";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  ImageIcon,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  XCircle
} from "lucide-react";
import {
  approveAndScheduleDailyResourceBatchAction,
  approveDailyResourceBatchAction,
  approveGeneratedResourceAction,
  backfillMissingResourceImagesAction,
  deleteResourceAction,
  generateDailyResourceBatchAction,
  regenerateGeneratedResourceArticleAction,
  regenerateResourceImageAction,
  rejectGeneratedResourceAction,
  setResourceStatusAction,
  toggleGeneratedResourceLockAction
} from "@/actions/admin/resource-cms.actions";
import { ResourceCoverImage, ResourceTierBadge } from "@/components/resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RESOURCE_CATEGORY_OPTIONS, RESOURCE_TIER_ORDER, RESOURCE_TYPE_OPTIONS, getResourceTierLabel, getResourceTypeLabel } from "@/config/resources";
import { db } from "@/lib/db";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate, toTitleCase } from "@/lib/utils";
import { getDailyResourceBatchForDate } from "@/server/resources/daily-resource-generation.service";
import { maybePublishDueResources } from "@/server/resources/resource-publishing.service";
import { getResourceWorkflowDiagnostics } from "@/server/resources/resource-workflow-diagnostics.service";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 20;

type AdminResourceRow = {
  id: string;
  title: string;
  slug: string;
  tier: ResourceTier;
  category: string;
  type: ResourceType;
  coverImage: string | null;
  mediaType: ResourceMediaType;
  mediaUrl: string | null;
  generatedImageUrl: string | null;
  status: ResourceStatus;
  approvalStatus: ResourceApprovalStatus;
  imageStatus: ResourceImageStatus;
  imagePrompt: string | null;
  imageDirection: string | null;
  generationSource: ResourceGenerationSource;
  generationBatchId: string | null;
  generationBatch: { status: DailyResourceBatchStatus } | null;
  lockedAt: Date | null;
  scheduledFor: Date | null;
  publishedAt: Date | null;
  updatedAt: Date;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Resources",
  description: "Manage resources, schedules, and publication states.",
  path: "/admin/resources"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function buildHref(input: {
  q: string;
  status: string;
  approvalStatus: string;
  imageStatus: string;
  tier: string;
  category: string;
  type: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (input.q) params.set("q", input.q);
  if (input.status) params.set("status", input.status);
  if (input.approvalStatus) params.set("approvalStatus", input.approvalStatus);
  if (input.imageStatus) params.set("imageStatus", input.imageStatus);
  if (input.tier) params.set("tier", input.tier);
  if (input.category) params.set("category", input.category);
  if (input.type) params.set("type", input.type);
  if (input.page > 1) params.set("page", String(input.page));

  const query = params.toString();
  return query ? `/admin/resources?${query}` : "/admin/resources";
}

function feedbackMessage(input: { notice: string; error: string; backfillSummary?: string }) {
  const noticeMap: Record<string, string> = {
    "draft-saved": "Resource saved as draft.",
    scheduled: "Resource scheduled.",
    published: "Resource published.",
    deleted: "Resource deleted.",
    "daily-generated": "Today's daily resource set has been generated and placed in approval.",
    "resource-approved": "Resource approved.",
    "resource-rejected": "Resource rejected.",
    "resource-regenerated": "Resource article regenerated and returned to approval.",
    "image-generated": "Resource cover image generated.",
    "image-prompt-saved": "Image prompt saved. Generation is unavailable or skipped.",
    "resource-locked": "Resource locked from article regeneration.",
    "resource-unlocked": "Resource unlocked.",
    "batch-approved": "Daily resource set approved.",
    "batch-scheduled": "Daily resource set approved and scheduled.",
    "image-backfill-complete": input.backfillSummary
      ? `Resource image backfill complete: ${input.backfillSummary}.`
      : "Resource image backfill complete."
  };

  const errorMap: Record<string, string> = {
    invalid: "The submitted resource payload was invalid.",
    "invalid-category": "The selected category does not belong to that tier.",
    "invalid-slug": "Please provide a title or slug that resolves to a valid URL slug.",
    "slug-exists": "That slug already exists for another resource.",
    "not-found": "The requested resource could not be found.",
    "invalid-schedule": "The schedule date could not be parsed.",
    "invalid-length": "Scheduled and published resources must be between 600 and 1200 words.",
    "invalid-structure": "The article must include Reality, Breakdown, Shift, and Next step headings.",
    "invalid-tone": "The article content still includes banned punctuation or tone markers.",
    "generation-provider-not-configured": "Generation provider not configured.",
    "generation-provider-unsupported": "Generation provider is not supported.",
    "daily-batch-already-exists": "A daily set already exists for this date. Use force only when you intend to replace unlocked drafts.",
    "daily-batch-protected": "This daily set contains a locked, scheduled, or published resource and cannot be overwritten.",
    "daily-set-category-duplicate": "The generated set repeated a category and was rejected before saving.",
    "daily-set-type-duplicate": "The generated set repeated a type and was rejected before saving.",
    "content-generation-failed": "The content generation provider failed.",
    "content-generation-schema-invalid": "Generated content did not match the required schema.",
    "content-generation-json-invalid": "Generated content was not valid JSON.",
    "content-too-short": "Generated content was too short for approval.",
    "image-generation-failed": "Image generation failed, but the prompt was saved.",
    "batch-not-approved": "Schedule failed because not every resource is approved.",
    "batch-size-invalid": "Approval failed because the daily set is incomplete.",
    "resource-locked": "This resource is locked and cannot be regenerated.",
    "invalid-generation-date": "The generation date must use YYYY-MM-DD."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function formatStatusLabel(value: string) {
  return toTitleCase(value.replaceAll("_", " "));
}

function workflowBadgeVariant(value: string) {
  if (["APPROVED", "SCHEDULED", "PUBLISHED", "GENERATED"].includes(value)) {
    return "success" as const;
  }

  if (["REJECTED", "FAILED"].includes(value)) {
    return "danger" as const;
  }

  if (["PENDING_APPROVAL", "REGENERATE_REQUESTED", "PROMPT_READY", "SKIPPED"].includes(value)) {
    return "warning" as const;
  }

  return "outline" as const;
}

function WorkflowBadge({ value }: { value: string }) {
  return (
    <Badge variant={workflowBadgeVariant(value)} className="normal-case tracking-normal">
      {formatStatusLabel(value)}
    </Badge>
  );
}

function imageStateLabel(resource: {
  coverImage: string | null;
  generatedImageUrl: string | null;
  mediaType: ResourceMediaType;
  mediaUrl: string | null;
  imagePrompt?: string | null;
  imageDirection?: string | null;
  imageStatus: ResourceImageStatus;
}) {
  if (resource.coverImage && resource.generatedImageUrl) {
    return "Generated image";
  }

  if (resource.coverImage) {
    return "Manual image";
  }

  if (resource.generatedImageUrl) {
    return "Generated image";
  }

  if (resource.mediaType === ResourceMediaType.IMAGE && resource.mediaUrl) {
    return "Media image";
  }

  if (resource.imageStatus === ResourceImageStatus.FAILED) {
    return "Failed";
  }

  if (resource.imageStatus === ResourceImageStatus.PROMPT_READY || resource.imagePrompt) {
    return "Prompt ready";
  }

  if (!resource.imagePrompt && !resource.imageDirection) {
    return "Missing";
  }

  return "Fallback only";
}

function ImageStateBadge({
  resource
}: {
  resource: {
    coverImage: string | null;
    generatedImageUrl: string | null;
    mediaType: ResourceMediaType;
    mediaUrl: string | null;
    imagePrompt?: string | null;
    imageDirection?: string | null;
    imageStatus: ResourceImageStatus;
  };
}) {
  const label = imageStateLabel(resource);
  const variant =
    label === "Generated image" || label === "Manual image" || label === "Media image"
      ? "success"
      : label === "Failed" || label === "Missing"
        ? "danger"
        : label === "Prompt ready"
          ? "warning"
          : "outline";

  return (
    <Badge variant={variant} className="normal-case tracking-normal">
      {label}
    </Badge>
  );
}

function QuickActionForm({
  action,
  returnPath,
  resourceId,
  batchId,
  children
}: {
  action: (formData: FormData) => void | Promise<void>;
  returnPath: string;
  resourceId?: string;
  batchId?: string;
  children: ReactNode;
}) {
  return (
    <form action={action}>
      {resourceId ? <input type="hidden" name="resourceId" value={resourceId} /> : null}
      {batchId ? <input type="hidden" name="batchId" value={batchId} /> : null}
      <input type="hidden" name="returnPath" value={returnPath} />
      {children}
    </form>
  );
}

export default async function AdminResourcesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const diagnostics = await getResourceWorkflowDiagnostics();

  if (diagnostics.migrationReady) {
    await maybePublishDueResources();
  }

  const params = await searchParams;
  const query = firstValue(params.q).trim().slice(0, 120);
  const statusRaw = firstValue(params.status).toUpperCase();
  const approvalStatusRaw = firstValue(params.approvalStatus).toUpperCase();
  const imageStatusRaw = firstValue(params.imageStatus).toUpperCase();
  const tierRaw = firstValue(params.tier).toUpperCase();
  const category = firstValue(params.category).trim();
  const typeRaw = firstValue(params.type).toUpperCase();
  const page = parsePage(firstValue(params.page));

  const status = Object.values(ResourceStatus).includes(statusRaw as ResourceStatus)
    ? (statusRaw as ResourceStatus)
    : "";
  const approvalStatus = Object.values(ResourceApprovalStatus).includes(
    approvalStatusRaw as ResourceApprovalStatus
  )
    ? (approvalStatusRaw as ResourceApprovalStatus)
    : "";
  const imageStatus = Object.values(ResourceImageStatus).includes(
    imageStatusRaw as ResourceImageStatus
  )
    ? (imageStatusRaw as ResourceImageStatus)
    : "";
  const tier = RESOURCE_TIER_ORDER.includes(tierRaw as ResourceTier)
    ? (tierRaw as ResourceTier)
    : "";
  const type = RESOURCE_TYPE_OPTIONS.find((item) => item.value === typeRaw)?.value ?? "";

  const where = {
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
            { excerpt: { contains: query, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(status ? { status } : {}),
    ...(diagnostics.migrationReady && approvalStatus ? { approvalStatus } : {}),
    ...(diagnostics.migrationReady && imageStatus ? { imageStatus } : {}),
    ...(tier ? { tier } : {}),
    ...(category ? { category } : {}),
    ...(type ? { type } : {})
  };

  const total = await db.resource.count({ where });
  const todayBatch = diagnostics.migrationReady ? await getDailyResourceBatchForDate() : null;
  const missingImageCount = diagnostics.migrationReady
    ? await db.resource.count({
        where: {
          coverImage: null,
          generatedImageUrl: null,
          OR: [
            {
              mediaType: {
                not: ResourceMediaType.IMAGE
              }
            },
            {
              mediaUrl: null
            }
          ]
        }
      })
    : null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  const resources: AdminResourceRow[] = diagnostics.migrationReady
    ? await db.resource.findMany({
        where,
        orderBy: [
          { status: "asc" },
          { scheduledFor: "asc" },
          { publishedAt: "desc" },
          { updatedAt: "desc" }
        ],
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          title: true,
          slug: true,
          tier: true,
          category: true,
          type: true,
          coverImage: true,
          mediaType: true,
          mediaUrl: true,
          generatedImageUrl: true,
          status: true,
          approvalStatus: true,
          imageStatus: true,
          imagePrompt: true,
          imageDirection: true,
          scheduledFor: true,
          publishedAt: true,
          updatedAt: true,
          generationSource: true,
          generationBatchId: true,
          generationBatch: {
            select: {
              status: true
            }
          },
          lockedAt: true
        }
      })
    : (
        await db.resource.findMany({
          where,
          orderBy: [
            { status: "asc" },
            { scheduledFor: "asc" },
            { publishedAt: "desc" },
            { updatedAt: "desc" }
          ],
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            slug: true,
            tier: true,
            category: true,
            type: true,
            coverImage: true,
            mediaType: true,
            mediaUrl: true,
            status: true,
            scheduledFor: true,
            publishedAt: true,
            updatedAt: true
          }
        })
      ).map((resource) => ({
        ...resource,
        generatedImageUrl: null,
        approvalStatus:
          resource.status === ResourceStatus.PUBLISHED
            ? ResourceApprovalStatus.PUBLISHED
            : resource.status === ResourceStatus.SCHEDULED
              ? ResourceApprovalStatus.SCHEDULED
              : ResourceApprovalStatus.MANUAL,
        imageStatus:
          resource.coverImage || (resource.mediaType === ResourceMediaType.IMAGE && resource.mediaUrl)
            ? ResourceImageStatus.MANUAL
            : ResourceImageStatus.MANUAL,
        imagePrompt: null,
        imageDirection: null,
        generationSource: ResourceGenerationSource.MANUAL,
        generationBatchId: null,
        generationBatch: null,
        lockedAt: null
      }));

  const hasFilters = Boolean(query || status || approvalStatus || imageStatus || tier || category || type);
  const rangeStart = total ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = total ? Math.min(total, safePage * PAGE_SIZE) : 0;
  const currentPath = buildHref({
    q: query,
    status,
    approvalStatus,
    imageStatus,
    tier,
    category,
    type,
    page: safePage
  });
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error),
    backfillSummary: firstValue(params.backfillSummary)
  });

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/65">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                Resource CMS
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Admin Resource Manager</CardTitle>
              <CardDescription className="mt-2 text-base">
                Generate, approve, schedule, and refine the daily resource pipeline from one controlled editorial view.
              </CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="muted" className="normal-case tracking-normal">
                  Today: {todayBatch ? formatStatusLabel(todayBatch.status) : "No set generated"}
                </Badge>
                {todayBatch ? (
                  <Badge variant="outline" className="normal-case tracking-normal text-muted">
                    {todayBatch.resources.length}/3 resources
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={generateDailyResourceBatchAction}>
                <input type="hidden" name="returnPath" value={currentPath} />
                <Button
                  type="submit"
                  variant="core"
                  disabled={!diagnostics.dailyGenerationAvailable}
                >
                  <Sparkles size={14} className="mr-1" />
                  Generate Today&apos;s 3
                </Button>
              </form>
              <Link href="/admin/resources/new">
                <Button>
                  <Plus size={14} className="mr-1" />
                  Add Resource
                </Button>
              </Link>
              <Badge variant="muted" className="normal-case tracking-normal">
                {total} total resources
              </Badge>
              <Badge variant="outline" className="normal-case tracking-normal text-muted">
                Showing {rangeStart}-{rangeEnd}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/40 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-200" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {diagnostics.migrationReady &&
      diagnostics.contentProviderConfigured &&
      diagnostics.imageProviderConfigured &&
      diagnostics.cloudinaryConfigured ? null : (
        <Card className="border-amber-500/35 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="text-lg text-amber-100">Resource workflow needs attention</CardTitle>
            <CardDescription className="text-amber-100/80">
              The workflow remains visible, but some actions are disabled until configuration is complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-100/90">
            {!diagnostics.migrationReady ? (
              <p>
                Database migration is missing. Run the resource generation workflow migration.
                Missing tables: {diagnostics.missingTables.join(", ") || "none"}. Missing columns:{" "}
                {diagnostics.missingResourceColumns.join(", ") || "none"}.
              </p>
            ) : null}
            {!diagnostics.contentProviderConfigured ? (
              <p>
                AI provider not configured. Generation buttons are disabled until OPENAI_API_KEY / provider env vars are configured.
              </p>
            ) : null}
            {!diagnostics.imageProviderConfigured ? (
              <p>Image provider is not configured. Image prompts can still be saved.</p>
            ) : null}
            {!diagnostics.cloudinaryConfigured ? (
              <p>Cloudinary is not configured. Generated images cannot be attached to resources yet.</p>
            ) : null}
            {!diagnostics.dailyGenerationAvailable ? (
              <p>Daily generation service is unavailable until the database migration and content provider are both ready.</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card className="border-gold/24 bg-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="inline-flex items-center gap-2 text-2xl">
                <Sparkles size={18} className="text-gold" />
                Daily Resource Generation
              </CardTitle>
              <CardDescription>
                Review today&apos;s Foundation, Inner Circle, and Core resources as one editorial set.
              </CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <WorkflowBadge value={todayBatch?.status ?? "NO_BATCH"} />
                {!diagnostics.dailyGenerationAvailable ? (
                  <Badge variant="warning" className="normal-case tracking-normal">
                    Generation unavailable
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {todayBatch ? (
                <>
                  <QuickActionForm
                    action={approveDailyResourceBatchAction}
                    returnPath={currentPath}
                    batchId={todayBatch.id}
                  >
                    <Button type="submit" variant="outline" disabled={!diagnostics.migrationReady}>
                      <CheckCircle2 size={14} className="mr-1" />
                      Approve All
                    </Button>
                  </QuickActionForm>
                  <QuickActionForm
                    action={approveAndScheduleDailyResourceBatchAction}
                    returnPath={currentPath}
                    batchId={todayBatch.id}
                  >
                    <Button type="submit" disabled={!diagnostics.migrationReady}>
                      <Clock size={14} className="mr-1" />
                      Approve & Schedule All
                    </Button>
                  </QuickActionForm>
                </>
              ) : (
                <form action={generateDailyResourceBatchAction}>
                  <input type="hidden" name="returnPath" value={currentPath} />
                  <Button type="submit" disabled={!diagnostics.dailyGenerationAvailable}>
                    <Sparkles size={14} className="mr-1" />
                    Generate Today&apos;s 3 Resources
                  </Button>
                </form>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {todayBatch ? (
            <div className="grid gap-4 xl:grid-cols-3">
              {todayBatch.resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-silver/14 bg-background/22"
                >
                  <ResourceCoverImage
                    resource={resource}
                    className="aspect-[16/9] border-b border-silver/12"
                    imageClassName="object-cover"
                  />
                  <div className="flex flex-1 flex-col gap-4 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <ResourceTierBadge tier={resource.tier} />
                      <WorkflowBadge value={resource.approvalStatus} />
                      <ImageStateBadge resource={resource} />
                      {resource.lockedAt ? (
                        <Badge variant="warning" className="normal-case tracking-normal">
                          <Lock size={11} className="mr-1" />
                          Locked
                        </Badge>
                      ) : null}
                    </div>
                    <div>
                      <p className="line-clamp-2 text-base font-semibold text-foreground">
                        {resource.title}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                        {resource.excerpt}
                      </p>
                    </div>
                    <div className="grid gap-2 text-xs text-muted">
                      <p>
                        {resource.category} | {getResourceTypeLabel(resource.type)}
                      </p>
                      <p>
                        {resource.scheduledFor
                          ? `Scheduled ${formatDate(resource.scheduledFor)}`
                          : resource.publishedAt
                            ? `Published ${formatDate(resource.publishedAt)}`
                            : "Not scheduled"}
                      </p>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2">
                      <Link href={`/admin/resources/${resource.id}`}>
                        <Button variant="outline" size="sm">
                          Preview/Edit
                        </Button>
                      </Link>
                      <QuickActionForm
                        action={approveGeneratedResourceAction}
                        returnPath={currentPath}
                        resourceId={resource.id}
                      >
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          disabled={!diagnostics.migrationReady}
                        >
                          Approve
                        </Button>
                      </QuickActionForm>
                      <QuickActionForm
                        action={rejectGeneratedResourceAction}
                        returnPath={currentPath}
                        resourceId={resource.id}
                      >
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          disabled={!diagnostics.migrationReady}
                        >
                          <XCircle size={13} className="mr-1" />
                          Reject
                        </Button>
                      </QuickActionForm>
                      <QuickActionForm
                        action={regenerateGeneratedResourceArticleAction}
                        returnPath={currentPath}
                        resourceId={resource.id}
                      >
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          disabled={!diagnostics.contentProviderConfigured}
                        >
                          <RefreshCw size={13} className="mr-1" />
                          Article
                        </Button>
                      </QuickActionForm>
                      <QuickActionForm
                        action={regenerateResourceImageAction}
                        returnPath={currentPath}
                        resourceId={resource.id}
                      >
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          disabled={!diagnostics.imageGenerationAvailable}
                        >
                          <ImageIcon size={13} className="mr-1" />
                          Image
                        </Button>
                      </QuickActionForm>
                      <QuickActionForm
                        action={toggleGeneratedResourceLockAction}
                        returnPath={currentPath}
                        resourceId={resource.id}
                      >
                        <Button type="submit" variant="outline" size="sm">
                          <Lock size={13} className="mr-1" />
                          {resource.lockedAt ? "Unlock" : "Lock"}
                        </Button>
                      </QuickActionForm>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-silver/14 bg-background/20 p-6">
              <p className="text-sm text-muted">
                No daily resource set generated for today yet.
              </p>
              {!diagnostics.dailyGenerationAvailable ? (
                <p className="mt-2 text-sm text-amber-100/90">
                  AI provider not configured. Generation buttons are disabled until OPENAI_API_KEY / provider env vars are configured.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-silver/16 bg-card/62">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-xl">
            <ImageIcon size={16} className="text-silver" />
            Resource image direction
          </CardTitle>
          <CardDescription>
            Resource card and article imagery should stay clearly separate from the manual page-hero system.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Preferred tone</p>
            <p className="mt-2 text-sm leading-7 text-foreground/88">
              Premium, dark, editorial, and business-relevant beats bright lifestyle or generic startup imagery.
            </p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">What to avoid</p>
            <p className="mt-2 text-sm leading-7 text-foreground/88">
              Avoid cheesy business stock, cartoonish AI scenes, loud SaaS colours, and imagery that feels too literal or noisy.
            </p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Composition check</p>
            <p className="mt-2 text-sm leading-7 text-foreground/88">
              If you override imagery later, choose crops that still read cleanly in cards and headers without relying on baked-in text.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-silver/16 bg-card/62">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="inline-flex items-center gap-2 text-xl">
                <ImageIcon size={16} className="text-silver" />
                Existing Resource Images
              </CardTitle>
              <CardDescription>
                Prepare prompts or generate missing covers for existing resources without overwriting manual images.
              </CardDescription>
            </div>
            <Badge variant="outline" className="normal-case tracking-normal text-muted">
              {missingImageCount ?? "Unknown"} missing image{missingImageCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <form action={backfillMissingResourceImagesAction}>
            <input type="hidden" name="returnPath" value={currentPath} />
            <input type="hidden" name="limit" value="25" />
            <input type="hidden" name="forcePromptsOnly" value="true" />
            <Button type="submit" variant="outline" disabled={!diagnostics.migrationReady}>
              Prepare Missing Prompts
            </Button>
          </form>
          <form action={backfillMissingResourceImagesAction}>
            <input type="hidden" name="returnPath" value={currentPath} />
            <input type="hidden" name="limit" value="10" />
            <Button type="submit" disabled={!diagnostics.imageGenerationAvailable}>
              Generate Missing Resource Images
            </Button>
          </form>
          <p className="max-w-2xl text-sm text-muted">
            The image generator skips resources with manual cover images or existing media images. If provider or Cloudinary config is missing, use prompts first and generate covers after setup.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Filter size={16} />
            Search & Filters
          </CardTitle>
          <CardDescription>
            Filter by publishing, approval, image, tier, category, and type to stay on top of the workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="space-y-2 lg:col-span-2">
                <label htmlFor="q" className="text-sm text-muted">
                  Search
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                  <input
                    id="q"
                    name="q"
                    defaultValue={query}
                    className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 pl-9 pr-3 text-sm outline-none transition-colors focus:border-gold/35"
                    placeholder="Title, slug, excerpt..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm text-muted">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={status}
                  className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-gold/35"
                >
                  <option value="">Any status</option>
                  {Object.values(ResourceStatus).map((option) => (
                    <option key={option} value={option}>
                      {formatStatusLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="approvalStatus" className="text-sm text-muted">
                  Approval
                </label>
                <select
                  id="approvalStatus"
                  name="approvalStatus"
                  defaultValue={approvalStatus}
                  className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-gold/35"
                >
                  <option value="">Any approval</option>
                  {Object.values(ResourceApprovalStatus).map((option) => (
                    <option key={option} value={option}>
                      {formatStatusLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="imageStatus" className="text-sm text-muted">
                  Image
                </label>
                <select
                  id="imageStatus"
                  name="imageStatus"
                  defaultValue={imageStatus}
                  className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-gold/35"
                >
                  <option value="">Any image state</option>
                  {Object.values(ResourceImageStatus).map((option) => (
                    <option key={option} value={option}>
                      {formatStatusLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="tier" className="text-sm text-muted">
                  Tier
                </label>
                <select
                  id="tier"
                  name="tier"
                  defaultValue={tier}
                  className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-gold/35"
                >
                  <option value="">Any tier</option>
                  {RESOURCE_TIER_ORDER.map((option) => (
                    <option key={option} value={option}>
                      {getResourceTierLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="type" className="text-sm text-muted">
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  defaultValue={type}
                  className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-gold/35"
                >
                  <option value="">Any type</option>
                  {RESOURCE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm text-muted">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  defaultValue={category}
                  className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-gold/35"
                >
                  <option value="">Any category</option>
                  {RESOURCE_CATEGORY_OPTIONS.map((option) => (
                    <option key={`${option.tier}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <Button type="submit">Apply Filters</Button>
                {hasFilters ? (
                  <Link href="/admin/resources">
                    <Button type="button" variant="outline">
                      Clear
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>
            Open a resource to edit the article, adjust the schedule, or publish manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-background/25 text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Tier</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Approval</th>
                  <th className="px-3 py-2 font-medium">Image</th>
                  <th className="px-3 py-2 font-medium">Timing</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.length ? (
                  resources.map((resource) => (
                    <tr key={resource.id} className="border-b border-border/70 align-top transition-colors hover:bg-background/20">
                      <td className="px-3 py-3">
                        <div className="flex min-w-[260px] items-center gap-3">
                          <ResourceCoverImage
                            resource={resource}
                            className="h-14 w-20 shrink-0 rounded-xl border border-silver/12"
                            imageClassName="object-cover"
                          />
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-medium text-foreground">{resource.title}</p>
                            <p className="truncate text-xs text-muted">/{resource.slug}</p>
                            <p className="truncate text-xs text-muted">
                              {formatStatusLabel(resource.generationSource)}
                              {resource.generationBatchId ? ` | Batch ${resource.generationBatchId}` : ""}
                              {resource.generationBatch
                                ? ` | ${formatStatusLabel(resource.generationBatch.status)}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted">{resource.category}</td>
                      <td className="px-3 py-3">
                        <WorkflowBadge value={resource.status} />
                      </td>
                      <td className="px-3 py-3">
                        <ResourceTierBadge tier={resource.tier} />
                      </td>
                      <td className="px-3 py-3 text-muted">{getResourceTypeLabel(resource.type)}</td>
                      <td className="px-3 py-3">
                        <WorkflowBadge value={resource.approvalStatus} />
                      </td>
                      <td className="px-3 py-3">
                        <ImageStateBadge resource={resource} />
                      </td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {resource.scheduledFor ? (
                          <p className="inline-flex items-center gap-1">
                            <CalendarDays size={12} />
                            Scheduled {formatDate(resource.scheduledFor)}
                          </p>
                        ) : resource.publishedAt ? (
                          <p>Published {formatDate(resource.publishedAt)}</p>
                        ) : (
                          <p>Unscheduled</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/resources/${resource.id}`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                          {resource.generationSource !== ResourceGenerationSource.MANUAL ? (
                            <>
                              <QuickActionForm
                                action={approveGeneratedResourceAction}
                                returnPath={currentPath}
                                resourceId={resource.id}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="submit"
                                  disabled={!diagnostics.migrationReady}
                                >
                                  Approve
                                </Button>
                              </QuickActionForm>
                              <QuickActionForm
                                action={rejectGeneratedResourceAction}
                                returnPath={currentPath}
                                resourceId={resource.id}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="submit"
                                  disabled={!diagnostics.migrationReady}
                                >
                                  Reject
                                </Button>
                              </QuickActionForm>
                              <QuickActionForm
                                action={regenerateGeneratedResourceArticleAction}
                                returnPath={currentPath}
                                resourceId={resource.id}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="submit"
                                  disabled={!diagnostics.contentProviderConfigured}
                                >
                                  Article
                                </Button>
                              </QuickActionForm>
                              <QuickActionForm
                                action={regenerateResourceImageAction}
                                returnPath={currentPath}
                                resourceId={resource.id}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="submit"
                                  disabled={!diagnostics.imageGenerationAvailable}
                                >
                                  Image
                                </Button>
                              </QuickActionForm>
                              <QuickActionForm
                                action={toggleGeneratedResourceLockAction}
                                returnPath={currentPath}
                                resourceId={resource.id}
                              >
                                <Button variant="outline" size="sm" type="submit">
                                  {resource.lockedAt ? "Unlock" : "Lock"}
                                </Button>
                              </QuickActionForm>
                            </>
                          ) : null}
                          <form action={setResourceStatusAction}>
                            <input type="hidden" name="resourceId" value={resource.id} />
                            <input type="hidden" name="returnPath" value={currentPath} />
                            <input
                              type="hidden"
                              name="intent"
                              value={resource.status === ResourceStatus.PUBLISHED ? "save_draft" : "publish"}
                            />
                            <Button variant="outline" size="sm" type="submit">
                              {resource.status === ResourceStatus.PUBLISHED ? "Move to Draft" : "Publish"}
                            </Button>
                          </form>
                          <form action={deleteResourceAction}>
                            <input type="hidden" name="resourceId" value={resource.id} />
                            <input type="hidden" name="returnPath" value={currentPath} />
                            <Button variant="danger" size="sm" type="submit">
                              Delete
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-muted">
                      No resources found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            {safePage > 1 ? (
              <Link
                href={buildHref({
                  q: query,
                  status,
                  approvalStatus,
                  imageStatus,
                  tier,
                  category,
                  type,
                  page: safePage - 1
                })}
              >
                <Button variant="outline">Previous Page</Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Previous Page
              </Button>
            )}

            <p className="text-sm text-muted">
              Page {safePage} of {totalPages}
            </p>

            {safePage < totalPages ? (
              <Link
                href={buildHref({
                  q: query,
                  status,
                  approvalStatus,
                  imageStatus,
                  tier,
                  category,
                  type,
                  page: safePage + 1
                })}
              >
                <Button variant="outline">Next Page</Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Next Page
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

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
import {
  getResourceWorkflowDiagnostics,
  type ResourceWorkflowDiagnostics
} from "@/server/resources/resource-workflow-diagnostics.service";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 20;
const ADMIN_RESOURCE_WORKFLOW_MARKER = "Resource Workflow UI v2 active";
const DAILY_GENERATE_BUTTON_LABEL = "Generate Today's 3 Resources";
const TODAYS_BATCH_STATUS_LABEL = "Today's batch status";

type TodayBatchResource = NonNullable<
  Awaited<ReturnType<typeof getDailyResourceBatchForDate>>
>["resources"][number];

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
  generationMetadata: unknown;
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

function DiagnosticStatus({
  label,
  ready
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-silver/14 bg-background/20 px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <Badge variant={ready ? "success" : "danger"} className="normal-case tracking-normal">
        {ready ? "Yes" : "No"}
      </Badge>
    </div>
  );
}

function DiagnosticValue({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-silver/14 bg-background/20 px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="max-w-[58%] truncate text-right text-sm text-silver">{value}</span>
    </div>
  );
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function shortenReason(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 96 ? `${trimmed.slice(0, 96).trim()}...` : trimmed;
}

function imageFailureReason(metadata: unknown) {
  const generation = metadataRecord(metadataRecord(metadata).imageGeneration);
  const message =
    typeof generation.message === "string"
      ? generation.message
      : typeof generation.reason === "string"
        ? generation.reason
        : typeof generation.code === "string"
          ? generation.code
          : "unknown reason";

  return shortenReason(message);
}

function imageStateLabel(resource: {
  coverImage: string | null;
  generatedImageUrl: string | null;
  mediaType: ResourceMediaType;
  mediaUrl: string | null;
  imagePrompt?: string | null;
  imageDirection?: string | null;
  imageStatus: ResourceImageStatus;
  generationMetadata?: unknown;
}) {
  if (
    resource.generatedImageUrl &&
    (!resource.coverImage || resource.coverImage === resource.generatedImageUrl)
  ) {
    return "Generated image attached";
  }

  if (resource.coverImage) {
    return "Manual image";
  }

  if (resource.generatedImageUrl) {
    return "Generated image attached";
  }

  if (resource.mediaType === ResourceMediaType.IMAGE && resource.mediaUrl) {
    return "Linked media image";
  }

  if (resource.imageStatus === ResourceImageStatus.FAILED) {
    return `Image generation failed: ${imageFailureReason(resource.generationMetadata)}`;
  }

  if (resource.imageStatus === ResourceImageStatus.PROMPT_READY || resource.imagePrompt) {
    return "Prompt ready";
  }

  if (!resource.imagePrompt && !resource.imageDirection) {
    return "Prompt missing";
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
    generationMetadata?: unknown;
  };
}) {
  const label = imageStateLabel(resource);
  const variant =
    label === "Generated image attached" ||
    label === "Manual image" ||
    label === "Linked media image"
      ? "success"
      : label.startsWith("Image generation failed") || label === "Prompt missing"
        ? "danger"
        : label === "Prompt ready"
          ? "warning"
          : "outline";

  return (
    <Badge variant={variant} className="max-w-[260px] whitespace-normal normal-case tracking-normal">
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

function DailyTierWorkflowCard({
  tier,
  resource,
  currentPath,
  diagnostics
}: {
  tier: ResourceTier;
  resource?: TodayBatchResource;
  currentPath: string;
  diagnostics: ResourceWorkflowDiagnostics;
}) {
  const tierLabel = getResourceTierLabel(tier);
  const previewResource = resource ?? {
    title: `${tierLabel} daily resource slot`,
    category: "Daily resource",
    type: ResourceType.CLARITY,
    tier,
    coverImage: null,
    generatedImageUrl: null,
    mediaType: ResourceMediaType.NONE,
    mediaUrl: null
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-silver/14 bg-background/22">
      <ResourceCoverImage
        resource={previewResource}
        className="aspect-[16/9] border-b border-silver/12"
        imageClassName="object-cover"
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ResourceTierBadge tier={tier} />
          <Badge variant="outline" className="normal-case tracking-normal text-muted">
            {tierLabel} daily card
          </Badge>
          {resource ? (
            <>
              <WorkflowBadge value={resource.approvalStatus} />
              <ImageStateBadge resource={resource} />
              {resource.lockedAt ? (
                <Badge variant="warning" className="normal-case tracking-normal">
                  <Lock size={11} className="mr-1" />
                  Locked
                </Badge>
              ) : null}
            </>
          ) : (
            <Badge variant="warning" className="normal-case tracking-normal">
              Empty slot
            </Badge>
          )}
        </div>
        <div>
          <p className="line-clamp-2 text-base font-semibold text-foreground">
            {resource?.title ?? `${tierLabel} daily resource not generated yet`}
          </p>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
            {resource?.excerpt ??
              "This card stays visible so the daily workflow is obvious even before a batch exists."}
          </p>
        </div>
        <div className="grid gap-2 text-xs text-muted">
          <p>
            {resource
              ? `${resource.category} | ${getResourceTypeLabel(resource.type)}`
              : `${tierLabel} | awaiting generation`}
          </p>
          <p>
            {resource?.scheduledFor
              ? `Scheduled ${formatDate(resource.scheduledFor)}`
              : resource?.publishedAt
                ? `Published ${formatDate(resource.publishedAt)}`
                : "Not scheduled"}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          {resource ? (
            <Link href={`/admin/resources/${resource.id}`}>
              <Button variant="outline" size="sm">
                Preview/Edit
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Preview/Edit
            </Button>
          )}
          {resource ? (
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
          ) : (
            <Button type="button" variant="outline" size="sm" disabled>
              Approve
            </Button>
          )}
          {resource ? (
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
          ) : (
            <Button type="button" variant="outline" size="sm" disabled>
              <XCircle size={13} className="mr-1" />
              Reject
            </Button>
          )}
          {resource ? (
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
          ) : (
            <Button type="button" variant="outline" size="sm" disabled>
              <RefreshCw size={13} className="mr-1" />
              Article
            </Button>
          )}
          {resource ? (
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
          ) : (
            <Button type="button" variant="outline" size="sm" disabled>
              <ImageIcon size={13} className="mr-1" />
              Image
            </Button>
          )}
          {resource ? (
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
          ) : (
            <Button type="button" variant="outline" size="sm" disabled>
              <Lock size={13} className="mr-1" />
              Lock
            </Button>
          )}
        </div>
      </div>
    </div>
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
          generationMetadata: true,
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
        generationMetadata: null,
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
  const backfillSummary = firstValue(params.backfillSummary);
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error),
    backfillSummary
  });

  return (
    <div className="space-y-6">
      <Card className="border-emerald-500/35 bg-emerald-500/10">
        <CardContent className="py-3">
          <p className="text-sm font-medium text-emerald-100">
            {ADMIN_RESOURCE_WORKFLOW_MARKER}
          </p>
        </CardContent>
      </Card>

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
                  {DAILY_GENERATE_BUTTON_LABEL}
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

      <Card className="border-silver/16 bg-card/62">
        <CardHeader>
          <CardTitle className="text-xl">Resource workflow diagnostics</CardTitle>
          <CardDescription>
            Server-side/admin diagnostics for the visible Resource CMS workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DiagnosticStatus label="migration check status" ready={diagnostics.migrationReady} />
            <DiagnosticStatus
              label="OpenAI/provider configured"
              ready={diagnostics.contentProviderConfigured}
            />
            <DiagnosticStatus
              label="OPENAI_API_KEY present"
              ready={diagnostics.openAiApiKeyPresent}
            />
            <DiagnosticStatus
              label="OPENAI_API_KEY starts with sk"
              ready={diagnostics.openAiApiKeyStartsWithSk}
            />
            <DiagnosticStatus label="Cloudinary configured" ready={diagnostics.cloudinaryConfigured} />
            <DiagnosticStatus
              label="daily generation service available"
              ready={diagnostics.dailyGenerationAvailable}
            />
            <DiagnosticStatus
              label="image provider configured"
              ready={diagnostics.imageProviderConfigured}
            />
            <DiagnosticStatus
              label="image generation service available"
              ready={diagnostics.imageGenerationAvailable}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DiagnosticValue
              label="provider"
              value={
                diagnostics.resourceGenerationProviderPresent
                  ? diagnostics.resourceGenerationProvider
                  : "missing"
              }
            />
            <DiagnosticValue label="content model" value={diagnostics.resourceContentModel} />
            <DiagnosticValue label="image model" value={diagnostics.resourceImageModel} />
            <DiagnosticValue
              label="fallback image model"
              value={diagnostics.resourceImageFallbackModel || "not configured"}
            />
            <DiagnosticValue label="image size" value={diagnostics.resourceImageSize} />
            <DiagnosticValue label="image quality" value={diagnostics.resourceImageQuality} />
            <DiagnosticValue label="image endpoint" value={diagnostics.resourceImageEndpoint} />
            <DiagnosticValue label="image method" value={diagnostics.resourceImageMethod} />
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/20 p-4 text-xs text-muted">
            <p>Missing tables: {diagnostics.missingTables.join(", ") || "none"}</p>
            <p>
              Missing resource columns:{" "}
              {diagnostics.missingResourceColumns.join(", ") || "none"}
            </p>
            <p>
              Content provider unavailable reasons:{" "}
              {diagnostics.contentProviderUnavailableReasons.join("; ") || "none"}
            </p>
            <p>
              Image generation unavailable reasons:{" "}
              {diagnostics.imageGenerationUnavailableReasons.join("; ") || "none"}
            </p>
            <p>
              Last image provider error:{" "}
              {diagnostics.lastImageProviderError
                ? `${diagnostics.lastImageProviderError.resourceTitle}: ${
                    diagnostics.lastImageProviderError.message ||
                    diagnostics.lastImageProviderError.code ||
                    "unknown error"
                  }`
                : "none"}
            </p>
          </div>
        </CardContent>
      </Card>

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
                AI provider not configured:{" "}
                {diagnostics.contentProviderUnavailableReasons.join("; ") ||
                  "OPENAI_API_KEY / provider env vars are not ready"}.
              </p>
            ) : null}
            {!diagnostics.imageProviderConfigured ? (
              <p>
                Image provider is not configured:{" "}
                {diagnostics.imageProviderUnavailableReasons.join("; ") ||
                  "image provider env vars are not ready"}. Image prompts can still be saved.
              </p>
            ) : null}
            {!diagnostics.cloudinaryConfigured ? (
              <p>
                Cloudinary is not configured:{" "}
                {diagnostics.cloudinaryUnavailableReasons.join("; ") ||
                  "Cloudinary env vars are not ready"}. Generated images cannot be attached to resources yet.
              </p>
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
              <form action={generateDailyResourceBatchAction}>
                <input type="hidden" name="returnPath" value={currentPath} />
                <Button type="submit" disabled={!diagnostics.dailyGenerationAvailable}>
                  <Sparkles size={14} className="mr-1" />
                  {DAILY_GENERATE_BUTTON_LABEL}
                </Button>
              </form>
              <QuickActionForm
                action={approveDailyResourceBatchAction}
                returnPath={currentPath}
                batchId={todayBatch?.id}
              >
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!todayBatch || !diagnostics.migrationReady}
                >
                  <CheckCircle2 size={14} className="mr-1" />
                  Approve All
                </Button>
              </QuickActionForm>
              <QuickActionForm
                action={approveAndScheduleDailyResourceBatchAction}
                returnPath={currentPath}
                batchId={todayBatch?.id}
              >
                <Button
                  type="submit"
                  disabled={!todayBatch || !diagnostics.migrationReady}
                >
                  <Clock size={14} className="mr-1" />
                  Approve & Schedule All
                </Button>
              </QuickActionForm>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-silver/14 bg-background/20 p-4">
            <p className="text-sm font-medium text-foreground">
              {TODAYS_BATCH_STATUS_LABEL}:{" "}
              {todayBatch ? formatStatusLabel(todayBatch.status) : "No batch generated"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {todayBatch
                ? `${todayBatch.resources.length}/3 daily resources found for this batch.`
                : "No daily resource set generated for today yet. The Foundation, Inner Circle, and Core cards remain visible as empty slots."}
            </p>
            {!diagnostics.dailyGenerationAvailable ? (
              <p className="mt-2 text-sm text-amber-100/90">
                Daily generation unavailable:{" "}
                {diagnostics.contentProviderUnavailableReasons.join("; ") ||
                  "database migration or provider config is not ready"}.
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {RESOURCE_TIER_ORDER.map((resourceTier) => (
              <DailyTierWorkflowCard
                key={resourceTier}
                tier={resourceTier}
                resource={todayBatch?.resources.find((resource) => resource.tier === resourceTier)}
                currentPath={currentPath}
                diagnostics={diagnostics}
              />
            ))}
          </div>
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
        <CardContent className="space-y-4">
          {backfillSummary ? (
            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4">
              <p className="text-sm font-medium text-emerald-100">Backfill results</p>
              <p className="mt-2 text-sm text-emerald-100/85">{backfillSummary}</p>
            </div>
          ) : null}

          <form action={backfillMissingResourceImagesAction} className="space-y-4">
            <input type="hidden" name="returnPath" value={currentPath} />
            <input type="hidden" name="publishedOnly" value="true" />
            <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <div className="space-y-2">
                <label htmlFor="imageBackfillLimit" className="text-sm text-muted">
                  Backfill limit
                </label>
                <input
                  id="imageBackfillLimit"
                  name="limit"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={10}
                  className="flex h-11 w-full rounded-xl border border-border/80 bg-background/25 px-3 text-sm outline-none transition-colors focus:border-gold/35"
                />
              </div>
              <div className="rounded-2xl border border-silver/14 bg-background/20 p-4 text-sm text-muted">
                <p>Scope: published resources missing visible imagery.</p>
                <p>Manual Cover Image URL values are never overwritten by default.</p>
                <p>Generated images upload to Cloudinary when the provider and Cloudinary are configured.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                name="backfillIntent"
                value="dry_run"
                variant="outline"
                disabled={!diagnostics.migrationReady}
              >
                Dry Run Backfill
              </Button>
              <Button
                type="submit"
                name="backfillIntent"
                value="prompts_only"
                variant="outline"
                disabled={!diagnostics.migrationReady}
              >
                Prepare Missing Prompts
              </Button>
              <Button
                type="submit"
                name="backfillIntent"
                value="generate_images"
                disabled={!diagnostics.imageGenerationAvailable}
              >
                Generate Missing Resource Images
              </Button>
            </div>
          </form>
          <p className="max-w-2xl text-sm text-muted">
            The image generator skips resources with manual cover images, generated images, or existing linked media images. If provider or Cloudinary config is missing, use prompts first and generate covers after setup.
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

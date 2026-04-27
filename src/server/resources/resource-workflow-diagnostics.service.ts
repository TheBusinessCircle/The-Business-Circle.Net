import { getCloudinaryConfigDiagnostics } from "@/lib/media/cloudinary";
import {
  RESOURCE_CONTENT_MODEL,
  RESOURCE_IMAGE_FALLBACK_MODEL,
  RESOURCE_IMAGE_MODEL,
  RESOURCE_IMAGE_QUALITY,
  RESOURCE_IMAGE_SIZE
} from "@/config/resources";
import {
  getResourceAiProviderDiagnostics,
  isResourceContentProviderConfigured,
  isResourceImageProviderConfigured
} from "@/server/resources/resource-ai-provider.service";
import { db } from "@/lib/db";

const REQUIRED_RESOURCE_COLUMNS = [
  "approvalStatus",
  "generationSource",
  "generationBatchId",
  "generationDate",
  "imageDirection",
  "imagePrompt",
  "imageStatus",
  "generatedImageUrl",
  "generationMetadata",
  "approvedAt",
  "approvedById",
  "rejectedAt",
  "rejectedById",
  "lockedAt",
  "lockedById"
];

type ColumnRow = {
  column_name: string;
};

type TableRow = {
  table_name: string;
};

function metadataRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export type ResourceWorkflowDiagnostics = {
  migrationReady: boolean;
  missingTables: string[];
  missingResourceColumns: string[];
  contentProviderConfigured: boolean;
  imageProviderConfigured: boolean;
  resourceGenerationProvider: string;
  resourceGenerationProviderPresent: boolean;
  openAiApiKeyPresent: boolean;
  openAiApiKeyStartsWithSk: boolean;
  resourceContentModel: string;
  resourceImageModel: string;
  resourceImageFallbackModel: string;
  resourceImageSize: string;
  resourceImageQuality: string;
  resourceImageEndpoint: string;
  resourceImageMethod: string;
  lastImageProviderError: {
    resourceTitle: string;
    resourceId: string;
    status: string | null;
    code: string | null;
    message: string | null;
    failedAt: string | null;
    model: string | null;
    endpoint: string | null;
    method: string | null;
  } | null;
  imageProviderUnavailableReasons: string[];
  contentProviderUnavailableReasons: string[];
  imageGenerationUnavailableReasons: string[];
  cloudinaryConfigured: boolean;
  cloudinaryUnavailableReasons: string[];
  dailyGenerationAvailable: boolean;
  imageGenerationAvailable: boolean;
};

export async function getResourceWorkflowDiagnostics(): Promise<ResourceWorkflowDiagnostics> {
  const [tableRows, columnRows] = await Promise.all([
    db.$queryRaw<TableRow[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('DailyResourceBatch', 'Resource')
    `,
    db.$queryRaw<ColumnRow[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Resource'
    `
  ]);
  const tables = new Set(tableRows.map((row) => row.table_name));
  const columns = new Set(columnRows.map((row) => row.column_name));
  const missingTables = ["Resource", "DailyResourceBatch"].filter((table) => !tables.has(table));
  const missingResourceColumns = REQUIRED_RESOURCE_COLUMNS.filter(
    (column) => !columns.has(column)
  );
  const migrationReady = missingTables.length === 0 && missingResourceColumns.length === 0;
  const aiDiagnostics = getResourceAiProviderDiagnostics();
  const cloudinaryDiagnostics = getCloudinaryConfigDiagnostics();
  const contentProviderConfigured = isResourceContentProviderConfigured();
  const imageProviderConfigured = isResourceImageProviderConfigured();
  const cloudinaryConfigured = cloudinaryDiagnostics.configured;
  const imageGenerationUnavailableReasons = [
    ...(!migrationReady ? ["database migration missing"] : []),
    ...aiDiagnostics.imageProviderUnavailableReasons,
    ...cloudinaryDiagnostics.unavailableReasons
  ];

  const latestFailedImage =
    migrationReady
      ? await db.resource.findFirst({
          where: {
            imageStatus: "FAILED"
          },
          orderBy: {
            updatedAt: "desc"
          },
          select: {
            id: true,
            title: true,
            generationMetadata: true
          }
        })
      : null;
  const latestImageGeneration = metadataRecord(
    metadataRecord(latestFailedImage?.generationMetadata).imageGeneration
  );

  return {
    migrationReady,
    missingTables,
    missingResourceColumns,
    contentProviderConfigured,
    imageProviderConfigured,
    resourceGenerationProvider: aiDiagnostics.resourceGenerationProvider,
    resourceGenerationProviderPresent: aiDiagnostics.resourceGenerationProviderPresent,
    openAiApiKeyPresent: aiDiagnostics.openAiApiKeyPresent,
    openAiApiKeyStartsWithSk: aiDiagnostics.openAiApiKeyStartsWithSk,
    resourceContentModel: RESOURCE_CONTENT_MODEL,
    resourceImageModel: RESOURCE_IMAGE_MODEL,
    resourceImageFallbackModel: RESOURCE_IMAGE_FALLBACK_MODEL,
    resourceImageSize: RESOURCE_IMAGE_SIZE,
    resourceImageQuality: RESOURCE_IMAGE_QUALITY || "default",
    resourceImageEndpoint: aiDiagnostics.imageEndpoint,
    resourceImageMethod: aiDiagnostics.imageMethod,
    lastImageProviderError: latestFailedImage
      ? {
          resourceTitle: latestFailedImage.title,
          resourceId: latestFailedImage.id,
          status:
            typeof latestImageGeneration.status === "string"
              ? latestImageGeneration.status
              : null,
          code:
            typeof latestImageGeneration.code === "string"
              ? latestImageGeneration.code
              : null,
          message:
            typeof latestImageGeneration.message === "string"
              ? latestImageGeneration.message
              : typeof latestImageGeneration.reason === "string"
                ? latestImageGeneration.reason
                : null,
          failedAt:
            typeof latestImageGeneration.failedAt === "string"
              ? latestImageGeneration.failedAt
              : null,
          model:
            typeof latestImageGeneration.model === "string"
              ? latestImageGeneration.model
              : null,
          endpoint:
            typeof latestImageGeneration.endpoint === "string"
              ? latestImageGeneration.endpoint
              : null,
          method:
            typeof latestImageGeneration.method === "string"
              ? latestImageGeneration.method
              : null
        }
      : null,
    imageProviderUnavailableReasons: aiDiagnostics.imageProviderUnavailableReasons,
    contentProviderUnavailableReasons: aiDiagnostics.contentProviderUnavailableReasons,
    imageGenerationUnavailableReasons,
    cloudinaryConfigured,
    cloudinaryUnavailableReasons: cloudinaryDiagnostics.unavailableReasons,
    dailyGenerationAvailable: migrationReady && contentProviderConfigured,
    imageGenerationAvailable: migrationReady && imageProviderConfigured && cloudinaryConfigured
  };
}

import { isCloudinaryConfigured } from "@/lib/media/cloudinary";
import {
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

export type ResourceWorkflowDiagnostics = {
  migrationReady: boolean;
  missingTables: string[];
  missingResourceColumns: string[];
  contentProviderConfigured: boolean;
  imageProviderConfigured: boolean;
  cloudinaryConfigured: boolean;
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
  const contentProviderConfigured = isResourceContentProviderConfigured();
  const imageProviderConfigured = isResourceImageProviderConfigured();
  const cloudinaryConfigured = isCloudinaryConfigured();

  return {
    migrationReady,
    missingTables,
    missingResourceColumns,
    contentProviderConfigured,
    imageProviderConfigured,
    cloudinaryConfigured,
    dailyGenerationAvailable: migrationReady && contentProviderConfigured,
    imageGenerationAvailable: migrationReady && imageProviderConfigured && cloudinaryConfigured
  };
}

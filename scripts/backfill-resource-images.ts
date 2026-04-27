import { loadLocalEnv } from "./load-env";

type CliOptions = {
  dryRun: boolean;
  limit?: number;
  publishedOnly: boolean;
  forcePromptsOnly: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    publishedOnly: false,
    forcePromptsOnly: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--published-only") {
      options.publishedOnly = true;
      continue;
    }

    if (arg === "--force-prompts-only") {
      options.forcePromptsOnly = true;
      continue;
    }

    if (arg === "--limit") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--limit requires a number");
      }
      options.limit = Number.parseInt(value, 10);
      index += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = Number.parseInt(arg.slice("--limit=".length), 10);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function main() {
  loadLocalEnv({ printLoadedFiles: true });
  const { getResourceWorkflowDiagnostics } = await import(
    "@/server/resources/resource-workflow-diagnostics.service"
  );
  const diagnostics = await getResourceWorkflowDiagnostics();

  if (!diagnostics.migrationReady) {
    console.log("Resource image backfill");
    console.log("=======================");
    console.log("Database migration is missing, so resource image backfill cannot run yet.");
    console.log(`Missing tables: ${diagnostics.missingTables.join(", ") || "none"}`);
    console.log(
      `Missing Resource columns: ${diagnostics.missingResourceColumns.join(", ") || "none"}`
    );
    return;
  }

  const { backfillResourceImages, formatBackfillSummary } = await import(
    "@/server/resources/resource-image-backfill.service"
  );
  const options = parseArgs(process.argv.slice(2));
  const result = await backfillResourceImages(options);

  console.log("Resource image backfill");
  console.log("=======================");
  console.log(`Dry run: ${result.dryRun ? "yes" : "no"}`);
  console.log(`Limit: ${result.limit}`);
  console.log(`Published only: ${options.publishedOnly ? "yes" : "no"}`);
  console.log(`Prompts only: ${options.forcePromptsOnly ? "yes" : "no"}`);
  console.log(`Provider available: ${result.providerAvailable ? "yes" : "no"}`);
  console.log(`Cloudinary available: ${result.cloudinaryAvailable ? "yes" : "no"}`);
  console.log("");
  console.log(formatBackfillSummary(result));
  console.log("");
  console.log(`Total checked: ${result.totalChecked}`);
  console.log(`Missing images: ${result.missingImages}`);
  console.log(`Prompts created: ${result.promptsCreated}`);
  console.log(`Images generated: ${result.imagesGenerated}`);
  console.log(`Failed: ${result.failed}`);
  console.log(`Skipped manual images: ${result.skippedManualImages}`);
  console.log(`Skipped existing images: ${result.skippedExistingImages}`);
  console.log(`Skipped provider unavailable: ${result.skippedProviderUnavailable}`);
  console.log(`Skipped Cloudinary unavailable: ${result.skippedCloudinaryUnavailable}`);

  if (result.providerUnavailableReasons.length) {
    console.log("");
    console.log("Provider unavailable reasons:");
    result.providerUnavailableReasons.forEach((reason) => {
      console.log(`- ${reason}`);
    });
  }

  if (result.cloudinaryUnavailableReasons.length) {
    console.log("");
    console.log("Cloudinary unavailable reasons:");
    result.cloudinaryUnavailableReasons.forEach((reason) => {
      console.log(`- ${reason}`);
    });
  }

  if (Object.keys(result.providerSkipReasons).length) {
    console.log("");
    console.log("Provider skipped:");
    Object.entries(result.providerSkipReasons).forEach(([reason, count]) => {
      console.log(`- ${count} skipped because ${reason}`);
    });
  }

  if (Object.keys(result.cloudinarySkipReasons).length) {
    console.log("");
    console.log("Cloudinary skipped:");
    Object.entries(result.cloudinarySkipReasons).forEach(([reason, count]) => {
      console.log(`- ${count} skipped because ${reason}`);
    });
  }

  if (Object.keys(result.failureReasons).length) {
    console.log("");
    console.log("Failures:");
    Object.entries(result.failureReasons).forEach(([reason, count]) => {
      console.log(`- ${count} failed because ${reason}`);
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const { db } = await import("@/lib/db");
      await db.$disconnect();
    } catch {
      // The DB may not have initialised if argument or environment validation failed.
    }
  });

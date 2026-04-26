import { loadLocalEnv } from "./load-env";

type CliOptions = {
  dryRun: boolean;
  force: boolean;
  date?: Date;
  generateImages: boolean;
};

function parseDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("--date must use YYYY-MM-DD");
  }

  return new Date(
    Date.UTC(
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10) - 1,
      Number.parseInt(match[3], 10)
    )
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    force: false,
    generateImages: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--no-images" || arg === "--without-images") {
      options.generateImages = false;
      continue;
    }

    if (arg === "--no-schedule" || arg === "--without-scheduling" || arg === "--no-publish") {
      continue;
    }

    if (arg === "--date") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--date requires a YYYY-MM-DD value");
      }
      options.date = parseDate(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--date=")) {
      options.date = parseDate(arg.slice("--date=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function main() {
  loadLocalEnv();
  const [{ generateDailyResourceBatch }, { formatGenerationDateKey }] = await Promise.all([
    import("@/server/resources/daily-resource-generation.service"),
    import("@/server/resources/resource-generation-guards")
  ]);
  const options = parseArgs(process.argv.slice(2));
  const result = await generateDailyResourceBatch({
    generationDate: options.date,
    force: options.force,
    dryRun: options.dryRun,
    generateImages: options.generateImages
  });

  console.log("Daily resource generation");
  console.log("=========================");
  console.log(`Date: ${formatGenerationDateKey(result.plan.generationDate)}`);
  console.log(`Dry run: ${result.dryRun ? "yes" : "no"}`);
  console.log(`Provider configured: ${result.providerConfigured ? "yes" : "no"}`);
  console.log("");
  console.log("Planned set");
  console.log("-----------");
  result.plan.items.forEach((item) => {
    console.log(
      `${item.tier}: ${item.category} | ${item.type} | fallback=${item.fallbackUsed ? "yes" : "no"}`
    );
    console.log(`  ${item.angle}`);
  });

  if (result.batch) {
    console.log("");
    console.log(`Batch: ${result.batch.id} (${result.batch.status})`);
    result.resources.forEach((resource) => {
      console.log(`- ${resource.tier}: ${resource.title} /${resource.slug}`);
    });
  }
}

main()
  .catch((error) => {
    if (
      error instanceof Error &&
      error.name === "ResourceGenerationError" &&
      "code" in error
    ) {
      console.error(`${error.code}: ${error.message}`);
      if ("details" in error && error.details) {
        console.error(JSON.stringify(error.details, null, 2));
      }
    } else {
      console.error(error);
    }
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

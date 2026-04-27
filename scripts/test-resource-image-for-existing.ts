import { ResourceImageStatus } from "@prisma/client";
import { loadLocalEnv } from "./load-env";

type CliOptions = {
  id?: string;
  slug?: string;
  dryRun: boolean;
  generate: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    generate: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--generate") {
      options.generate = true;
      continue;
    }

    if (arg === "--id") {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error("--id requires a value");
      }
      options.id = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--id=")) {
      options.id = arg.slice("--id=".length).trim();
      continue;
    }

    if (arg === "--slug") {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error("--slug requires a value");
      }
      options.slug = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--slug=")) {
      options.slug = arg.slice("--slug=".length).trim();
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.id && !options.slug) {
    throw new Error("Pass --slug or --id.");
  }

  if (options.id && options.slug) {
    throw new Error("Pass only one of --slug or --id.");
  }

  if (options.dryRun && options.generate) {
    throw new Error("Pass only one of --dry-run or --generate.");
  }

  if (!options.dryRun && !options.generate) {
    options.dryRun = true;
  }

  return options;
}

async function main() {
  loadLocalEnv({ printLoadedFiles: true });
  const options = parseArgs(process.argv.slice(2));

  const { db } = await import("@/lib/db");
  const {
    buildResourceImageDirection,
    buildResourceImagePrompt
  } = await import("@/server/resources/resource-image-prompt-builder");
  const { generateCoverImageForResource } = await import(
    "@/server/resources/resource-image-generation.service"
  );

  const resource = await db.resource.findFirst({
    where: options.id ? { id: options.id } : { slug: options.slug },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      tier: true,
      category: true,
      type: true,
      imageStatus: true,
      imageDirection: true,
      imagePrompt: true,
      generatedImageUrl: true,
      coverImage: true
    }
  });

  if (!resource) {
    throw new Error("Resource not found.");
  }

  const imageDirection = buildResourceImageDirection({
    title: resource.title,
    excerpt: resource.excerpt,
    content: resource.content,
    tier: resource.tier,
    category: resource.category,
    type: resource.type
  });
  const imagePrompt = buildResourceImagePrompt({
    title: resource.title,
    excerpt: resource.excerpt,
    content: resource.content,
    tier: resource.tier,
    category: resource.category,
    type: resource.type,
    imageDirection
  });

  console.log("Resource image prompt test");
  console.log("==========================");
  console.log(`Resource: ${resource.title}`);
  console.log(`Slug: ${resource.slug}`);
  console.log(`Image status: ${resource.imageStatus}`);
  console.log(`Existing generated image: ${resource.generatedImageUrl ? "yes" : "no"}`);
  console.log(`Existing cover image: ${resource.coverImage ? "yes" : "no"}`);
  console.log("");
  console.log(`Image direction: ${imageDirection}`);
  console.log("");
  console.log(`Image prompt preview: ${imagePrompt.slice(0, 900)}`);

  if (options.dryRun) {
    console.log("");
    console.log("Dry run only. No image was generated or saved.");
    return;
  }

  await db.resource.update({
    where: { id: resource.id },
    data: {
      imageDirection,
      imagePrompt,
      imageStatus: ResourceImageStatus.PROMPT_READY
    }
  });

  const result = await generateCoverImageForResource(resource.id);

  console.log("");
  console.log(`Generation status: ${result.status}`);
  console.log(`Message: ${result.message}`);

  if (result.status === ResourceImageStatus.GENERATED) {
    console.log(`Saved URL: ${result.imageUrl}`);
    return;
  }

  console.log(`Reason: ${"reason" in result ? result.reason : "no reason returned"}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const { db } = await import("@/lib/db");
      await db.$disconnect();
    } catch {
      // The DB may not initialise if argument or environment validation failed.
    }
  });

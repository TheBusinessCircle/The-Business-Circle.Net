import {
  ResourceApprovalStatus,
  ResourceGenerationSource,
  ResourceImageStatus,
  ResourceStatus,
  ResourceTier,
  ResourceType
} from "@prisma/client";
import { loadLocalEnv } from "./load-env";

type CliOptions = {
  image: boolean;
  createTestResource: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options = {
    image: false,
    createTestResource: false
  };

  argv.forEach((arg) => {
    if (arg === "--image") {
      options.image = true;
      return;
    }

    if (arg === "--create-test-resource") {
      options.createTestResource = true;
      return;
    }

    throw new Error(`Unknown argument: ${arg}`);
  });

  return options;
}

const TEST_PROMPT = `Return only valid JSON for a low-cost Resource CMS configuration test.

Create a concise private business-owner resource draft using this exact plan:
- Tier: FOUNDATION
- Category: Getting Started
- Type: CLARITY
- Title theme: Testing whether a resource workflow is ready before using it in production.

Keep the content between 450 and 700 characters. Include the required imageDirection and imagePrompt fields. The image prompt must describe a premium editorial business cover image with no text or logos.

Return this JSON shape:
{
  "title": "string",
  "excerpt": "string",
  "category": "Getting Started",
  "type": "CLARITY",
  "tier": "FOUNDATION",
  "content": "markdown string",
  "imageDirection": "string",
  "imagePrompt": "string",
  "estimatedReadTime": 1
}`;

async function createDraftResource(input: {
  title: string;
  excerpt: string;
  content: string;
  imageDirection: string;
  imagePrompt: string;
  imageUrl?: string;
}) {
  const { db } = await import("@/lib/db");
  const { membershipTierForResourceTier } = await import("@/lib/db/access");
  const { slugify } = await import("@/lib/utils");
  const { getResourceWorkflowDiagnostics } = await import(
    "@/server/resources/resource-workflow-diagnostics.service"
  );
  const diagnostics = await getResourceWorkflowDiagnostics();

  if (!diagnostics.migrationReady) {
    console.log("Test resource not created: Resource workflow migration is not ready.");
    console.log(`Missing tables: ${diagnostics.missingTables.join(", ") || "none"}`);
    console.log(
      `Missing Resource columns: ${diagnostics.missingResourceColumns.join(", ") || "none"}`
    );
    return null;
  }

  const slug = slugify(`resource-ai-config-test-${Date.now()}-${input.title}`).slice(0, 190);

  return db.resource.create({
    data: {
      title: `[AI config test] ${input.title}`.slice(0, 180),
      slug,
      content: input.content,
      excerpt: input.excerpt,
      summary: input.excerpt,
      tier: ResourceTier.FOUNDATION,
      category: "Getting Started",
      type: ResourceType.CLARITY,
      status: ResourceStatus.DRAFT,
      accessTier: membershipTierForResourceTier(ResourceTier.FOUNDATION),
      approvalStatus: ResourceApprovalStatus.GENERATED,
      generationSource: ResourceGenerationSource.ADMIN_AI,
      imageDirection: input.imageDirection,
      imagePrompt: input.imagePrompt,
      imageStatus: input.imageUrl ? ResourceImageStatus.GENERATED : ResourceImageStatus.PROMPT_READY,
      generatedImageUrl: input.imageUrl,
      coverImage: input.imageUrl,
      generationMetadata: {
        testScript: "scripts/test-resource-ai-generation.ts",
        createdAt: new Date().toISOString()
      }
    },
    select: {
      id: true,
      slug: true
    }
  });
}

async function main() {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2));

  const {
    RESOURCE_CONTENT_MODEL,
    RESOURCE_IMAGE_MODEL,
    RESOURCE_IMAGE_QUALITY,
    RESOURCE_IMAGE_SIZE
  } = await import("@/config/resources");
  const { isCloudinaryConfigured, uploadImageBufferToCloudinary } = await import(
    "@/lib/media/cloudinary"
  );
  const { slugify } = await import("@/lib/utils");
  const {
    generateResourceContentFromProvider,
    generateResourceCoverImageFromProvider,
    isResourceContentProviderConfigured,
    isResourceImageProviderConfigured
  } = await import("@/server/resources/resource-ai-provider.service");

  console.log("Resource AI generation smoke test");
  console.log("=================================");
  console.log(`Content model: ${RESOURCE_CONTENT_MODEL}`);
  console.log(`Image model: ${RESOURCE_IMAGE_MODEL}`);
  console.log(`Image size: ${RESOURCE_IMAGE_SIZE}`);
  console.log(`Image quality: ${RESOURCE_IMAGE_QUALITY || "default"}`);
  console.log(`Create test resource: ${options.createTestResource ? "yes" : "no"}`);
  console.log(`Generate image: ${options.image ? "yes" : "no"}`);
  console.log("");

  if (!isResourceContentProviderConfigured()) {
    console.log("SKIPPED: OpenAI/provider is not configured. No API call was made.");
    console.log("Add OPENAI_API_KEY on the server and restart PM2 with --update-env.");
    return;
  }

  console.log("Generating one small draft with the configured content provider...");
  const draft = await generateResourceContentFromProvider(TEST_PROMPT);
  console.log(`Draft title: ${draft.title}`);
  console.log(`Draft excerpt: ${draft.excerpt}`);
  console.log(`Image direction length: ${draft.imageDirection.length}`);
  console.log(`Image prompt length: ${draft.imagePrompt.length}`);

  let uploadedImageUrl: string | undefined;

  if (options.image) {
    if (!isResourceImageProviderConfigured()) {
      console.log("SKIPPED image test: OpenAI image provider is not configured.");
    } else if (!isCloudinaryConfigured()) {
      console.log("SKIPPED image test: Cloudinary is not configured, so no upload was attempted.");
    } else {
      const folder =
        process.env.CLOUDINARY_RESOURCE_FOLDER?.trim() || "business-circle/resources";
      console.log("Generating one test cover image and uploading it to Cloudinary...");
      const generated = await generateResourceCoverImageFromProvider(draft.imagePrompt);

      if (!generated.bytes) {
        throw new Error("Image provider returned no binary image data.");
      }

      uploadedImageUrl = await uploadImageBufferToCloudinary({
        bytes: generated.bytes,
        folder,
        publicIdPrefix: `resource-ai-config-test-${slugify(draft.title)}`
      });
      console.log(`Cloudinary URL: ${uploadedImageUrl}`);
    }
  }

  if (options.createTestResource) {
    const created = await createDraftResource({
      title: draft.title,
      excerpt: draft.excerpt,
      content: draft.content,
      imageDirection: draft.imageDirection,
      imagePrompt: draft.imagePrompt,
      imageUrl: uploadedImageUrl
    });

    if (created) {
      console.log(`Draft test resource created: /admin/resources/${created.id}`);
      console.log(`Member slug, if published later: /dashboard/resources/${created.slug}`);
    }
  } else {
    console.log("No resource was created. Pass --create-test-resource to create a draft test item.");
  }
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
      // The DB may not initialise when the script only checks provider config.
    }
  });

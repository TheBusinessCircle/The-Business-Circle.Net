import { loadLocalEnv } from "./load-env";

type CliOptions = {
  image: boolean;
};

const SMOKE_IMAGE_PROMPT =
  "Premium editorial cover image for a private business-owner resource about testing a workflow before launch. Calm boardroom table, notebook, soft daylight, refined commercial atmosphere, no text, no logos, no watermark.";

function parseArgs(argv: string[]): CliOptions {
  const options = {
    image: false
  };

  argv.forEach((arg) => {
    if (arg === "--image") {
      options.image = true;
      return;
    }

    throw new Error(`Unknown argument: ${arg}`);
  });

  return options;
}

function yesNo(value: boolean) {
  return value ? "yes" : "no";
}

function printReasons(label: string, reasons: string[]) {
  if (!reasons.length) {
    return;
  }

  console.log(label);
  reasons.forEach((reason) => {
    console.log(`- ${reason}`);
  });
}

async function main() {
  loadLocalEnv({ printLoadedFiles: true });
  const options = parseArgs(process.argv.slice(2));

  const { getCloudinaryConfigDiagnostics, uploadImageBufferToCloudinary } = await import(
    "@/lib/media/cloudinary"
  );
  const { slugify } = await import("@/lib/utils");
  const {
    describeResourceProviderError,
    generateResourceCoverImageFromProvider,
    getResourceAiProviderDiagnostics,
    runResourceTextProviderSmokeTest
  } = await import("@/server/resources/resource-ai-provider.service");

  const ai = getResourceAiProviderDiagnostics();
  const cloudinary = getCloudinaryConfigDiagnostics();

  console.log("Resource AI generation smoke test");
  console.log("=================================");
  console.log(`OpenAI/provider configured: ${yesNo(ai.providerConfigured)}`);
  console.log(`Content provider available: ${yesNo(ai.contentProviderAvailable)}`);
  console.log(`Image provider available: ${yesNo(ai.imageProviderAvailable)}`);
  console.log(`Content model: ${ai.contentModel}`);
  console.log(`Image model: ${ai.imageModel}`);
  console.log(`Image size: ${ai.imageSize}`);
  console.log(`Image quality: ${ai.imageQuality}`);
  console.log(`Generate image: ${yesNo(options.image)}`);
  console.log(`Cloudinary configured: ${yesNo(cloudinary.configured)}`);
  console.log("");

  if (!options.image) {
    if (!ai.contentProviderAvailable) {
      console.log("SKIPPED: content provider is not configured. No OpenAI API call was made.");
      printReasons("Provider unavailable reasons:", ai.contentProviderUnavailableReasons);
      return;
    }

    try {
      console.log("Running one small text-only provider call...");
      const result = await runResourceTextProviderSmokeTest();
      console.log(`Text smoke result: ${result.slice(0, 220)}`);
    } catch (error) {
      console.error(
        `FAILED text provider smoke test: ${describeResourceProviderError(
          error,
          "content provider"
        )}`
      );
      process.exitCode = 1;
      return;
    }

    console.log("Image test not requested. Pass --image to generate one test cover image.");
    return;
  }

  if (!ai.imageProviderAvailable) {
    console.log("");
    console.log("SKIPPED image test: image provider is not configured. No image API call was made.");
    printReasons("Image provider unavailable reasons:", ai.imageProviderUnavailableReasons);
    return;
  }

  try {
    console.log("");
    console.log("Generating one test cover image...");
    const generated = await generateResourceCoverImageFromProvider(SMOKE_IMAGE_PROMPT);

    if (!generated.bytes) {
      throw new Error("Image provider returned no binary image data.");
    }

    console.log(`Generated image bytes: ${generated.bytes.length}`);
    console.log(`Generated image MIME type: ${generated.mimeType}`);

    if (!cloudinary.configured) {
      console.log("Cloudinary is not configured, so upload was skipped.");
      printReasons("Cloudinary unavailable reasons:", cloudinary.unavailableReasons);
      return;
    }

    const folder = process.env.CLOUDINARY_RESOURCE_FOLDER?.trim() || "business-circle/resources";
    const uploadedImageUrl = await uploadImageBufferToCloudinary({
      bytes: generated.bytes,
      folder,
      publicIdPrefix: `resource-ai-config-test-${slugify(String(Date.now()))}`
    });

    console.log(`Cloudinary URL: ${uploadedImageUrl}`);
  } catch (error) {
    console.error(
      `FAILED image provider smoke test: ${describeResourceProviderError(
        error,
        "image provider"
      )}`
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

import { loadLocalEnv } from "./load-env";

function yesNo(value: boolean) {
  return value ? "yes" : "no";
}

async function main() {
  loadLocalEnv({ printLoadedFiles: true });

  const { getCloudinaryConfigDiagnostics } = await import("@/lib/media/cloudinary");
  const {
    getResourceAiProviderDiagnostics
  } = await import("@/server/resources/resource-ai-provider.service");

  const ai = getResourceAiProviderDiagnostics();
  const cloudinary = getCloudinaryConfigDiagnostics();

  console.log("Resource AI configuration");
  console.log("=========================");
  console.log(`OpenAI/provider configured: ${yesNo(ai.providerConfigured)}`);
  console.log(`Content provider available: ${yesNo(ai.contentProviderAvailable)}`);
  console.log(`Image provider available: ${yesNo(ai.imageProviderAvailable)}`);
  console.log(
    `RESOURCE_GENERATION_PROVIDER present: ${yesNo(ai.resourceGenerationProviderPresent)}`
  );
  console.log(
    `RESOURCE_GENERATION_PROVIDER: ${
      ai.resourceGenerationProviderPresent ? ai.resourceGenerationProvider : "missing"
    }`
  );
  console.log(`Effective provider default: ${ai.resourceGenerationProvider}`);
  console.log(`OPENAI_API_KEY present: ${yesNo(ai.openAiApiKeyPresent)}`);
  console.log(`OPENAI_API_KEY starts with sk: ${yesNo(ai.openAiApiKeyStartsWithSk)}`);
  console.log(`OPENAI_API_KEY length: ${ai.openAiApiKeyLength}`);
  console.log(`OPENAI_API_KEY preview: ${ai.openAiApiKeyPreview}`);
  console.log(`content model: ${ai.contentModel}`);
  console.log(`image model: ${ai.imageModel}`);
  console.log(`image fallback model: ${ai.imageFallbackModel || "not configured"}`);
  console.log(
    `image fallback model supported by app: ${yesNo(ai.imageFallbackModelSupported)}`
  );
  console.log(`image model supported by app: ${yesNo(ai.imageModelSupported)}`);
  console.log(`image size: ${ai.imageSize}`);
  console.log(`image size supported by app: ${yesNo(ai.imageSizeSupported)}`);
  console.log(`image quality: ${ai.imageQuality}`);
  console.log(`image quality supported by app: ${yesNo(ai.imageQualitySupported)}`);
  console.log(`image endpoint: ${ai.imageEndpoint}`);
  console.log(`image method: ${ai.imageMethod}`);
  console.log(`image generation disabled: ${yesNo(ai.imageGenerationDisabled)}`);
  console.log(`Cloudinary configured: ${yesNo(cloudinary.configured)}`);
  console.log(`CLOUDINARY_CLOUD_NAME present: ${yesNo(cloudinary.cloudNamePresent)}`);
  console.log(`CLOUDINARY_API_KEY present: ${yesNo(cloudinary.apiKeyPresent)}`);
  console.log(`CLOUDINARY_API_SECRET present: ${yesNo(cloudinary.apiSecretPresent)}`);
  console.log("OpenAI SDK required: no (native fetch integration)");

  if (!ai.contentProviderAvailable || !ai.imageProviderAvailable) {
    console.log("");
    console.log("Provider unavailable reasons:");
    [
      ...new Set([
        ...ai.contentProviderUnavailableReasons,
        ...ai.imageProviderUnavailableReasons
      ])
    ].forEach((reason) => {
      console.log(`- ${reason}`);
    });
  }

  if (!cloudinary.configured) {
    console.log("");
    console.log("Cloudinary unavailable reasons:");
    cloudinary.unavailableReasons.forEach((reason) => {
      console.log(`- ${reason}`);
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

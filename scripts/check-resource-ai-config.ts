import { loadLocalEnv } from "./load-env";

function envValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

function yesNo(value: boolean) {
  return value ? "yes" : "no";
}

function maskOpenAiKey(value: string) {
  if (!value) {
    return "missing";
  }

  const prefix = value.startsWith("sk-") ? "sk-" : `${value.slice(0, 2)}-`;
  return `${prefix}...${value.slice(-4)}`;
}

async function main() {
  loadLocalEnv();

  const {
    RESOURCE_CONTENT_MODEL,
    RESOURCE_GENERATION_PROVIDER,
    RESOURCE_IMAGE_MODEL,
    RESOURCE_IMAGE_QUALITY,
    RESOURCE_IMAGE_SIZE
  } = await import("@/config/resources");
  const { isCloudinaryConfigured } = await import("@/lib/media/cloudinary");
  const {
    isResourceContentProviderConfigured,
    isResourceImageProviderConfigured
  } = await import("@/server/resources/resource-ai-provider.service");

  const openAiKey = envValue("OPENAI_API_KEY");
  const providerEnv = envValue("RESOURCE_GENERATION_PROVIDER");
  const cloudinaryConfigured = isCloudinaryConfigured();
  const contentProviderConfigured = isResourceContentProviderConfigured();
  const imageProviderConfigured = isResourceImageProviderConfigured();

  console.log("Resource AI configuration");
  console.log("=========================");
  console.log(`RESOURCE_GENERATION_PROVIDER exists: ${yesNo(Boolean(providerEnv))}`);
  console.log(`Effective provider: ${RESOURCE_GENERATION_PROVIDER}`);
  console.log(
    `OpenAI/provider configured: ${yesNo(contentProviderConfigured && imageProviderConfigured)}`
  );
  console.log(`OpenAI API key: ${maskOpenAiKey(openAiKey)}`);
  console.log(`Cloudinary configured: ${yesNo(cloudinaryConfigured)}`);
  console.log(`content model: ${RESOURCE_CONTENT_MODEL}`);
  console.log(`image model: ${RESOURCE_IMAGE_MODEL}`);
  console.log(`image size: ${RESOURCE_IMAGE_SIZE}`);
  console.log(`image quality: ${RESOURCE_IMAGE_QUALITY || "default"}`);

  if (!contentProviderConfigured || !imageProviderConfigured) {
    console.log("");
    console.log(
      "Provider not configured. Add RESOURCE_GENERATION_PROVIDER and OPENAI_API_KEY on the server, then restart PM2 with --update-env."
    );
  }

  if (!cloudinaryConfigured) {
    console.log("");
    console.log(
      "Cloudinary not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET before image upload tests."
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

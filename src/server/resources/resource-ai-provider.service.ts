import { z } from "zod";
import {
  RESOURCE_CONTENT_MODEL,
  RESOURCE_GENERATION_PROVIDER,
  RESOURCE_IMAGE_FALLBACK_MODEL,
  RESOURCE_IMAGE_MODEL,
  RESOURCE_IMAGE_QUALITY,
  RESOURCE_IMAGE_SIZE
} from "@/config/resources";
import { ResourceGenerationError } from "@/server/resources/resource-generation-guards";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGES_METHOD = "POST /v1/images/generations";
const OPENAI_API_KEY_MIN_LENGTH = 20;
const TRUE_ENV_VALUES = new Set(["1", "true", "yes"]);
const GPT_IMAGE_SIZES = new Set(["auto", "1024x1024", "1536x1024", "1024x1536"]);
const GPT_IMAGE_QUALITIES = new Set(["auto", "low", "medium", "high"]);
const DALLE_2_SIZES = new Set(["256x256", "512x512", "1024x1024"]);
const DALLE_2_QUALITIES = new Set(["standard"]);
const DALLE_3_SIZES = new Set(["1024x1024", "1792x1024", "1024x1792"]);
const DALLE_3_QUALITIES = new Set(["standard", "hd"]);

export type ResourceAiProviderDiagnostics = {
  resourceGenerationProviderPresent: boolean;
  resourceGenerationProvider: string;
  providerIsOpenAi: boolean;
  providerConfigured: boolean;
  openAiApiKeyPresent: boolean;
  openAiApiKeyStartsWithSk: boolean;
  openAiApiKeyLength: number;
  openAiApiKeyPreview: string;
  contentModel: string;
  imageModel: string;
  imageFallbackModel: string;
  imageSize: string;
  imageQuality: string;
  imageEndpoint: string;
  imageMethod: string;
  imageGenerationDisabled: boolean;
  imageModelSupported: boolean;
  imageFallbackModelSupported: boolean;
  imageSizeSupported: boolean;
  imageQualitySupported: boolean;
  contentProviderAvailable: boolean;
  imageProviderAvailable: boolean;
  contentProviderUnavailableReasons: string[];
  imageProviderUnavailableReasons: string[];
};

const generatedContentSchema = z.object({
  title: z.string().trim().min(8).max(180),
  excerpt: z.string().trim().min(24).max(360),
  category: z.string().trim().min(3).max(90),
  type: z.string().trim().min(3).max(40),
  tier: z.string().trim().min(3).max(40),
  content: z.string().trim().min(450),
  imageDirection: z.string().trim().max(700).optional().default(""),
  imagePrompt: z.string().trim().max(1800).optional().default(""),
  estimatedReadTime: z.union([z.number(), z.string()]).optional()
});

export type ProviderGeneratedResourceContent = z.infer<typeof generatedContentSchema>;

export type ProviderGeneratedImage = {
  bytes?: Buffer;
  url?: string;
  mimeType: string;
  metadata: Record<string, unknown>;
};

export type OpenAiProviderFailureDetails = {
  status: number;
  providerErrorCode: string | null;
  providerErrorType: string | null;
  providerErrorMessage: string;
  message: string;
  model: string;
  size?: string;
  quality?: string;
  endpoint: string;
  method: string;
};

function envValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function maskOpenAiApiKeyForDiagnostics(value = envValue("OPENAI_API_KEY")) {
  if (!value) {
    return "missing";
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}...`;
  }

  return `${value.slice(0, 3)}...${value.slice(-4)}`;
}

function redactSecrets(value: string) {
  return value.replace(/sk-[A-Za-z0-9_-]+/g, "sk-...redacted");
}

function getOpenAiErrorPayload(rawMessage: string) {
  try {
    const parsed = JSON.parse(rawMessage) as {
      error?: {
        code?: string | null;
        type?: string | null;
        message?: string | null;
      };
    };
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

async function getOpenAiFailureDetails(
  response: Response,
  context: {
    model: string;
    size?: string;
    quality?: string;
    endpoint: string;
    method: string;
  }
): Promise<OpenAiProviderFailureDetails> {
  const rawMessage = await response.text().catch(() => "");
  const sanitizedMessage = redactSecrets(rawMessage).slice(0, 500);
  const errorPayload = getOpenAiErrorPayload(rawMessage);
  const providerErrorMessage = redactSecrets(errorPayload?.message ?? sanitizedMessage).slice(
    0,
    500
  );

  return {
    status: response.status,
    providerErrorCode: errorPayload?.code ?? null,
    providerErrorType: errorPayload?.type ?? null,
    providerErrorMessage,
    message: sanitizedMessage,
    ...context
  };
}

function isTruthyEnvValue(value: string) {
  return TRUE_ENV_VALUES.has(value.trim().toLowerCase());
}

export function isSupportedResourceImageModel(model = RESOURCE_IMAGE_MODEL) {
  const trimmed = model.trim().toLowerCase();
  return (
    /^gpt-image-[a-z0-9.-]+$/.test(trimmed) ||
    trimmed === "chatgpt-image-latest" ||
    trimmed === "dall-e-2" ||
    trimmed === "dall-e-3"
  );
}

function isDalle2Model(model: string) {
  return model.trim().toLowerCase() === "dall-e-2";
}

function isDalle3Model(model: string) {
  return model.trim().toLowerCase() === "dall-e-3";
}

function allowedImageSizesForModel(model: string) {
  if (isDalle2Model(model)) {
    return DALLE_2_SIZES;
  }

  if (isDalle3Model(model)) {
    return DALLE_3_SIZES;
  }

  return GPT_IMAGE_SIZES;
}

function allowedImageQualitiesForModel(model: string) {
  if (isDalle2Model(model)) {
    return DALLE_2_QUALITIES;
  }

  if (isDalle3Model(model)) {
    return DALLE_3_QUALITIES;
  }

  return GPT_IMAGE_QUALITIES;
}

function isSupportedResourceImageSizeForModel(
  size = RESOURCE_IMAGE_SIZE,
  model = RESOURCE_IMAGE_MODEL
) {
  return allowedImageSizesForModel(model).has(size.trim().toLowerCase());
}

function isSupportedResourceImageQualityForModel(
  quality = RESOURCE_IMAGE_QUALITY,
  model = RESOURCE_IMAGE_MODEL
) {
  const trimmed = quality.trim().toLowerCase();
  return !trimmed || allowedImageQualitiesForModel(model).has(trimmed);
}

function chooseImageSizeForModel(model: string) {
  const requested = RESOURCE_IMAGE_SIZE.trim().toLowerCase() || "auto";
  if (isSupportedResourceImageSizeForModel(requested, model)) {
    return requested;
  }

  if (isDalle2Model(model) || isDalle3Model(model)) {
    return "1024x1024";
  }

  return "1024x1024";
}

function chooseImageQualityForModel(model: string) {
  const requested = RESOURCE_IMAGE_QUALITY.trim().toLowerCase() || "auto";
  if (isSupportedResourceImageQualityForModel(requested, model)) {
    return requested;
  }

  if (isDalle2Model(model)) {
    return "standard";
  }

  if (isDalle3Model(model)) {
    return "standard";
  }

  return "medium";
}

function shouldRetryImageWithFallback(details: Record<string, unknown> | undefined) {
  if (!details) {
    return false;
  }

  const status = typeof details.status === "number" ? details.status : 0;
  const normalized = [
    details.providerErrorCode,
    details.providerErrorType,
    details.providerErrorMessage
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    status === 403 ||
    status === 404 ||
    normalized.includes("unsupported") ||
    normalized.includes("model") ||
    normalized.includes("access")
  );
}

export function getResourceAiProviderDiagnostics(): ResourceAiProviderDiagnostics {
  const providerEnv = envValue("RESOURCE_GENERATION_PROVIDER");
  const normalizedProvider = providerEnv.toLowerCase();
  const openAiApiKey = envValue("OPENAI_API_KEY");
  const openAiApiKeyPresent = Boolean(openAiApiKey);
  const openAiApiKeyStartsWithSk = openAiApiKey.startsWith("sk");
  const openAiApiKeyLength = openAiApiKey.length;
  const baseReasons: string[] = [];

  if (!providerEnv) {
    baseReasons.push("missing RESOURCE_GENERATION_PROVIDER");
  } else if (normalizedProvider !== "openai") {
    baseReasons.push(`RESOURCE_GENERATION_PROVIDER not openai (${providerEnv})`);
  }

  if (!openAiApiKeyPresent) {
    baseReasons.push("missing OPENAI_API_KEY");
  } else {
    if (!openAiApiKeyStartsWithSk) {
      baseReasons.push("invalid-looking OPENAI_API_KEY (does not start with sk)");
    }

    if (openAiApiKeyLength < OPENAI_API_KEY_MIN_LENGTH) {
      baseReasons.push("invalid-looking OPENAI_API_KEY (length is too short)");
    }
  }

  const imageGenerationDisabled = isTruthyEnvValue(envValue("RESOURCE_IMAGE_GENERATION_DISABLED"));
  const imageModelSupported = isSupportedResourceImageModel();
  const imageFallbackModelSupported =
    !RESOURCE_IMAGE_FALLBACK_MODEL.trim() ||
    isSupportedResourceImageModel(RESOURCE_IMAGE_FALLBACK_MODEL);
  const imageSizeSupported = isSupportedResourceImageSizeForModel();
  const imageQualitySupported = isSupportedResourceImageQualityForModel();
  const imageReasons = [...baseReasons];

  if (imageGenerationDisabled) {
    imageReasons.push("image generation disabled");
  }

  if (!RESOURCE_IMAGE_MODEL.trim()) {
    imageReasons.push("missing RESOURCE_IMAGE_MODEL");
  } else if (!imageModelSupported) {
    imageReasons.push(`RESOURCE_IMAGE_MODEL unsupported (${RESOURCE_IMAGE_MODEL})`);
  }

  if (RESOURCE_IMAGE_FALLBACK_MODEL && !imageFallbackModelSupported) {
    imageReasons.push(
      `RESOURCE_IMAGE_FALLBACK_MODEL unsupported (${RESOURCE_IMAGE_FALLBACK_MODEL})`
    );
  }

  if (!imageSizeSupported) {
    imageReasons.push(
      `RESOURCE_IMAGE_SIZE unsupported for ${RESOURCE_IMAGE_MODEL} (${RESOURCE_IMAGE_SIZE})`
    );
  }

  if (!imageQualitySupported) {
    imageReasons.push(
      `RESOURCE_IMAGE_QUALITY unsupported for ${RESOURCE_IMAGE_MODEL} (${RESOURCE_IMAGE_QUALITY})`
    );
  }

  return {
    resourceGenerationProviderPresent: Boolean(providerEnv),
    resourceGenerationProvider: providerEnv || RESOURCE_GENERATION_PROVIDER,
    providerIsOpenAi: normalizedProvider === "openai",
    providerConfigured: baseReasons.length === 0,
    openAiApiKeyPresent,
    openAiApiKeyStartsWithSk,
    openAiApiKeyLength,
    openAiApiKeyPreview: maskOpenAiApiKeyForDiagnostics(openAiApiKey),
    contentModel: RESOURCE_CONTENT_MODEL,
    imageModel: RESOURCE_IMAGE_MODEL,
    imageFallbackModel: RESOURCE_IMAGE_FALLBACK_MODEL,
    imageSize: RESOURCE_IMAGE_SIZE,
    imageQuality: RESOURCE_IMAGE_QUALITY || "default",
    imageEndpoint: OPENAI_IMAGES_URL,
    imageMethod: OPENAI_IMAGES_METHOD,
    imageGenerationDisabled,
    imageModelSupported,
    imageFallbackModelSupported,
    imageSizeSupported,
    imageQualitySupported,
    contentProviderAvailable: baseReasons.length === 0,
    imageProviderAvailable: imageReasons.length === 0,
    contentProviderUnavailableReasons: baseReasons,
    imageProviderUnavailableReasons: imageReasons
  };
}

export function isResourceContentProviderConfigured() {
  return getResourceAiProviderDiagnostics().contentProviderAvailable;
}

export function isResourceImageProviderConfigured() {
  return getResourceAiProviderDiagnostics().imageProviderAvailable;
}

function getOpenAiApiKey() {
  const diagnostics = getResourceAiProviderDiagnostics();
  const apiKey = envValue("OPENAI_API_KEY");

  if (!diagnostics.providerConfigured) {
    throw new ResourceGenerationError(
      "Generation provider not configured.",
      "generation-provider-not-configured",
      {
        provider: diagnostics.resourceGenerationProvider,
        reasons: diagnostics.contentProviderUnavailableReasons
      }
    );
  }

  return apiKey;
}

export function describeResourceProviderError(error: unknown, label = "provider") {
  if (error instanceof ResourceGenerationError) {
    const details =
      typeof error.details === "object" && error.details !== null
        ? (error.details as Record<string, unknown>)
        : {};
    const status = typeof details.status === "number" ? details.status : null;
    const providerCode =
      typeof details.providerErrorCode === "string" ? details.providerErrorCode : null;
    const providerType =
      typeof details.providerErrorType === "string" ? details.providerErrorType : null;
    const providerMessage =
      typeof details.providerErrorMessage === "string"
        ? details.providerErrorMessage
        : typeof details.message === "string"
          ? details.message
          : null;

    if (status) {
      if (label.toLowerCase().includes("image")) {
        return `OpenAI image error ${status}: ${
          providerMessage || providerCode || providerType || "API error"
        }`;
      }

      return `${label} returned ${status}: ${
        providerMessage || providerCode || providerType || "API error"
      }`;
    }

    const reasons = Array.isArray(details.reasons)
      ? details.reasons.filter((reason): reason is string => typeof reason === "string")
      : [];
    if (reasons.length) {
      return reasons.join("; ");
    }

    return error.message;
  }

  return error instanceof Error ? error.message : "Provider call failed.";
}

export function getSafeOpenAiErrorDetails(error: unknown) {
  if (!(error instanceof ResourceGenerationError)) {
    return null;
  }

  const details =
    typeof error.details === "object" && error.details !== null
      ? (error.details as Record<string, unknown>)
      : {};

  return {
    status: details.status ?? null,
    errorCode: details.providerErrorCode ?? null,
    errorType: details.providerErrorType ?? null,
    errorMessage: details.providerErrorMessage ?? details.message ?? null,
    model: details.model ?? null,
    size: details.size ?? null,
    quality: details.quality ?? null,
    endpoint: details.endpoint ?? null,
    method: details.method ?? null
  };
}

function stripJsonFence(value: string) {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseEstimatedReadTime(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.round(value));
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(parsed)) {
      return Math.max(1, parsed);
    }
  }

  return undefined;
}

export async function generateResourceContentFromProvider(prompt: string) {
  const diagnostics = getResourceAiProviderDiagnostics();

  if (!diagnostics.contentProviderAvailable) {
    throw new ResourceGenerationError(
      "Generation provider is not configured.",
      "generation-provider-not-configured",
      {
        provider: diagnostics.resourceGenerationProvider,
        reasons: diagnostics.contentProviderUnavailableReasons
      }
    );
  }

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: RESOURCE_CONTENT_MODEL,
      temperature: 0.72,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a calm, commercially mature UK editorial strategist. Return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new ResourceGenerationError(
      "Generation provider failed while creating resource content.",
      "content-generation-failed",
      await getOpenAiFailureDetails(response, {
        model: RESOURCE_CONTENT_MODEL,
        endpoint: OPENAI_CHAT_COMPLETIONS_URL,
        method: "POST /v1/chat/completions"
      })
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new ResourceGenerationError(
      "Generation provider returned an empty content response.",
      "content-generation-empty"
    );
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(stripJsonFence(content));
  } catch (error) {
    throw new ResourceGenerationError(
      "Generated resource content was not valid JSON.",
      "content-generation-json-invalid",
      { message: error instanceof Error ? error.message : "unknown-error" }
    );
  }

  const parsed = generatedContentSchema.safeParse(rawJson);

  if (!parsed.success) {
    throw new ResourceGenerationError(
      "Generated resource content did not match the expected schema.",
      "content-generation-schema-invalid",
      { issues: parsed.error.issues.slice(0, 8) }
    );
  }

  return {
    ...parsed.data,
    estimatedReadTime: parseEstimatedReadTime(parsed.data.estimatedReadTime)
  };
}

export async function runResourceTextProviderSmokeTest() {
  const diagnostics = getResourceAiProviderDiagnostics();

  if (!diagnostics.contentProviderAvailable) {
    throw new ResourceGenerationError(
      "Generation provider is not configured.",
      "generation-provider-not-configured",
      {
        provider: diagnostics.resourceGenerationProvider,
        reasons: diagnostics.contentProviderUnavailableReasons
      }
    );
  }

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: RESOURCE_CONTENT_MODEL,
      response_format: { type: "json_object" },
      max_completion_tokens: 120,
      messages: [
        {
          role: "system",
          content: "Return only compact valid JSON."
        },
        {
          role: "user",
          content:
            'Return {"ok":true,"purpose":"resource-ai-smoke-test","imagePrompt":"A premium editorial business cover image, no text, no logos."}'
        }
      ]
    })
  });

  if (!response.ok) {
    throw new ResourceGenerationError(
      "Generation provider failed during the smoke test.",
      "content-smoke-test-failed",
      await getOpenAiFailureDetails(response, {
        model: RESOURCE_CONTENT_MODEL,
        endpoint: OPENAI_CHAT_COMPLETIONS_URL,
        method: "POST /v1/chat/completions"
      })
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new ResourceGenerationError(
      "Generation provider returned an empty smoke test response.",
      "content-smoke-test-empty"
    );
  }

  return content;
}

async function fetchImageUrlAsBuffer(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new ResourceGenerationError(
      "Generated image URL could not be fetched.",
      "image-url-fetch-failed",
      { status: response.status }
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function callOpenAiImageGeneration(input: {
  prompt: string;
  model: string;
  isFallback: boolean;
}) {
  const size = chooseImageSizeForModel(input.model);
  const quality = chooseImageQualityForModel(input.model);
  const requestBody = {
    model: input.model,
    prompt: input.prompt,
    n: 1,
    size,
    ...(quality ? { quality } : {})
  };

  const response = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const details = await getOpenAiFailureDetails(response, {
      model: input.model,
      size,
      quality,
      endpoint: OPENAI_IMAGES_URL,
      method: OPENAI_IMAGES_METHOD
    });
    console.error("[resources] OpenAI image generation failed", details);
    throw new ResourceGenerationError(
      "Image generation failed, prompt saved.",
      "image-generation-failed",
      details
    );
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  };
  const item = payload.data?.[0];

  if (!item?.b64_json && !item?.url) {
    const details = {
      model: input.model,
      size,
      quality,
      endpoint: OPENAI_IMAGES_URL,
      method: OPENAI_IMAGES_METHOD
    };
    console.error("[resources] OpenAI image generation returned no image data", details);
    throw new ResourceGenerationError(
      "Image generation returned no usable image.",
      "image-generation-empty",
      details
    );
  }

  return {
    item,
    model: input.model,
    size,
    quality,
    isFallback: input.isFallback
  };
}

export async function generateResourceCoverImageFromProvider(
  prompt: string
): Promise<ProviderGeneratedImage> {
  const diagnostics = getResourceAiProviderDiagnostics();

  if (!diagnostics.imageProviderAvailable) {
    throw new ResourceGenerationError(
      "Image generation provider is not configured.",
      "image-provider-not-configured",
      {
        provider: diagnostics.resourceGenerationProvider,
        reasons: diagnostics.imageProviderUnavailableReasons
      }
    );
  }

  let generated: Awaited<ReturnType<typeof callOpenAiImageGeneration>>;
  try {
    generated = await callOpenAiImageGeneration({
      prompt,
      model: RESOURCE_IMAGE_MODEL,
      isFallback: false
    });
  } catch (error) {
    if (
      RESOURCE_IMAGE_FALLBACK_MODEL &&
      RESOURCE_IMAGE_FALLBACK_MODEL !== RESOURCE_IMAGE_MODEL &&
      error instanceof ResourceGenerationError &&
      shouldRetryImageWithFallback(error.details)
    ) {
      console.warn(
        "[resources] Primary image model failed, retrying fallback model.",
        {
          primaryModel: RESOURCE_IMAGE_MODEL,
          fallbackModel: RESOURCE_IMAGE_FALLBACK_MODEL,
          reason: describeResourceProviderError(error, "image provider")
        }
      );
      generated = await callOpenAiImageGeneration({
        prompt,
        model: RESOURCE_IMAGE_FALLBACK_MODEL,
        isFallback: true
      });
    } else {
      throw error;
    }
  }

  const { item, model, size, quality, isFallback } = generated;

  if (item.b64_json) {
    return {
      bytes: Buffer.from(item.b64_json, "base64"),
      mimeType: "image/png",
      metadata: {
        model,
        imageSize: size,
        imageQuality: quality,
        endpoint: OPENAI_IMAGES_URL,
        method: OPENAI_IMAGES_METHOD,
        fallbackModelUsed: isFallback,
        revisedPrompt: item.revised_prompt ?? null
      }
    };
  }

  const bytes = await fetchImageUrlAsBuffer(item.url as string);

  return {
    bytes,
    url: item.url,
    mimeType: "image/png",
    metadata: {
      model,
      imageSize: size,
      imageQuality: quality,
      endpoint: OPENAI_IMAGES_URL,
      method: OPENAI_IMAGES_METHOD,
      fallbackModelUsed: isFallback,
      revisedPrompt: item.revised_prompt ?? null
    }
  };
}

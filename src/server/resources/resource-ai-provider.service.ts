import { z } from "zod";
import {
  RESOURCE_CONTENT_MODEL,
  RESOURCE_GENERATION_PROVIDER,
  RESOURCE_IMAGE_MODEL,
  RESOURCE_IMAGE_QUALITY,
  RESOURCE_IMAGE_SIZE
} from "@/config/resources";
import { ResourceGenerationError } from "@/server/resources/resource-generation-guards";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_API_KEY_MIN_LENGTH = 20;
const TRUE_ENV_VALUES = new Set(["1", "true", "yes"]);
const SUPPORTED_RESOURCE_IMAGE_SIZES = new Set([
  "auto",
  "256x256",
  "512x512",
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "1024x1792",
  "1792x1024"
]);
const SUPPORTED_RESOURCE_IMAGE_QUALITIES = new Set([
  "auto",
  "low",
  "medium",
  "high",
  "standard",
  "hd"
]);

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
  imageSize: string;
  imageQuality: string;
  imageGenerationDisabled: boolean;
  imageModelSupported: boolean;
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
  imageDirection: z.string().trim().min(40).max(700),
  imagePrompt: z.string().trim().min(80).max(1800),
  estimatedReadTime: z.union([z.number(), z.string()]).optional()
});

export type ProviderGeneratedResourceContent = z.infer<typeof generatedContentSchema>;

export type ProviderGeneratedImage = {
  bytes?: Buffer;
  url?: string;
  mimeType: string;
  metadata: Record<string, unknown>;
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

async function getOpenAiFailureDetails(response: Response) {
  const rawMessage = await response.text().catch(() => "");
  const sanitizedMessage = redactSecrets(rawMessage).slice(0, 500);
  const errorPayload = getOpenAiErrorPayload(rawMessage);

  return {
    status: response.status,
    providerErrorCode: errorPayload?.code ?? null,
    providerErrorType: errorPayload?.type ?? null,
    message: sanitizedMessage
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

function isSupportedResourceImageSize(size = RESOURCE_IMAGE_SIZE) {
  return SUPPORTED_RESOURCE_IMAGE_SIZES.has(size.trim().toLowerCase());
}

function isSupportedResourceImageQuality(quality = RESOURCE_IMAGE_QUALITY) {
  const trimmed = quality.trim().toLowerCase();
  return !trimmed || SUPPORTED_RESOURCE_IMAGE_QUALITIES.has(trimmed);
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
  const imageSizeSupported = isSupportedResourceImageSize();
  const imageQualitySupported = isSupportedResourceImageQuality();
  const imageReasons = [...baseReasons];

  if (imageGenerationDisabled) {
    imageReasons.push("image generation disabled");
  }

  if (!RESOURCE_IMAGE_MODEL.trim()) {
    imageReasons.push("missing RESOURCE_IMAGE_MODEL");
  } else if (!imageModelSupported) {
    imageReasons.push(`RESOURCE_IMAGE_MODEL unsupported (${RESOURCE_IMAGE_MODEL})`);
  }

  if (!imageSizeSupported) {
    imageReasons.push(`RESOURCE_IMAGE_SIZE unsupported (${RESOURCE_IMAGE_SIZE})`);
  }

  if (!imageQualitySupported) {
    imageReasons.push(`RESOURCE_IMAGE_QUALITY unsupported (${RESOURCE_IMAGE_QUALITY})`);
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
    imageSize: RESOURCE_IMAGE_SIZE,
    imageQuality: RESOURCE_IMAGE_QUALITY || "default",
    imageGenerationDisabled,
    imageModelSupported,
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

    if (status) {
      return [
        `${label} returned`,
        String(status),
        providerCode || providerType || "API error"
      ].join(" ");
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
      await getOpenAiFailureDetails(response)
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
      await getOpenAiFailureDetails(response)
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

  const response = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: RESOURCE_IMAGE_MODEL,
      prompt,
      n: 1,
      size: RESOURCE_IMAGE_SIZE,
      ...(RESOURCE_IMAGE_QUALITY ? { quality: RESOURCE_IMAGE_QUALITY } : {})
    })
  });

  if (!response.ok) {
    throw new ResourceGenerationError(
      "Image generation failed, prompt saved.",
      "image-generation-failed",
      await getOpenAiFailureDetails(response)
    );
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  };
  const item = payload.data?.[0];

  if (!item?.b64_json && !item?.url) {
    throw new ResourceGenerationError(
      "Image generation returned no usable image.",
      "image-generation-empty"
    );
  }

  if (item.b64_json) {
    return {
      bytes: Buffer.from(item.b64_json, "base64"),
      mimeType: "image/png",
      metadata: {
        model: RESOURCE_IMAGE_MODEL,
        imageSize: RESOURCE_IMAGE_SIZE,
        imageQuality: RESOURCE_IMAGE_QUALITY,
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
      model: RESOURCE_IMAGE_MODEL,
      imageSize: RESOURCE_IMAGE_SIZE,
      imageQuality: RESOURCE_IMAGE_QUALITY,
      revisedPrompt: item.revised_prompt ?? null
    }
  };
}

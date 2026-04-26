import { z } from "zod";
import {
  RESOURCE_CONTENT_MODEL,
  RESOURCE_GENERATION_PROVIDER,
  RESOURCE_IMAGE_MODEL
} from "@/config/resources";
import { ResourceGenerationError } from "@/server/resources/resource-generation-guards";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

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

export function isResourceContentProviderConfigured() {
  return RESOURCE_GENERATION_PROVIDER === "openai" && Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function isResourceImageProviderConfigured() {
  return RESOURCE_GENERATION_PROVIDER === "openai" && Boolean(process.env.OPENAI_API_KEY?.trim());
}

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new ResourceGenerationError(
      "Generation provider not configured.",
      "generation-provider-not-configured",
      { provider: RESOURCE_GENERATION_PROVIDER }
    );
  }

  return apiKey;
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
  if (RESOURCE_GENERATION_PROVIDER !== "openai") {
    throw new ResourceGenerationError(
      "Generation provider is not supported.",
      "generation-provider-unsupported",
      { provider: RESOURCE_GENERATION_PROVIDER }
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
    const message = await response.text().catch(() => "");
    throw new ResourceGenerationError(
      "Generation provider failed while creating resource content.",
      "content-generation-failed",
      { status: response.status, message: message.slice(0, 500) }
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
  if (RESOURCE_GENERATION_PROVIDER !== "openai") {
    throw new ResourceGenerationError(
      "Image generation provider is not supported.",
      "image-provider-unsupported",
      { provider: RESOURCE_GENERATION_PROVIDER }
    );
  }

  const imageSize =
    process.env.RESOURCE_IMAGE_SIZE?.trim() ||
    (RESOURCE_IMAGE_MODEL.includes("dall-e-3") ? "1792x1024" : "1536x1024");
  const imageQuality = process.env.RESOURCE_IMAGE_QUALITY?.trim();

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
      size: imageSize,
      ...(imageQuality ? { quality: imageQuality } : {})
    })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new ResourceGenerationError(
      "Image generation failed, prompt saved.",
      "image-generation-failed",
      { status: response.status, message: message.slice(0, 500) }
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
        imageSize,
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
      imageSize,
      revisedPrompt: item.revised_prompt ?? null
    }
  };
}

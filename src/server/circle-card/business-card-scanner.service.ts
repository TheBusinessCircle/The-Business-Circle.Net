import "server-only";

import { z } from "zod";
import { RESOURCE_CONTENT_MODEL } from "@/config/resources";
import {
  normalizeCircleCardEmail,
  normalizeCircleCardUrl,
  normalizeWebsiteDomain,
  type CircleCardSocialLinks
} from "@/lib/circle-card/schema";
import { prisma } from "@/lib/prisma";
import {
  getResourceAiProviderDiagnostics,
  maskOpenAiApiKeyForDiagnostics
} from "@/server/resources/resource-ai-provider.service";
import { persistCircleCardImageUpload } from "@/server/circle-card/upload.service";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const BUSINESS_CARD_SCAN_MODEL =
  process.env.BUSINESS_CARD_SCAN_MODEL?.trim() || RESOURCE_CONTENT_MODEL;
const BUSINESS_CARD_OCR_TIMEOUT_MS = Number.parseInt(
  process.env.BUSINESS_CARD_OCR_TIMEOUT_MS || "20000",
  10
);
const INSENSITIVE_QUERY_MODE = "insensitive" as const;

const socialHandlesSchema = z
  .object({
    linkedin: z.string().trim().max(2048).optional().or(z.literal("")),
    instagram: z.string().trim().max(2048).optional().or(z.literal("")),
    x: z.string().trim().max(2048).optional().or(z.literal("")),
    facebook: z.string().trim().max(2048).optional().or(z.literal("")),
    tiktok: z.string().trim().max(2048).optional().or(z.literal("")),
    youtube: z.string().trim().max(2048).optional().or(z.literal(""))
  })
  .partial()
  .default({});

const providerExtractionSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal("")),
  businessName: z.string().trim().max(140).optional().or(z.literal("")),
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(48).optional().or(z.literal("")),
  mobile: z.string().trim().max(48).optional().or(z.literal("")),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  website: z.string().trim().max(2048).optional().or(z.literal("")),
  address: z.string().trim().max(1000).optional().or(z.literal("")),
  socialHandles: socialHandlesSchema.optional().default({}),
  rawText: z.string().trim().max(4000).optional().or(z.literal(""))
});

export type BusinessCardExtractedFields = {
  name: string;
  businessName: string;
  jobTitle: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  websiteDomain: string | null;
  address: string;
  socialHandles: CircleCardSocialLinks;
  rawText: string;
};

export type BusinessCardExtractionMethod =
  | "openai_vision"
  | "tesseract_ocr"
  | "manual_review";

export type BusinessCardCircleCardMatch = {
  id: string;
  slug: string;
  userId: string;
  fullName: string;
  businessName: string | null;
  role: string | null;
  tagline: string | null;
  websiteUrl: string | null;
  email: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  businessLogoUrl: string | null;
};

export type BusinessCardDuplicateContact = {
  id: string;
  fullName: string | null;
  businessName: string | null;
  email: string | null;
  websiteUrl: string | null;
  source: string;
};

export type BusinessCardScanResult = {
  originalCardImageUrl: string;
  fields: BusinessCardExtractedFields;
  extractionMethod: BusinessCardExtractionMethod;
  providerUnavailableReasons: string[];
  matches: BusinessCardCircleCardMatch[];
  duplicateContact: BusinessCardDuplicateContact | null;
};

type ScanImageInput = {
  file: File;
  userId: string;
};

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function emptyFields(rawText = ""): BusinessCardExtractedFields {
  return {
    name: "",
    businessName: "",
    jobTitle: "",
    phone: "",
    mobile: "",
    email: "",
    website: "",
    websiteDomain: null,
    address: "",
    socialHandles: {},
    rawText
  };
}

function clean(value: string | null | undefined, max = 2048) {
  return value?.replace(/\s+/g, " ").trim().slice(0, max) ?? "";
}

function normalizeSocialHandles(value: Partial<Record<keyof CircleCardSocialLinks, string>>) {
  const socialHandles: CircleCardSocialLinks = {};

  for (const key of ["linkedin", "instagram", "x", "facebook", "tiktok", "youtube"] as const) {
    const handle = value[key]?.trim();

    if (handle) {
      socialHandles[key] = handle.slice(0, 2048);
    }
  }

  return socialHandles;
}

function normalizeProviderFields(value: z.infer<typeof providerExtractionSchema>): BusinessCardExtractedFields {
  const website = value.website ? normalizeCircleCardUrl(value.website) : "";
  return {
    name: clean(value.name, 120),
    businessName: clean(value.businessName, 140),
    jobTitle: clean(value.jobTitle, 120),
    phone: clean(value.phone, 48),
    mobile: clean(value.mobile, 48),
    email: normalizeCircleCardEmail(value.email) ?? "",
    website,
    websiteDomain: normalizeWebsiteDomain(website),
    address: clean(value.address, 1000),
    socialHandles: normalizeSocialHandles(value.socialHandles ?? {}),
    rawText: clean(value.rawText, 4000)
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

async function extractWithOpenAiVision(input: { bytes: Buffer; mimeType: string }) {
  const diagnostics = getResourceAiProviderDiagnostics();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!diagnostics.contentProviderAvailable || !apiKey) {
    return {
      fields: null,
      unavailableReasons: diagnostics.contentProviderUnavailableReasons.length
        ? diagnostics.contentProviderUnavailableReasons
        : [`OPENAI_API_KEY unavailable (${maskOpenAiApiKeyForDiagnostics(apiKey)})`]
    };
  }

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: BUSINESS_CARD_SCAN_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract structured contact details from a business card image. Return only compact JSON. If a field is not visible, use an empty string."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Return JSON with keys: name, businessName, jobTitle, phone, mobile, email, website, address, socialHandles, rawText. socialHandles may include linkedin, instagram, x, facebook, tiktok, youtube."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${input.mimeType || "image/jpeg"};base64,${input.bytes.toString("base64")}`,
                detail: "high"
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return {
      fields: null,
      unavailableReasons: [
        `OpenAI vision extraction failed (${response.status})`,
        message.slice(0, 240)
      ].filter(Boolean)
    };
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    return {
      fields: null,
      unavailableReasons: ["OpenAI vision extraction returned no content."]
    };
  }

  const parsed = providerExtractionSchema.safeParse(JSON.parse(stripJsonFence(content)));

  if (!parsed.success) {
    return {
      fields: null,
      unavailableReasons: ["OpenAI vision extraction returned an unexpected schema."]
    };
  }

  return {
    fields: normalizeProviderFields(parsed.data),
    unavailableReasons: []
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(label)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function extractTextWithTesseract(bytes: Buffer) {
  const { recognize } = await import("tesseract.js");
  const result = await withTimeout(
    recognize(bytes, "eng"),
    Number.isFinite(BUSINESS_CARD_OCR_TIMEOUT_MS) ? BUSINESS_CARD_OCR_TIMEOUT_MS : 20000,
    "business-card-ocr-timeout"
  );

  return result.data.text || "";
}

function compactLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 40);
}

function firstEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? "";
}

function firstWebsite(text: string, email: string) {
  const matches =
    text.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s,;)]+)?/gi) ?? [];

  return (
    matches
      .map((match) => match.replace(/[.,;:)]+$/, ""))
      .filter((match) => !email || !match.toLowerCase().includes(email.toLowerCase()))
      .find((match) => normalizeWebsiteDomain(match)) ?? ""
  );
}

function phoneCandidates(text: string) {
  const matches = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? [];
  return Array.from(
    new Set(
      matches
        .map((match) => match.replace(/\s+/g, " ").trim())
        .filter((match) => {
          const digits = match.replace(/\D/g, "");
          return digits.length >= 9 && digits.length <= 16;
        })
    )
  );
}

function isLikelyMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^07\d{9}$/.test(digits) || /^447\d{9}$/.test(digits) || /^7\d{9}$/.test(digits);
}

const TITLE_WORDS =
  /\b(founder|owner|director|manager|consultant|advisor|adviser|partner|ceo|cto|cfo|coo|designer|developer|photographer|engineer|solicitor|accountant|coach|specialist|lead|head|sales|marketing)\b/i;
const COMPANY_WORDS =
  /\b(ltd|limited|llc|plc|inc|group|studio|agency|media|digital|consulting|consultancy|solutions|services|company|co\.|partners|network|clinic|design|creative|marketing|events)\b/i;
const ADDRESS_WORDS =
  /\b(street|st\.|road|rd\.|lane|ln\.|avenue|ave\.|drive|dr\.|house|suite|unit|park|court|floor|building|nottingham|london|manchester|birmingham|derby|leicester)\b/i;
const UK_POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

function lineHasContactNoise(line: string) {
  return (
    /@/.test(line) ||
    /\b(?:https?:\/\/|www\.)/i.test(line) ||
    /\d{4,}/.test(line) ||
    TITLE_WORDS.test(line)
  );
}

function chooseName(lines: string[]) {
  return (
    lines.find((line) => {
      if (lineHasContactNoise(line) || COMPANY_WORDS.test(line)) {
        return false;
      }

      const words = line.split(" ").filter(Boolean);
      return words.length >= 2 && words.length <= 4 && /^[A-Z][A-Za-z'.-]+/.test(words[0]);
    }) ?? ""
  );
}

function chooseBusinessName(lines: string[], name: string) {
  return (
    lines.find((line) => line !== name && COMPANY_WORDS.test(line) && !/@/.test(line)) ??
    lines.find((line) => line !== name && !lineHasContactNoise(line) && line.length <= 80) ??
    ""
  );
}

function chooseJobTitle(lines: string[], name: string, businessName: string) {
  return lines.find((line) => line !== name && line !== businessName && TITLE_WORDS.test(line)) ?? "";
}

function chooseAddress(lines: string[]) {
  const addressLines = lines
    .filter((line) => (UK_POSTCODE.test(line) || ADDRESS_WORDS.test(line)) && !/@/.test(line))
    .slice(0, 4);

  return addressLines.join(", ");
}

function extractSocialHandles(lines: string[]) {
  const socialHandles: CircleCardSocialLinks = {};

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes("linkedin") && !socialHandles.linkedin) {
      socialHandles.linkedin = line;
    }

    if ((lower.includes("instagram") || lower.includes("insta")) && !socialHandles.instagram) {
      socialHandles.instagram = line;
    }

    if ((lower.includes("twitter") || /\bx\b/.test(lower)) && !socialHandles.x) {
      socialHandles.x = line;
    }

    if (lower.includes("facebook") && !socialHandles.facebook) {
      socialHandles.facebook = line;
    }

    if (lower.includes("tiktok") && !socialHandles.tiktok) {
      socialHandles.tiktok = line;
    }

    if (lower.includes("youtube") && !socialHandles.youtube) {
      socialHandles.youtube = line;
    }
  }

  return socialHandles;
}

function extractFieldsFromOcrText(text: string): BusinessCardExtractedFields {
  const fields = emptyFields(clean(text, 4000));
  const lines = compactLines(text);
  const email = firstEmail(text);
  const website = firstWebsite(text, email);
  const phones = phoneCandidates(text);
  const mobile = phones.find(isLikelyMobile) ?? "";
  const phone = phones.find((candidate) => candidate !== mobile) ?? (!mobile ? phones[0] ?? "" : "");
  const name = chooseName(lines);
  const businessName = chooseBusinessName(lines, name);
  const jobTitle = chooseJobTitle(lines, name, businessName);

  return {
    ...fields,
    name,
    businessName,
    jobTitle,
    phone,
    mobile,
    email,
    website: website ? normalizeCircleCardUrl(website) : "",
    websiteDomain: normalizeWebsiteDomain(website),
    address: chooseAddress(lines),
    socialHandles: extractSocialHandles(lines)
  };
}

async function extractWithTesseract(bytes: Buffer) {
  try {
    const text = await extractTextWithTesseract(bytes);
    return extractFieldsFromOcrText(text);
  } catch {
    return emptyFields();
  }
}

export async function findBusinessCardCircleCardMatches(input: {
  userId: string;
  email?: string | null;
  websiteDomain?: string | null;
}): Promise<BusinessCardCircleCardMatch[]> {
  const email = normalizeCircleCardEmail(input.email);
  const websiteDomain = input.websiteDomain?.trim().toLowerCase() || null;

  if (!email && !websiteDomain) {
    return [];
  }

  return prisma.circleCard.findMany({
    where: {
      isPublished: true,
      user: {
        suspended: false
      },
      OR: [
        email
          ? {
              email: {
                equals: email,
                mode: INSENSITIVE_QUERY_MODE
              }
            }
          : null,
        email
          ? {
              user: {
                email: {
                  equals: email,
                  mode: INSENSITIVE_QUERY_MODE
                }
              }
            }
          : null,
        websiteDomain
          ? {
              websiteUrl: {
                contains: websiteDomain,
                mode: INSENSITIVE_QUERY_MODE
              }
            }
          : null
      ].filter(isPresent)
    },
    take: 3,
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      userId: true,
      fullName: true,
      businessName: true,
      role: true,
      tagline: true,
      websiteUrl: true,
      email: true,
      phone: true,
      profileImageUrl: true,
      businessLogoUrl: true
    }
  });
}

export async function findDuplicateBusinessCardWalletContact(input: {
  userId: string;
  email?: string | null;
  websiteDomain?: string | null;
}): Promise<BusinessCardDuplicateContact | null> {
  const email = normalizeCircleCardEmail(input.email);
  const websiteDomain = input.websiteDomain?.trim().toLowerCase() || null;

  if (!email && !websiteDomain) {
    return null;
  }

  return prisma.circleWalletContact.findFirst({
    where: {
      userId: input.userId,
      OR: [
        email
          ? {
              email: {
                equals: email,
                mode: INSENSITIVE_QUERY_MODE
              }
            }
          : null,
        websiteDomain
          ? {
              websiteDomain: {
                equals: websiteDomain,
                mode: INSENSITIVE_QUERY_MODE
              }
            }
          : null,
        email
          ? {
              card: {
                OR: [
                  {
                    email: {
                      equals: email,
                      mode: INSENSITIVE_QUERY_MODE
                    }
                  },
                  {
                    user: {
                      email: {
                        equals: email,
                        mode: INSENSITIVE_QUERY_MODE
                      }
                    }
                  }
                ]
              }
            }
          : null,
        websiteDomain
          ? {
              card: {
                websiteUrl: {
                  contains: websiteDomain,
                  mode: INSENSITIVE_QUERY_MODE
                }
              }
            }
          : null
      ].filter(isPresent)
    },
    orderBy: [{ savedAt: "desc" }],
    select: {
      id: true,
      fullName: true,
      businessName: true,
      email: true,
      websiteUrl: true,
      source: true,
      card: {
        select: {
          fullName: true,
          businessName: true,
          email: true,
          websiteUrl: true
        }
      }
    }
  }).then((contact) =>
    contact
      ? {
          id: contact.id,
          fullName: contact.fullName ?? contact.card?.fullName ?? null,
          businessName: contact.businessName ?? contact.card?.businessName ?? null,
          email: contact.email ?? contact.card?.email ?? null,
          websiteUrl: contact.websiteUrl ?? contact.card?.websiteUrl ?? null,
          source: contact.source
        }
      : null
  );
}

export async function scanBusinessCardImage(input: ScanImageInput): Promise<BusinessCardScanResult> {
  const bytes = Buffer.from(await input.file.arrayBuffer());
  const [originalCardImageUrl, providerExtraction] = await Promise.all([
    persistCircleCardImageUpload({
      file: input.file,
      userId: input.userId,
      kind: "business-card-scan"
    }),
    extractWithOpenAiVision({
      bytes,
      mimeType: input.file.type || "image/jpeg"
    }).catch((error) => ({
      fields: null,
      unavailableReasons: [error instanceof Error ? error.message : "OpenAI vision extraction failed."]
    }))
  ]);

  let fields = providerExtraction.fields;
  let extractionMethod: BusinessCardExtractionMethod = "openai_vision";

  if (!fields) {
    fields = await extractWithTesseract(bytes);
    extractionMethod = fields.rawText ? "tesseract_ocr" : "manual_review";
  }

  const [matches, duplicateContact] = await Promise.all([
    findBusinessCardCircleCardMatches({
      userId: input.userId,
      email: fields.email,
      websiteDomain: fields.websiteDomain
    }),
    findDuplicateBusinessCardWalletContact({
      userId: input.userId,
      email: fields.email,
      websiteDomain: fields.websiteDomain
    })
  ]);

  return {
    originalCardImageUrl,
    fields,
    extractionMethod,
    providerUnavailableReasons: providerExtraction.unavailableReasons,
    matches,
    duplicateContact
  };
}

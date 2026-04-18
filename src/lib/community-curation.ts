import { createHash } from "node:crypto";

const BCN_RELEVANCE_THEMES = [
  {
    slug: "strategy",
    label: "strategy and decision-making",
    keywords: ["strategy", "positioning", "market", "competitive", "pricing", "brand"]
  },
  {
    slug: "growth",
    label: "growth and demand",
    keywords: ["growth", "marketing", "sales", "pipeline", "lead generation", "demand", "customer"]
  },
  {
    slug: "operations",
    label: "operations and delivery",
    keywords: ["operations", "workflow", "system", "process", "delivery", "team", "hiring"]
  },
  {
    slug: "finance",
    label: "commercial and cash decisions",
    keywords: ["finance", "cash", "profit", "revenue", "margin", "cost", "pricing"]
  },
  {
    slug: "automation",
    label: "automation and tooling shifts",
    keywords: ["automation", "ai", "software", "tool", "platform", "productivity", "workflow"]
  },
  {
    slug: "leadership",
    label: "leadership and founder judgement",
    keywords: ["leadership", "founder", "operator", "management", "decision", "culture", "execution"]
  }
] as const;

const BCN_NEGATIVE_KEYWORDS = [
  "celebrity",
  "gossip",
  "football",
  "soccer",
  "transfer",
  "entertainment",
  "horoscope",
  "lottery"
];

const MAX_CURATION_TAKEAWAYS = 3;

export type CommunityCurationSourceItem = {
  sourceId: string;
  title: string;
  summary: string;
  content: string;
  url: string | null;
  publishedAt: string | null;
};

export type CommunityCurationCandidate = {
  externalId: string;
  checksum: string;
  title: string;
  content: string;
  tags: string[];
  relevanceReasons: string[];
  sourceUrl: string | null;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value: string) {
  return normalizeWhitespace(decodeXmlEntities(value.replace(/<[^>]+>/g, " ")));
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}.`;
}

function readObjectValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
}

function normalizeDateValue(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function deriveSourceId(
  item: Pick<CommunityCurationSourceItem, "sourceId" | "url" | "title" | "publishedAt">
) {
  const baseValue = item.sourceId || item.url || `${item.title}:${item.publishedAt ?? "undated"}`;
  return createHash("sha256").update(baseValue).digest("hex");
}

function extractSentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 28);
}

function buildTakeaways(item: CommunityCurationSourceItem) {
  const sentences = extractSentences(`${item.summary} ${item.content}`);
  const unique = Array.from(new Set(sentences));
  const takeaways = unique.slice(0, MAX_CURATION_TAKEAWAYS);

  if (takeaways.length) {
    return takeaways.map((takeaway) => truncateText(takeaway, 220));
  }

  if (item.summary) {
    return [truncateText(item.summary, 220)];
  }

  return [truncateText(item.title, 180)];
}

function matchRelevanceThemes(item: CommunityCurationSourceItem) {
  const haystack = `${item.title} ${item.summary} ${item.content}`.toLowerCase();
  return BCN_RELEVANCE_THEMES.filter((theme) =>
    theme.keywords.some((keyword) => haystack.includes(keyword))
  );
}

function hasNegativeSignal(item: CommunityCurationSourceItem) {
  const haystack = `${item.title} ${item.summary} ${item.content}`.toLowerCase();
  return BCN_NEGATIVE_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function extractXmlBlocks(payload: string, tagName: string) {
  return Array.from(payload.matchAll(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, "gi"))).map(
    (match) => match[1] ?? ""
  );
}

function extractXmlValue(block: string, tagNames: string[]) {
  for (const tagName of tagNames) {
    const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));
    if (match?.[1]) {
      return stripHtml(match[1]);
    }

    const attributeMatch = block.match(new RegExp(`<${tagName}\\b[^>]*href=["']([^"']+)["'][^>]*/?>`, "i"));
    if (attributeMatch?.[1]) {
      return normalizeWhitespace(attributeMatch[1]);
    }
  }

  return "";
}

function parseXmlFeed(payload: string): CommunityCurationSourceItem[] {
  const itemBlocks = extractXmlBlocks(payload, "item");
  const entryBlocks = itemBlocks.length ? [] : extractXmlBlocks(payload, "entry");
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;

  return blocks
    .map((block, index) => {
      const title = extractXmlValue(block, ["title"]);
      const summary = extractXmlValue(block, ["description", "summary", "content:encoded", "content"]);
      const url = extractXmlValue(block, ["link", "id"]);
      const publishedAt = normalizeDateValue(
        extractXmlValue(block, ["pubDate", "published", "updated"])
      );

      if (!title || !summary) {
        return null;
      }

      return {
        sourceId: extractXmlValue(block, ["guid", "id"]) || `${title}:${index}`,
        title,
        summary,
        content: summary,
        url: url || null,
        publishedAt
      };
    })
    .filter((item): item is CommunityCurationSourceItem => Boolean(item));
}

function parseJsonFeed(payload: string): CommunityCurationSourceItem[] {
  const parsed = JSON.parse(payload) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed
      ? ((parsed as Record<string, unknown>).items ??
          (parsed as Record<string, unknown>).entries ??
          (parsed as Record<string, unknown>).articles ??
          (parsed as Record<string, unknown>).results ??
          [])
      : [];

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row, index) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const record = row as Record<string, unknown>;
      const title = normalizeWhitespace(readObjectValue(record, ["title", "headline", "name"]));
      const summary = stripHtml(
        readObjectValue(record, ["summary", "description", "excerpt", "content_text", "content"])
      );
      const content = stripHtml(
        readObjectValue(record, ["content_text", "content", "body", "summary", "description"])
      );
      const url = normalizeWhitespace(readObjectValue(record, ["url", "link", "external_url"])) || null;
      const publishedAt = normalizeDateValue(
        readObjectValue(record, ["publishedAt", "published_at", "date_published", "date", "updatedAt"])
      );

      if (!title || !(summary || content)) {
        return null;
      }

      return {
        sourceId: normalizeWhitespace(readObjectValue(record, ["id", "guid", "externalId"])) || `${title}:${index}`,
        title,
        summary: summary || content,
        content: content || summary,
        url,
        publishedAt
      };
    })
    .filter((item): item is CommunityCurationSourceItem => Boolean(item));
}

export function parseCommunityCurationSource(payload: string) {
  const trimmed = payload.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJsonFeed(trimmed);
  }

  return parseXmlFeed(trimmed);
}

export function buildBcnCuratedCandidate(
  item: CommunityCurationSourceItem,
  sourceName: string
): CommunityCurationCandidate | null {
  const matchedThemes = matchRelevanceThemes(item);
  if (!matchedThemes.length || hasNegativeSignal(item)) {
    return null;
  }

  const takeaways = buildTakeaways(item);
  const relevanceReasons = matchedThemes.map((theme) => theme.label).slice(0, 2);
  const relevanceSummary = `Relevant because it touches ${relevanceReasons.join(" and ")}, which are recurring decision areas for BCN members.`;
  const content = [
    "Why this matters for BCN members:",
    relevanceSummary,
    "",
    "Key takeaways:",
    ...takeaways.map((takeaway) => `- ${takeaway}`),
    "",
    "Source:",
    item.url ? `${sourceName}: ${item.url}` : sourceName
  ].join("\n");
  const externalId = deriveSourceId(item);
  const checksum = createHash("sha256")
    .update([sourceName, externalId, item.title, item.summary, item.url ?? ""].join("|"))
    .digest("hex");

  return {
    externalId,
    checksum,
    title: truncateText(item.title, 140),
    content,
    tags: Array.from(new Set(["bcn-update", "curated", ...matchedThemes.map((theme) => theme.slug)])).slice(0, 5),
    relevanceReasons,
    sourceUrl: item.url
  };
}

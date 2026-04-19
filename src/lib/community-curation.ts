import { createHash } from "node:crypto";

const BCN_RELEVANCE_THEMES = [
  {
    slug: "business",
    label: "business operations and commercial decisions",
    audience: "Founders, operators, and owner-led teams",
    angle: "Useful for discussing what changes inside a real business, not just what happened in the headline.",
    keywords: [
      "business",
      "company",
      "companies",
      "enterprise",
      "operator",
      "operators",
      "owner",
      "owners"
    ]
  },
  {
    slug: "economy",
    label: "economic conditions affecting trading decisions",
    audience: "Business owners watching demand, costs, and market timing",
    angle: "Helpful when members need to translate macro movement into pricing, demand, or cash decisions.",
    keywords: [
      "economy",
      "economic",
      "inflation",
      "interest rate",
      "rates",
      "recession",
      "consumer spending",
      "demand"
    ]
  },
  {
    slug: "growth",
    label: "growth, demand, and customer movement",
    audience: "Members responsible for revenue, positioning, and pipeline",
    angle: "Strong discussion material for what is changing around growth, messaging, and commercial traction.",
    keywords: [
      "growth",
      "revenue",
      "sales",
      "marketing",
      "pipeline",
      "customer",
      "customers",
      "conversion",
      "retention"
    ]
  },
  {
    slug: "operations",
    label: "operations, delivery, and execution",
    audience: "Operators managing systems, teams, and delivery quality",
    angle: "Relevant when members need to decide how to adapt workflows, delivery, or execution standards.",
    keywords: [
      "operations",
      "workflow",
      "supply chain",
      "logistics",
      "delivery",
      "process",
      "system",
      "execution",
      "productivity"
    ]
  },
  {
    slug: "finance",
    label: "finance, margins, and commercial pressure",
    audience: "Members making cash, margin, and investment decisions",
    angle: "Useful for BCN discussion when finance news has a direct operating or decision-making consequence.",
    keywords: [
      "finance",
      "financial",
      "profit",
      "margin",
      "cash",
      "funding",
      "investment",
      "earnings",
      "valuation",
      "debt"
    ]
  },
  {
    slug: "markets",
    label: "market movement with direct business relevance",
    audience: "Members exposed to market sentiment, pricing pressure, or sector movement",
    angle: "Relevant when markets matter because they influence business confidence, spend, pricing, or sector behaviour.",
    keywords: [
      "market",
      "markets",
      "shares",
      "stocks",
      "listed",
      "public company",
      "sector",
      "trade",
      "trading"
    ]
  },
  {
    slug: "regulation",
    label: "regulation and policy with business impact",
    audience: "Business owners affected by compliance, cost, employment, or trading rules",
    angle: "Best used when regulation meaningfully changes risk, compliance, costs, or how members operate.",
    keywords: [
      "regulation",
      "regulatory",
      "compliance",
      "policy",
      "law",
      "laws",
      "antitrust",
      "tax",
      "tariff",
      "employment rule"
    ]
  },
  {
    slug: "technology",
    label: "technology and AI shifts affecting business execution",
    audience: "Members adapting delivery, workflow, or service models around tools and automation",
    angle: "Valuable when technology news changes how businesses market, operate, or compete.",
    keywords: [
      "ai",
      "artificial intelligence",
      "automation",
      "software",
      "saas",
      "platform",
      "tool",
      "productivity",
      "digital transformation"
    ]
  },
  {
    slug: "founders",
    label: "founder, startup, and leadership judgement",
    audience: "Founders and senior decision-makers inside growing businesses",
    angle: "Useful when the story says something about founder behaviour, startup movement, or leadership judgement.",
    keywords: [
      "founder",
      "founders",
      "startup",
      "start-up",
      "venture",
      "leadership",
      "chief executive",
      "ceo",
      "management",
      "hiring"
    ]
  },
  {
    slug: "commerce",
    label: "retail, e-commerce, and customer buying behaviour",
    audience: "Members selling products or services into live markets",
    angle: "Good BCN material when customer behaviour or commerce shifts affect how members sell and fulfil.",
    keywords: [
      "retail",
      "e-commerce",
      "ecommerce",
      "consumer",
      "shopping",
      "store",
      "stores",
      "merchant",
      "merchants"
    ]
  }
] as const;

const BCN_NEGATIVE_KEYWORDS = [
  "celebrity",
  "gossip",
  "royal family",
  "football",
  "soccer",
  "nba",
  "nfl",
  "match report",
  "transfer rumor",
  "entertainment",
  "box office",
  "horoscope",
  "lottery",
  "dating rumor"
] as const;

const BCN_CLICKBAIT_PATTERNS = [
  /you won't believe/i,
  /shocking reason/i,
  /goes viral/i,
  /watch:/i,
  /fans react/i,
  /what happened next/i
] as const;

const TRACKING_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid"
]);

const MAX_CURATION_TAKEAWAYS = 2;
const MIN_DISCUSSION_WORTHY_LENGTH = 90;

export type CommunityCurationSourceItem = {
  sourceId: string;
  title: string;
  summary: string;
  content: string;
  url: string | null;
  sourceName: string | null;
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
  sourceName: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripCdata(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1");
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value: string) {
  return normalizeWhitespace(
    decodeXmlEntities(
      stripCdata(value)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}.`;
}

function coerceText(value: unknown): string {
  if (typeof value === "string") {
    return normalizeWhitespace(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return normalizeWhitespace(value.map((entry) => coerceText(entry)).filter(Boolean).join(" "));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeWhitespace(
      [
        record["#text"],
        record["_text"],
        record.value,
        record.text,
        record.name,
        record.title
      ]
        .map((entry) => coerceText(entry))
        .filter(Boolean)
        .join(" ")
    );
  }

  return "";
}

function readPathValue(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, record);
}

function readObjectValue(record: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = coerceText(readPathValue(record, path));
    if (value) {
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

function canonicalizeUrl(rawValue: string | null | undefined) {
  const value = normalizeWhitespace(rawValue ?? "");
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    url.hash = "";

    for (const param of TRACKING_QUERY_PARAMS) {
      url.searchParams.delete(param);
    }

    const normalized = url.toString().replace(/\/$/, "");
    return normalized || null;
  } catch {
    return value;
  }
}

function normalizeSourceName(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value ?? "");
  return normalized || null;
}

function deriveSourceId(
  item: Pick<CommunityCurationSourceItem, "sourceId" | "url" | "title" | "publishedAt">
) {
  const baseValue =
    normalizeWhitespace(item.sourceId) ||
    canonicalizeUrl(item.url) ||
    `${normalizeWhitespace(item.title).toLowerCase()}:${item.publishedAt ?? "undated"}`;
  return createHash("sha256").update(baseValue).digest("hex");
}

function extractSentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 32);
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

function cleanHeadline(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return "";
  }

  const parts = normalized.split(/\s[|:-]\s/);
  if (parts.length <= 1) {
    return truncateText(normalized, 140);
  }

  const lastPart = parts[parts.length - 1] ?? "";
  if (lastPart.length <= 28) {
    return truncateText(parts.slice(0, -1).join(" - "), 140);
  }

  return truncateText(normalized, 140);
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

function hasClickbaitSignal(item: CommunityCurationSourceItem) {
  const haystack = `${item.title} ${item.summary}`;
  return BCN_CLICKBAIT_PATTERNS.some((pattern) => pattern.test(haystack));
}

function hasDiscussionValue(item: CommunityCurationSourceItem) {
  const haystack = normalizeWhitespace(`${item.summary} ${item.content}`);
  return haystack.length >= MIN_DISCUSSION_WORTHY_LENGTH;
}

function extractXmlBlocks(payload: string, tagName: string) {
  const matcher = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, "gi");
  return Array.from(payload.matchAll(matcher)).map((match) => match[1] ?? "");
}

function extractXmlTagValue(block: string, tagNames: string[]) {
  for (const tagName of tagNames) {
    const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));
    if (match?.[1]) {
      const normalized = stripHtml(match[1]);
      if (normalized) {
        return normalized;
      }
    }
  }

  return "";
}

function extractXmlTagRawValue(block: string, tagNames: string[]) {
  for (const tagName of tagNames) {
    const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

function extractXmlLink(block: string) {
  const attributeLinks = Array.from(
    block.matchAll(/<link\b([^>]*)\/?>/gi)
  );

  for (const match of attributeLinks) {
    const attributes = match[1] ?? "";
    const hrefMatch = attributes.match(/\bhref=["']([^"']+)["']/i);
    if (!hrefMatch?.[1]) {
      continue;
    }

    const relMatch = attributes.match(/\brel=["']([^"']+)["']/i);
    const rel = relMatch?.[1]?.toLowerCase() ?? "";
    if (!rel || rel === "alternate") {
      return canonicalizeUrl(hrefMatch[1]);
    }
  }

  const textLink = extractXmlTagValue(block, ["link", "id"]);
  return canonicalizeUrl(textLink);
}

function buildSourceItem(input: Partial<CommunityCurationSourceItem>) {
  const title = cleanHeadline(input.title ?? "");
  const content = stripHtml(input.content ?? "");
  const summary = stripHtml(input.summary ?? "") || content || title;
  const url = canonicalizeUrl(input.url ?? null);
  const sourceId = normalizeWhitespace(input.sourceId ?? "") || title;

  if (!title || !sourceId) {
    return null;
  }

  return {
    sourceId,
    title,
    summary,
    content: content || summary,
    url,
    sourceName: normalizeSourceName(input.sourceName),
    publishedAt: input.publishedAt ?? null
  } satisfies CommunityCurationSourceItem;
}

function parseXmlFeed(payload: string): CommunityCurationSourceItem[] {
  const itemBlocks = extractXmlBlocks(payload, "item");
  const entryBlocks = itemBlocks.length ? [] : extractXmlBlocks(payload, "entry");
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;
  const feedTitle = extractXmlTagValue(payload, ["title"]);

  return blocks
    .map((block, index) => {
      try {
        const rawContent = extractXmlTagRawValue(block, [
          "content:encoded",
          "content",
          "description",
          "summary"
        ]);
        const item = buildSourceItem({
          sourceId: extractXmlTagValue(block, ["guid", "id"]) || `${feedTitle}:${index}`,
          title: extractXmlTagValue(block, ["title"]),
          summary: extractXmlTagValue(block, ["description", "summary"]) || stripHtml(rawContent),
          content: rawContent,
          url: extractXmlLink(block),
          sourceName: extractXmlTagValue(payload, ["title"]),
          publishedAt: normalizeDateValue(
            extractXmlTagValue(block, [
              "pubDate",
              "published",
              "updated",
              "dc:date",
              "date"
            ])
          )
        });

        return item;
      } catch {
        return null;
      }
    })
    .filter((item): item is CommunityCurationSourceItem => Boolean(item));
}

function resolveJsonRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const directKeys = ["items", "entries", "articles", "results", "posts", "value"];

  for (const key of directKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  const nested = [record.data, record.feed, record.channel];
  for (const value of nested) {
    const rows = resolveJsonRows(value);
    if (rows.length) {
      return rows;
    }
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value) && value.length && value.some((row) => row && typeof row === "object")) {
      return value;
    }
  }

  return [];
}

function parseJsonFeed(payload: string): CommunityCurationSourceItem[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(payload);
  } catch {
    return [];
  }

  const rows = resolveJsonRows(parsed);

  return rows
    .map((row, index) => {
      try {
        if (!row || typeof row !== "object") {
          return null;
        }

        const record = row as Record<string, unknown>;
        return buildSourceItem({
          sourceId: readObjectValue(record, [
            "guid",
            "id",
            "externalId",
            "external_id",
            "uuid"
          ]) || `json-item:${index}`,
          title: readObjectValue(record, ["title", "headline", "name"]),
          summary: readObjectValue(record, [
            "summary",
            "description",
            "excerpt",
            "dek",
            "content_text",
            "content.plain",
            "content"
          ]),
          content: readObjectValue(record, [
            "content_text",
            "content",
            "body",
            "summary",
            "description",
            "content_html"
          ]),
          url:
            canonicalizeUrl(
              readObjectValue(record, [
                "url",
                "link",
                "external_url",
                "canonicalUrl",
                "links.alternate.href",
                "links.self.href"
              ])
            ) ?? null,
          sourceName: readObjectValue(record, [
            "source.name",
            "source.title",
            "source",
            "publisher.name",
            "publisher"
          ]),
          publishedAt: normalizeDateValue(
            readObjectValue(record, [
              "publishedAt",
              "published_at",
              "date_published",
              "datePublished",
              "date",
              "updatedAt",
              "updated_at",
              "createdAt",
              "created_at"
            ])
          )
        });
      } catch {
        return null;
      }
    })
    .filter((item): item is CommunityCurationSourceItem => Boolean(item));
}

export function parseCommunityCurationSource(payload: string) {
  const trimmed = payload.trim();
  if (!trimmed) {
    return [];
  }

  const items =
    trimmed.startsWith("{") || trimmed.startsWith("[")
      ? parseJsonFeed(trimmed)
      : parseXmlFeed(trimmed);

  const seenIds = new Set<string>();
  return items.filter((item) => {
    const stableId = deriveSourceId(item);
    if (seenIds.has(stableId)) {
      return false;
    }

    seenIds.add(stableId);
    return true;
  });
}

export function buildBcnCuratedCandidate(
  item: CommunityCurationSourceItem,
  defaultSourceName: string
): CommunityCurationCandidate | null {
  const matchedThemes = matchRelevanceThemes(item);
  if (!matchedThemes.length || hasNegativeSignal(item) || hasClickbaitSignal(item) || !hasDiscussionValue(item)) {
    return null;
  }

  const takeaways = buildTakeaways(item);
  const primaryThemes = matchedThemes.slice(0, 2);
  const relevanceReasons = primaryThemes.map((theme) => theme.label);
  const primaryAudience = Array.from(new Set(primaryThemes.map((theme) => theme.audience))).join(" and ");
  const bcnAngle = primaryThemes[0]?.angle
    ?? "A useful BCN discussion starts with what this changes for real operators rather than the headline alone.";
  const sourceName = item.sourceName ?? defaultSourceName;
  const whatHappened = truncateText(takeaways[0] ?? item.summary, 260);
  const whyThisMatters = truncateText(
    `This matters because it touches ${relevanceReasons.join(" and ")}, which directly influence commercial decisions inside founder-led businesses.`,
    260
  );
  const whoThisAffects = truncateText(primaryAudience, 180);
  const sourceLine = item.url ? `${sourceName} - ${item.url}` : sourceName;
  const publishedLine = item.publishedAt
    ? `Published: ${new Date(item.publishedAt).toISOString().slice(0, 10)}`
    : null;
  const externalId = deriveSourceId(item);
  const checksum = createHash("sha256")
    .update(
      [
        sourceName,
        externalId,
        item.title,
        item.summary,
        item.content,
        canonicalizeUrl(item.url) ?? ""
      ].join("|")
    )
    .digest("hex");

  return {
    externalId,
    checksum,
    title: cleanHeadline(item.title),
    content: [
      "What happened:",
      whatHappened,
      "",
      "Why this matters:",
      whyThisMatters,
      "",
      "Who this affects:",
      whoThisAffects,
      "",
      "BCN angle:",
      bcnAngle,
      "",
      "Source:",
      sourceLine,
      ...(publishedLine ? ["", publishedLine] : [])
    ].join("\n"),
    tags: Array.from(
      new Set(["bcn-update", "curated", ...matchedThemes.map((theme) => theme.slug)])
    ).slice(0, 6),
    relevanceReasons,
    sourceUrl: canonicalizeUrl(item.url),
    sourceName
  };
}

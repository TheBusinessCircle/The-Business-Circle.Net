import { createHash } from "node:crypto";

const BCN_RELEVANCE_THEMES = [
  {
    slug: "growth",
    label: "growth, demand, and commercial movement",
    audience: "Founders, commercial leads, and owner-led teams",
    angle: "Strong BCN material when the story changes demand, pricing power, conversion, or revenue planning.",
    priority: 5,
    keywords: [
      "growth",
      "revenue",
      "sales",
      "pricing",
      "price rise",
      "price cut",
      "demand",
      "orders",
      "bookings",
      "customer",
      "customers",
      "conversion",
      "retention",
      "margin",
      "margins"
    ]
  },
  {
    slug: "operations",
    label: "operations, delivery, and execution",
    audience: "Operators managing systems, fulfilment, and delivery quality",
    angle: "Useful when members may need to adapt workflow, fulfilment, cost control, or execution standards.",
    priority: 5,
    keywords: [
      "operations",
      "workflow",
      "supply chain",
      "logistics",
      "delivery",
      "process",
      "productivity",
      "manufacturing",
      "factory",
      "shipping",
      "inventory",
      "fulfilment",
      "fulfillment",
      "recall",
      "defect",
      "safety warning",
      "product safety"
    ]
  },
  {
    slug: "ai",
    label: "AI and technology shifts with business consequences",
    audience: "Leaders adapting tooling, team design, and service delivery",
    angle: "Relevant when AI or platform technology changes how businesses operate, compete, or deliver work.",
    priority: 5,
    keywords: [
      "ai",
      "artificial intelligence",
      "automation",
      "software",
      "saas",
      "platform",
      "cloud",
      "semiconductor",
      "chip",
      "chips",
      "productivity",
      "digital transformation"
    ]
  },
  {
    slug: "retail",
    label: "retail and consumer trading movement",
    audience: "Businesses selling into live consumer demand",
    angle: "Good BCN material when retail movement says something useful about customer behaviour, demand, or trading conditions.",
    priority: 4,
    keywords: [
      "retail",
      "shopping",
      "consumer",
      "store",
      "stores",
      "merchant",
      "merchants",
      "high street"
    ]
  },
  {
    slug: "hiring",
    label: "hiring, workforce, and team structure",
    audience: "Founders making team design, hiring, or cost decisions",
    angle: "Best used when the story changes staffing confidence, wage pressure, or how teams are being structured.",
    priority: 4,
    keywords: [
      "hiring",
      "recruitment",
      "staffing",
      "workforce",
      "employment",
      "jobs",
      "wages",
      "layoffs",
      "headcount",
      "talent"
    ]
  },
  {
    slug: "economy",
    label: "economic movement with direct operator consequences",
    audience: "Business owners watching costs, demand, and timing decisions",
    angle: "Useful when macro movement translates into real pricing, demand, or cash-flow implications for operators.",
    priority: 4,
    keywords: [
      "economy",
      "economic",
      "inflation",
      "interest rate",
      "interest rates",
      "rates",
      "recession",
      "gdp",
      "consumer spending",
      "output",
      "earnings",
      "forecast",
      "debt",
      "credit"
    ]
  },
  {
    slug: "leadership",
    label: "leadership, founder judgement, and company direction",
    audience: "Founders and senior decision-makers",
    angle: "Helpful when the story reveals something about leadership choices, company direction, or founder judgement.",
    priority: 4,
    keywords: [
      "leadership",
      "chief executive",
      "ceo",
      "management",
      "founder",
      "founders",
      "board",
      "executive",
      "strategy shift",
      "turnaround"
    ]
  },
  {
    slug: "regulation",
    label: "regulation and policy with business impact",
    audience: "Business owners affected by compliance, cost, employment, or trading rules",
    angle: "Strong BCN discussion material when policy changes create real compliance, cost, or operating implications.",
    priority: 4,
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
      "tariffs",
      "sanctions"
    ]
  },
  {
    slug: "marketing",
    label: "platform, marketing, and distribution shifts",
    audience: "Teams responsible for reach, conversion, and demand generation",
    angle: "Useful when platform or marketing changes affect discoverability, conversion, or customer acquisition.",
    priority: 4,
    keywords: [
      "marketing",
      "advertising",
      "advertiser",
      "algorithm",
      "reach",
      "traffic",
      "acquisition",
      "conversion",
      "search",
      "google",
      "meta",
      "instagram",
      "facebook",
      "tiktok"
    ]
  },
  {
    slug: "e-commerce",
    label: "e-commerce and digital selling",
    audience: "Merchants and operators selling online",
    angle: "Best used when the story affects online trade, marketplaces, checkout flow, or digital retail margins.",
    priority: 4,
    keywords: [
      "e-commerce",
      "ecommerce",
      "marketplace",
      "online retail",
      "online sales",
      "checkout",
      "merchant",
      "merchant fees"
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

const BCN_GENERIC_WORLD_NEWS_KEYWORDS = [
  "election",
  "campaign trail",
  "cabinet reshuffle",
  "military strike",
  "peace talks",
  "royal visit",
  "foreign minister",
  "prime minister",
  "president",
  "diplomatic"
] as const;

const BCN_CLICKBAIT_PATTERNS = [
  /you won't believe/i,
  /shocking reason/i,
  /goes viral/i,
  /watch:/i,
  /fans react/i,
  /what happened next/i
] as const;

const BCN_BUSINESS_IMPACT_SIGNALS = [
  "pricing",
  "cost",
  "costs",
  "demand",
  "jobs",
  "employment",
  "wages",
  "margin",
  "margins",
  "earnings",
  "forecast",
  "exports",
  "imports",
  "tariff",
  "tariffs",
  "manufacturing",
  "factory",
  "shipping",
  "supply",
  "investment",
  "acquisition",
  "merger",
  "buyout",
  "funding",
  "credit",
  "consumer spending",
  "advertising",
  "semiconductor",
  "cloud",
  "reach",
  "traffic",
  "conversion",
  "inventory",
  "fulfilment",
  "fulfillment",
  "recall",
  "defect",
  "safety",
  "fire risk",
  "battery"
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

const MAX_CURATION_TAKEAWAYS = 4;
const MIN_DISCUSSION_WORTHY_LENGTH = 70;
const MIN_SUMMARY_LENGTH_FOR_COMPACT_UPDATES = 48;
const BCN_TITLE_SUFFIX_PATTERN =
  /\s(?:\||-)\s(?:bbc(?:\snews|\sbusiness|\stechnology)?|reuters|ap(?:\snews)?|ft|financial times|cnbc|bloomberg|sky news|business desk|markets desk|commerce desk)$/i;
const BCN_DETAIL_SIGNAL_KEYWORDS = [
  "recall",
  "warning",
  "defect",
  "model",
  "models",
  "product",
  "products",
  "jurisdiction",
  "regulator",
  "regulation",
  "law",
  "tariff",
  "fine",
  "probe",
  "investigation",
  "layoff",
  "layoffs",
  "jobs",
  "hiring",
  "forecast",
  "guidance",
  "market",
  "region",
  "europe",
  "uk",
  "us",
  "china",
  "year",
  "202",
  "$",
  "%",
  "million",
  "billion"
] as const;

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
  dedupeKey: string;
  title: string;
  content: string;
  tags: string[];
  relevanceReasons: string[];
  sourceUrl: string | null;
  sourceName: string;
};

type BcnRelevanceTheme = (typeof BCN_RELEVANCE_THEMES)[number];

type BcnMatchedTheme = BcnRelevanceTheme & {
  matchedKeywords: string[];
  score: number;
};

const ENGLISH_SIGNAL_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "after",
  "into",
  "business",
  "company",
  "companies",
  "market",
  "markets",
  "global",
  "world",
  "growth",
  "hiring",
  "trade",
  "economy",
  "founders",
  "retail",
  "technology"
]);

const NON_ENGLISH_SIGNAL_WORDS = new Set([
  " el ",
  " la ",
  " los ",
  " las ",
  " una ",
  " para ",
  " con ",
  " sobre ",
  " le ",
  " les ",
  " des ",
  " avec ",
  " pour ",
  " und ",
  " der ",
  " die ",
  " das ",
  " mit "
]);

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

function normalizeTitleForDeduplication(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function hasNonLatinScript(value: string) {
  return /[\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u3040-\u30ff\u3400-\u9fff]/.test(
    value
  );
}

function countEnglishSignals(value: string) {
  const tokens = value
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => token.length >= 2);

  return tokens.reduce((count, token) => count + (ENGLISH_SIGNAL_WORDS.has(token) ? 1 : 0), 0);
}

function countNonEnglishSignals(value: string) {
  const haystack = ` ${value.toLowerCase()} `;
  return Array.from(NON_ENGLISH_SIGNAL_WORDS).reduce(
    (count, signal) => count + (haystack.includes(signal) ? 1 : 0),
    0
  );
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

function deriveDeduplicationKey(item: CommunityCurationSourceItem) {
  const canonicalUrl = canonicalizeUrl(item.url);
  if (canonicalUrl) {
    return canonicalUrl;
  }

  const normalizedTitle = normalizeTitleForDeduplication(item.title);
  if (normalizedTitle) {
    return normalizedTitle;
  }

  return deriveSourceId(item);
}

function extractSentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 32);
}

function buildTakeaways(item: CommunityCurationSourceItem) {
  const sentences = extractSentences(`${item.summary} ${item.content}`);
  const takeaways = selectDistinctSentences(sentences, MAX_CURATION_TAKEAWAYS);

  if (takeaways.length) {
    return takeaways.map((takeaway) => truncateText(takeaway, 220));
  }

  if (item.summary) {
    return [truncateText(item.summary, 220)];
  }

  return [truncateText(item.title, 180)];
}

function sentenceSpecificityScore(value: string) {
  const normalized = normalizeWhitespace(value);
  const lowerValue = normalized.toLowerCase();
  const numberSignals = (normalized.match(/\b\d+(?:,\d{3})*(?:\.\d+)?%?\b/g) ?? []).length;
  const yearSignals = (normalized.match(/\b(?:19|20)\d{2}\b/g) ?? []).length;
  const properNounSignals = (normalized.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z0-9&.-]+){0,3}\b/g) ?? [])
    .filter((match) => match.length > 3).length;
  const keywordSignals = BCN_DETAIL_SIGNAL_KEYWORDS.reduce(
    (count, keyword) => count + (lowerValue.includes(keyword) ? 1 : 0),
    0
  );

  return normalized.length / 120 + numberSignals * 1.1 + yearSignals * 0.7 + properNounSignals * 0.35 + keywordSignals * 0.8;
}

function selectDistinctSentences(sentences: string[], limit: number) {
  const unique = Array.from(new Set(sentences.map((sentence) => normalizeWhitespace(sentence)).filter(Boolean)));
  const ranked = unique
    .map((sentence, index) => ({
      sentence,
      index,
      score: sentenceSpecificityScore(sentence)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const selected: string[] = [];
  for (const candidate of ranked) {
    if (selected.some((existing) => isNearDuplicateText(existing, candidate.sentence))) {
      continue;
    }

    selected.push(candidate.sentence);
    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function isNearDuplicateText(left: string, right: string) {
  const normalizedLeft = normalizeTitleForDeduplication(left);
  const normalizedRight = normalizeTitleForDeduplication(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function cleanHeadline(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return "";
  }

  return truncateText(normalized.replace(BCN_TITLE_SUFFIX_PATTERN, ""), 160);
}

function matchRelevanceThemes(item: CommunityCurationSourceItem) {
  const haystack = `${item.title} ${item.summary} ${item.content}`.toLowerCase();
  return BCN_RELEVANCE_THEMES
    .map((theme) => {
      const matchedKeywords = theme.keywords.filter((keyword) => haystack.includes(keyword));
      return {
        ...theme,
        matchedKeywords,
        score: theme.priority * 2 + Math.min(matchedKeywords.length, 4)
      };
    })
    .filter((theme) => theme.matchedKeywords.length > 0)
    .sort((left, right) => right.score - left.score);
}

function hasNegativeSignal(item: CommunityCurationSourceItem) {
  const haystack = `${item.title} ${item.summary} ${item.content}`.toLowerCase();
  return BCN_NEGATIVE_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function hasClickbaitSignal(item: CommunityCurationSourceItem) {
  const haystack = `${item.title} ${item.summary}`;
  return BCN_CLICKBAIT_PATTERNS.some((pattern) => pattern.test(haystack));
}

function hasGenericWorldNewsSignal(item: CommunityCurationSourceItem) {
  const haystack = `${item.title} ${item.summary} ${item.content}`.toLowerCase();
  return BCN_GENERIC_WORLD_NEWS_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function hasDiscussionValue(item: CommunityCurationSourceItem) {
  const haystack = normalizeWhitespace(`${item.summary} ${item.content}`);
  return haystack.length >= MIN_DISCUSSION_WORTHY_LENGTH;
}

function hasBusinessImpactSignal(item: CommunityCurationSourceItem) {
  const haystack = `${item.title} ${item.summary} ${item.content}`.toLowerCase();
  return BCN_BUSINESS_IMPACT_SIGNALS.some((keyword) => haystack.includes(keyword));
}

function hasCompellingCompactSummary(item: CommunityCurationSourceItem, matchedThemes: readonly unknown[]) {
  const summary = normalizeWhitespace(`${item.summary} ${item.content}`);
  return matchedThemes.length >= 2 && summary.length >= MIN_SUMMARY_LENGTH_FOR_COMPACT_UPDATES;
}

function hasMeaningfulLeadTheme(matchedThemes: BcnMatchedTheme[]) {
  const leadTheme = matchedThemes[0];
  if (!leadTheme) {
    return false;
  }

  if (leadTheme.slug === "economy" && matchedThemes.length === 1) {
    return false;
  }

  return true;
}

function shouldRejectBcnItem(item: CommunityCurationSourceItem, matchedThemes: BcnMatchedTheme[]) {
  if (!matchedThemes.length) {
    return true;
  }

  const businessImpact = hasBusinessImpactSignal(item);
  const genericWorldNews = hasGenericWorldNewsSignal(item);
  const lowSignalAi = matchedThemes[0]?.slug === "ai" && matchedThemes.length === 1 && !businessImpact;
  const lowSignalEconomy =
    matchedThemes.every((theme) => theme.slug === "economy") && !businessImpact;

  if (genericWorldNews && !businessImpact && matchedThemes[0]?.priority <= 4) {
    return true;
  }

  if (lowSignalAi || lowSignalEconomy) {
    return true;
  }

  if (!hasMeaningfulLeadTheme(matchedThemes) && !businessImpact) {
    return true;
  }

  return false;
}

function buildWhyThisMatters(
  takeaways: string[],
  matchedThemes: BcnMatchedTheme[]
) {
  const strongestSupportingTakeaway =
    takeaways.find((takeaway, index) => index > 0 && takeaway.length >= 88) ?? "";
  if (strongestSupportingTakeaway) {
    return truncateText(strongestSupportingTakeaway, 240);
  }

  const primaryTheme = matchedThemes[0];
  const secondaryTheme = matchedThemes[1];
  const focus = primaryTheme?.label ?? "commercial decision-making";
  const secondaryFocus = secondaryTheme?.label
    ? ` and ${secondaryTheme.label}`
    : "";

  return truncateText(
    `This matters because it affects ${focus}${secondaryFocus}, which can change how founder-led businesses plan demand, execution, or team decisions.`,
    240
  );
}

function buildArticleDetail(item: CommunityCurationSourceItem, takeaways: string[]) {
  const detailParts = [item.summary, item.content, ...takeaways, item.title]
    .flatMap((value) => extractSentences(value))
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)
    .filter((value, index, values) => {
      return !values.slice(0, index).some((existingValue) => isNearDuplicateText(existingValue, value));
    })
    .sort((left, right) => sentenceSpecificityScore(right) - sentenceSpecificityScore(left))
    .slice(0, 4);

  const detail = detailParts.join(" ");
  return truncateText(detail || item.summary || item.title, 560);
}

function buildWhatHappened(
  item: CommunityCurationSourceItem,
  takeaways: string[],
  articleDetail: string
) {
  const candidates = [item.summary, takeaways[0], item.title]
    .map((value) => normalizeWhitespace(value ?? ""))
    .filter(Boolean);

  const distinctCandidate =
    candidates.find((candidate) => !isNearDuplicateText(candidate, articleDetail)) ??
    candidates[0] ??
    item.title;

  return truncateText(distinctCandidate, 280);
}

function buildKeyDetail(
  item: CommunityCurationSourceItem,
  takeaways: string[],
  articleDetail: string,
  whatHappened: string
) {
  const candidates = selectDistinctSentences(
    extractSentences(`${item.summary} ${item.content}`),
    MAX_CURATION_TAKEAWAYS
  ).filter(
    (candidate) =>
      !isNearDuplicateText(candidate, articleDetail) && !isNearDuplicateText(candidate, whatHappened)
  );

  const bestCandidate = candidates[0] ?? takeaways[1] ?? item.summary ?? item.title;
  return truncateText(bestCandidate, 280);
}

function buildWhoThisAffects(matchedThemes: BcnMatchedTheme[]) {
  return truncateText(
    Array.from(new Set(matchedThemes.slice(0, 2).map((theme) => theme.audience))).join(" and "),
    180
  );
}

function buildBcnView(matchedThemes: BcnMatchedTheme[]) {
  const leadTheme = matchedThemes[0];
  if (!leadTheme) {
    return "The BCN discussion is usually less about the headline and more about what it changes inside a real business.";
  }

  return truncateText(leadTheme.angle, 220);
}

function buildWhatToWatchNext(
  item: CommunityCurationSourceItem,
  matchedThemes: BcnMatchedTheme[]
) {
  const leadTheme = matchedThemes[0];
  const sourceName = item.sourceName ?? "the source";
  const leadKeyword = leadTheme?.matchedKeywords[0] ?? "commercial conditions";

  return truncateText(
    `Watch for what ${sourceName} reports next on ${leadKeyword}, and whether this moves from headline noise into a clearer shift in demand, cost, compliance, or operating behaviour.`,
    220
  );
}

function buildBcnCandidateTags(matchedThemes: BcnMatchedTheme[]) {
  return Array.from(
    new Set(["bcn-update", "curated", ...matchedThemes.map((theme) => theme.slug)])
  ).slice(0, 5);
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
          "media:description",
          "description",
          "summary"
        ]);
        const item = buildSourceItem({
          sourceId: extractXmlTagValue(block, ["guid", "id"]) || `${feedTitle}:${index}`,
          title: extractXmlTagValue(block, ["title"]),
          summary:
            extractXmlTagValue(block, ["description", "summary", "media:description"]) ||
            stripHtml(rawContent),
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
            "standfirst",
            "subtitle",
            "summary_text",
            "contentSnippet",
            "content_text",
            "content.plain",
            "content"
          ]),
          content: readObjectValue(record, [
            "full_text",
            "fullText",
            "content_text",
            "content",
            "body",
            "summary",
            "description",
            "content_html",
            "contentRendered",
            "description_text"
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

export function isLikelyEnglishCurationItem(item: CommunityCurationSourceItem) {
  const sample = normalizeWhitespace(`${item.title} ${item.summary} ${item.content}`).slice(0, 500);
  if (!sample) {
    return false;
  }

  if (hasNonLatinScript(sample)) {
    return false;
  }

  const englishSignals = countEnglishSignals(sample);
  const nonEnglishSignals = countNonEnglishSignals(sample);
  const diacriticCount = (sample.match(/[^\u0000-\u007f]/g) ?? []).length;

  if (englishSignals >= 2) {
    return true;
  }

  if (nonEnglishSignals >= 2) {
    return false;
  }

  if (diacriticCount >= 4 && englishSignals === 0) {
    return false;
  }

  return /[a-z]/i.test(sample);
}

export function buildBcnCurationSourceLabel(sourceUrl: string, sourceName?: string | null) {
  const explicitName = normalizeSourceName(sourceName);
  if (explicitName) {
    return explicitName;
  }

  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host.includes("bbc")) {
      if (url.pathname.includes("/business/")) {
        return "BBC Business";
      }

      if (url.pathname.includes("/world/")) {
        return "BBC World";
      }

      if (url.pathname.includes("/technology/")) {
        return "BBC Technology";
      }

      return "BBC News";
    }

    if (host.includes("reuters")) {
      return "Reuters";
    }

    if (host.includes("apnews")) {
      return "AP News";
    }

    if (host.includes("aljazeera")) {
      return "Al Jazeera";
    }

    const brand = host.split(".")[0] ?? host;
    return brand
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return "BCN Source";
  }
}

export function buildBcnCuratedCandidate(
  item: CommunityCurationSourceItem,
  defaultSourceName: string
): CommunityCurationCandidate | null {
  const matchedThemes = matchRelevanceThemes(item);
  const hasEnoughContext =
    hasDiscussionValue(item) ||
    hasCompellingCompactSummary(item, matchedThemes) ||
    hasBusinessImpactSignal(item);

  if (
    !matchedThemes.length ||
    hasNegativeSignal(item) ||
    hasClickbaitSignal(item) ||
    !hasEnoughContext ||
    shouldRejectBcnItem(item, matchedThemes)
  ) {
    return null;
  }

  const takeaways = buildTakeaways(item);
  const primaryThemes = matchedThemes.slice(0, 2);
  const relevanceReasons = primaryThemes.map((theme) => theme.label);
  const sourceName = item.sourceName ?? defaultSourceName;
  const articleDetail = buildArticleDetail(item, takeaways);
  const whatHappened = buildWhatHappened(item, takeaways, articleDetail);
  const whyThisMatters = buildWhyThisMatters(takeaways, primaryThemes);
  const whoThisAffects = buildWhoThisAffects(primaryThemes);
  const keyDetail = buildKeyDetail(item, takeaways, articleDetail, whatHappened);
  const bcnView = buildBcnView(primaryThemes);
  const whatToWatchNext = buildWhatToWatchNext(item, primaryThemes);
  const sourceLine = item.url ? `${sourceName} - ${item.url}` : sourceName;
  const publishedLine = item.publishedAt
    ? `Published: ${new Date(item.publishedAt).toISOString().slice(0, 10)}`
    : null;
  const externalId = deriveSourceId(item);
  const dedupeKey = deriveDeduplicationKey(item);
  const checksum = createHash("sha256")
    .update(dedupeKey)
    .digest("hex");

  return {
    externalId,
    checksum,
    dedupeKey,
    title: cleanHeadline(item.title),
    content: [
      "Article detail:",
      articleDetail,
      "",
      "What happened:",
      whatHappened,
      "",
      "Key detail:",
      keyDetail,
      "",
      "Why this matters:",
      whyThisMatters,
      "",
      "Who this affects:",
      whoThisAffects,
      "",
      "BCN view:",
      bcnView,
      "",
      "What to watch next:",
      whatToWatchNext,
      "",
      "Source:",
      sourceLine,
      ...(publishedLine ? ["", publishedLine] : [])
    ].join("\n"),
    tags: buildBcnCandidateTags(matchedThemes),
    relevanceReasons,
    sourceUrl: canonicalizeUrl(item.url),
    sourceName
  };
}

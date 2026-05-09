const BCN_SECTION_DEFINITIONS = [
  {
    key: "article detail",
    aliases: ["article detail"]
  },
  {
    key: "what happened",
    aliases: ["what happened"]
  },
  {
    key: "key detail",
    aliases: ["key detail"]
  },
  {
    key: "why this matters",
    aliases: ["why this matters"]
  },
  {
    key: "business owner impact",
    aliases: ["business owner impact", "what it could affect"]
  },
  {
    key: "founder takeaway",
    aliases: ["founder takeaway", "operator takeaway"]
  },
  {
    key: "who this affects",
    aliases: ["who this affects"]
  },
  {
    key: "bcn view",
    aliases: ["bcn view", "bcn angle"]
  },
  {
    key: "what to watch next",
    aliases: ["what to watch next", "watch next"]
  },
  {
    key: "possible opportunities",
    aliases: ["possible opportunities", "opportunities"]
  },
  {
    key: "possible risks",
    aliases: ["possible risks", "risks"]
  },
  {
    key: "discussion prompt",
    aliases: ["discussion prompt", "suggested discussion prompt"]
  },
  {
    key: "recommended room",
    aliases: ["recommended room", "recommended bcn room"]
  },
  {
    key: "source",
    aliases: ["source", "source attribution", "source link"]
  }
] as const;

const BCN_DISPLAY_TAGS = {
  growth: "Growth",
  ai: "AI",
  retail: "Retail",
  hiring: "Hiring",
  economy: "Economy",
  leadership: "Leadership",
  regulation: "Regulation",
  marketing: "Marketing",
  "e-commerce": "E-commerce",
  operations: "Operations",
  business: "Operations",
  technology: "AI",
  founders: "Leadership",
  commerce: "Retail",
  markets: "Global Markets",
  finance: "Economy",
  tax: "Tax",
  funding: "Funding",
  "consumer-behaviour": "Consumer Behaviour",
  "supply-chain": "Supply Chain",
  energy: "Energy",
  property: "Property",
  cybersecurity: "Cybersecurity",
  "uk-business": "UK Business",
  "global-markets": "Global Markets"
} as const;

const BCN_META_TAGS = new Set([
  "bcn-update",
  "curated",
  "featured-signal",
  "founder-insight",
  "hot-topic",
  "momentum-watch"
]);

export type BcnStructuredContent = {
  articleDetail: string;
  whatHappened: string;
  keyDetail: string;
  whyThisMatters: string;
  businessOwnerImpact: string;
  founderTakeaway: string;
  whoThisAffects: string;
  bcnView: string;
  whatToWatchNext: string;
  possibleOpportunities: string;
  possibleRisks: string;
  suggestedDiscussionPrompt: string;
  recommendedRoom: string;
  source: string;
};

type BcnSignalLike = {
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  intelligenceBusinessOwnerScore?: number | null;
  intelligenceCommercialImpactScore?: number | null;
  intelligenceRelevanceScore?: number | null;
  intelligenceUrgencyScore?: number | null;
  intelligenceSourceCredibilityScore?: number | null;
  commentCount?: number;
  likeCount?: number;
};

const BCN_TAG_PRIORITY: Record<string, number> = {
  growth: 1.35,
  operations: 1.3,
  regulation: 1.3,
  ai: 1.22,
  marketing: 1.16,
  "e-commerce": 1.14,
  retail: 1.12,
  hiring: 1.08,
  leadership: 1.08,
  economy: 1.04
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseTag(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isBcnMetaTag(tag: string) {
  return BCN_META_TAGS.has(tag.toLowerCase());
}

export function getBcnTagLabel(tag: string) {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  return BCN_DISPLAY_TAGS[normalized as keyof typeof BCN_DISPLAY_TAGS] ?? titleCaseTag(normalized);
}

export function getVisibleCommunityTags(tags: string[]) {
  return tags.filter((tag) => !isBcnMetaTag(tag));
}

export function parseBcnStructuredContent(content: string): BcnStructuredContent | null {
  const normalized = content.replace(/\r/g, "");
  if (!normalized) {
    return null;
  }

  const sections = new Map<string, string[]>();
  let activeSection: string | null = null;

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const matchedSection = BCN_SECTION_DEFINITIONS.find((section) =>
      section.aliases.some((alias) => line.toLowerCase() === `${alias}:`)
    );
    if (matchedSection) {
      activeSection = matchedSection.key;
      if (!sections.has(matchedSection.key)) {
        sections.set(matchedSection.key, []);
      }
      continue;
    }

    if (!activeSection) {
      continue;
    }

    sections.get(activeSection)?.push(line);
  }

  const parsed = {
    articleDetail: normalizeWhitespace((sections.get("article detail") ?? []).join(" ")),
    whatHappened: normalizeWhitespace((sections.get("what happened") ?? []).join(" ")),
    keyDetail: normalizeWhitespace((sections.get("key detail") ?? []).join(" ")),
    whyThisMatters: normalizeWhitespace((sections.get("why this matters") ?? []).join(" ")),
    businessOwnerImpact: normalizeWhitespace((sections.get("business owner impact") ?? []).join(" ")),
    founderTakeaway: normalizeWhitespace((sections.get("founder takeaway") ?? []).join(" ")),
    whoThisAffects: normalizeWhitespace((sections.get("who this affects") ?? []).join(" ")),
    bcnView: normalizeWhitespace((sections.get("bcn view") ?? []).join(" ")),
    whatToWatchNext: normalizeWhitespace((sections.get("what to watch next") ?? []).join(" ")),
    possibleOpportunities: normalizeWhitespace((sections.get("possible opportunities") ?? []).join(" ")),
    possibleRisks: normalizeWhitespace((sections.get("possible risks") ?? []).join(" ")),
    suggestedDiscussionPrompt: normalizeWhitespace((sections.get("discussion prompt") ?? []).join(" ")),
    recommendedRoom: normalizeWhitespace((sections.get("recommended room") ?? []).join(" ")),
    source: normalizeWhitespace((sections.get("source") ?? []).join(" "))
  };

  if (
    (!parsed.articleDetail && !parsed.whatHappened) ||
    !parsed.whatHappened ||
    !parsed.keyDetail ||
    !parsed.whyThisMatters ||
    (!parsed.whoThisAffects && !parsed.businessOwnerImpact) ||
    (!parsed.bcnView && !parsed.founderTakeaway) ||
    !parsed.whatToWatchNext
  ) {
    return null;
  }

  return parsed;
}

function countSpecificSignals(value: string) {
  return (
    (value.match(/\b(?:19|20)\d{2}\b/g) ?? []).length +
    (value.match(/\b\d+(?:,\d{3})*(?:\.\d+)?%?\b/g) ?? []).length +
    (value.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z0-9&.-]+){0,3}\b/g) ?? []).length
  );
}

function bcnRecencyWeight(createdAt: string) {
  const publishedAt = new Date(createdAt);
  const ageHours = Math.max(0, (Date.now() - publishedAt.getTime()) / (60 * 60 * 1000));

  if (ageHours <= 4) {
    return 1.12;
  }

  if (ageHours <= 10) {
    return 1.06;
  }

  if (ageHours <= 24) {
    return 1;
  }

  return 0.9;
}

export function scoreBcnSignal(signal: BcnSignalLike) {
  if (typeof signal.intelligenceBusinessOwnerScore === "number") {
    return signal.intelligenceBusinessOwnerScore;
  }

  const parsed = parseBcnStructuredContent(signal.content);
  const visibleTags = getVisibleCommunityTags(signal.tags);
  const tagWeight = visibleTags.reduce(
    (score, tag) => score + (BCN_TAG_PRIORITY[tag.toLowerCase()] ?? 0.92),
    0
  );
  const detailWeight = parsed
    ? parsed.articleDetail.length / 240 +
      parsed.keyDetail.length / 180 +
      parsed.whyThisMatters.length / 220 +
      parsed.whatToWatchNext.length / 180
    : 0;
  const specificityWeight = parsed
    ? countSpecificSignals(`${signal.title} ${parsed.articleDetail} ${parsed.keyDetail}`)
    : countSpecificSignals(`${signal.title} ${signal.content}`);
  const engagementWeight = (signal.commentCount ?? 0) * 0.08 + (signal.likeCount ?? 0) * 0.04;
  const storedScoreWeight =
    (signal.intelligenceCommercialImpactScore ?? 0) * 0.32 +
    (signal.intelligenceRelevanceScore ?? 0) * 0.26 +
    (signal.intelligenceUrgencyScore ?? 0) * 0.2 +
    (signal.intelligenceSourceCredibilityScore ?? 0) * 0.12;

  return (
    tagWeight +
    detailWeight +
    specificityWeight * 0.12 +
    engagementWeight +
    storedScoreWeight
  ) * bcnRecencyWeight(signal.createdAt);
}

export function getBcnSignalLabel(signal: BcnSignalLike & { intelligenceLabel?: string | null }) {
  if (signal.intelligenceLabel) {
    return signal.intelligenceLabel;
  }

  const tags = new Set(signal.tags.map((tag) => tag.toLowerCase()));

  if (tags.has("regulation") || tags.has("tax")) {
    return "Regulation watch";
  }

  if (tags.has("ai")) {
    return "AI signal";
  }

  if (tags.has("global-markets") || tags.has("economy")) {
    return "Market movement";
  }

  if (scoreBcnSignal(signal) >= 8) {
    return "Most relevant now";
  }

  return "Worth watching";
}

export function sortBcnSignals<T extends BcnSignalLike>(signals: T[]) {
  return [...signals].sort((left, right) => {
    const scoreDifference = scoreBcnSignal(right) - scoreBcnSignal(left);
    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function getBcnFreshnessLabel(createdAt: string) {
  const publishedAt = new Date(createdAt);
  const ageMinutes = Math.max(0, Math.round((Date.now() - publishedAt.getTime()) / (60 * 1000)));

  if (ageMinutes < 90) {
    return "Fresh this hour";
  }

  const ageHours = Math.max(1, Math.round(ageMinutes / 60));
  if (ageHours <= 12) {
    return `${ageHours}h ago`;
  }

  return "Within 24h";
}

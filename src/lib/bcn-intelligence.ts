const BCN_SECTION_ORDER = [
  "article detail",
  "what happened",
  "why this matters",
  "who this affects",
  "bcn angle",
  "source"
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
  markets: "Economy",
  finance: "Economy"
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
  whyThisMatters: string;
  whoThisAffects: string;
  bcnAngle: string;
  source: string;
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

    const matchedSection = BCN_SECTION_ORDER.find((section) => line.toLowerCase() === `${section}:`);
    if (matchedSection) {
      activeSection = matchedSection;
      if (!sections.has(matchedSection)) {
        sections.set(matchedSection, []);
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
    whyThisMatters: normalizeWhitespace((sections.get("why this matters") ?? []).join(" ")),
    whoThisAffects: normalizeWhitespace((sections.get("who this affects") ?? []).join(" ")),
    bcnAngle: normalizeWhitespace((sections.get("bcn angle") ?? []).join(" ")),
    source: normalizeWhitespace((sections.get("source") ?? []).join(" "))
  };

  if (
    (!parsed.articleDetail && !parsed.whatHappened) ||
    !parsed.whatHappened ||
    !parsed.whyThisMatters ||
    !parsed.whoThisAffects ||
    !parsed.bcnAngle
  ) {
    return null;
  }

  return parsed;
}

export const BCN_INTELLIGENCE_CATEGORIES = [
  "Economy",
  "AI",
  "Hiring",
  "Tax",
  "Regulation",
  "Marketing",
  "Funding",
  "Technology",
  "Consumer Behaviour",
  "Supply Chain",
  "Energy",
  "Property",
  "Leadership",
  "Cybersecurity",
  "UK Business",
  "Global Markets"
] as const;

export type BcnIntelligenceCategory = (typeof BCN_INTELLIGENCE_CATEGORIES)[number];
export type BcnIntelligenceSourceType = "RSS" | "API" | "MANUAL";
export type BcnSourceCredibilityTier = "official" | "primary" | "major" | "specialist" | "manual";

export type BcnIntelligenceSourceRegistryEntry = {
  id: string;
  name: string;
  domain: string;
  type: BcnIntelligenceSourceType;
  feedUrl: string | null;
  enabled: boolean;
  categoryHints: readonly BcnIntelligenceCategory[];
  credibilityTier: BcnSourceCredibilityTier;
  defaultRegion: "UK" | "US" | "Global" | "Europe";
  defaultWeight: number;
  commercialRelevanceWeight: number;
  disabledReason?: string;
};

const SOURCE_REGISTRY = [
  {
    id: "bbc-business",
    name: "BBC Business",
    domain: "bbc.co.uk",
    type: "RSS",
    feedUrl: "https://feeds.bbci.co.uk/news/business/rss.xml",
    enabled: true,
    categoryHints: ["Economy", "UK Business", "Global Markets"],
    credibilityTier: "major",
    defaultRegion: "UK",
    defaultWeight: 0.92,
    commercialRelevanceWeight: 0.9
  },
  {
    id: "bbc-technology",
    name: "BBC Technology",
    domain: "bbc.co.uk",
    type: "RSS",
    feedUrl: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    enabled: true,
    categoryHints: ["Technology", "AI", "Cybersecurity"],
    credibilityTier: "major",
    defaultRegion: "UK",
    defaultWeight: 0.82,
    commercialRelevanceWeight: 0.86
  },
  {
    id: "guardian-business",
    name: "The Guardian Business",
    domain: "theguardian.com",
    type: "RSS",
    feedUrl: "https://www.theguardian.com/uk/business/rss",
    enabled: true,
    categoryHints: ["UK Business", "Economy", "Consumer Behaviour"],
    credibilityTier: "major",
    defaultRegion: "UK",
    defaultWeight: 0.88,
    commercialRelevanceWeight: 0.9
  },
  {
    id: "sky-news-business",
    name: "Sky News Business",
    domain: "sky.com",
    type: "RSS",
    feedUrl: "https://feeds.skynews.com/feeds/rss/business.xml",
    enabled: true,
    categoryHints: ["UK Business", "Economy", "Global Markets"],
    credibilityTier: "major",
    defaultRegion: "UK",
    defaultWeight: 0.86,
    commercialRelevanceWeight: 0.88
  },
  {
    id: "govuk-business",
    name: "GOV.UK Business Updates",
    domain: "gov.uk",
    type: "RSS",
    feedUrl:
      "https://www.gov.uk/search/news-and-communications.atom?topic[]=74f7449e-08f8-4325-b8db-3703cb99f4d0",
    enabled: true,
    categoryHints: ["UK Business", "Regulation", "Funding"],
    credibilityTier: "official",
    defaultRegion: "UK",
    defaultWeight: 1.1,
    commercialRelevanceWeight: 1.1
  },
  {
    id: "hmrc-updates",
    name: "HMRC Updates",
    domain: "gov.uk",
    type: "RSS",
    feedUrl: "https://www.gov.uk/search/news-and-communications.atom?organisations[]=hm-revenue-customs",
    enabled: true,
    categoryHints: ["Tax", "Regulation", "UK Business"],
    credibilityTier: "official",
    defaultRegion: "UK",
    defaultWeight: 1.18,
    commercialRelevanceWeight: 1.08
  },
  {
    id: "companies-house",
    name: "Companies House Updates",
    domain: "gov.uk",
    type: "RSS",
    feedUrl: "https://www.gov.uk/search/news-and-communications.atom?organisations[]=companies-house",
    enabled: true,
    categoryHints: ["Regulation", "UK Business"],
    credibilityTier: "official",
    defaultRegion: "UK",
    defaultWeight: 1.14,
    commercialRelevanceWeight: 1.04
  },
  {
    id: "bank-of-england-news",
    name: "Bank of England News",
    domain: "bankofengland.co.uk",
    type: "RSS",
    feedUrl: "https://www.bankofengland.co.uk/rss/news",
    enabled: true,
    categoryHints: ["Economy", "Global Markets", "Regulation"],
    credibilityTier: "official",
    defaultRegion: "UK",
    defaultWeight: 1.16,
    commercialRelevanceWeight: 1.02
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    domain: "techcrunch.com",
    type: "RSS",
    feedUrl: "https://techcrunch.com/feed/",
    enabled: true,
    categoryHints: ["Technology", "AI", "Funding"],
    credibilityTier: "specialist",
    defaultRegion: "Global",
    defaultWeight: 0.78,
    commercialRelevanceWeight: 0.92
  },
  {
    id: "cnbc-business",
    name: "CNBC Business",
    domain: "cnbc.com",
    type: "RSS",
    feedUrl: "https://www.cnbc.com/id/10001147/device/rss/rss.html",
    enabled: true,
    categoryHints: ["Global Markets", "Economy", "Technology"],
    credibilityTier: "major",
    defaultRegion: "US",
    defaultWeight: 0.78,
    commercialRelevanceWeight: 0.86
  },
  {
    id: "reuters-agency-business",
    name: "Reuters Business",
    domain: "reutersagency.com",
    type: "RSS",
    feedUrl: "https://www.reutersagency.com/feed/?best-regions=world&post_type=best",
    enabled: true,
    categoryHints: ["Global Markets", "Economy", "Supply Chain"],
    credibilityTier: "primary",
    defaultRegion: "Global",
    defaultWeight: 1.08,
    commercialRelevanceWeight: 1.06
  },
  {
    id: "financial-times-manual",
    name: "Financial Times",
    domain: "ft.com",
    type: "MANUAL",
    feedUrl: null,
    enabled: false,
    categoryHints: ["Economy", "Global Markets", "UK Business"],
    credibilityTier: "primary",
    defaultRegion: "Global",
    defaultWeight: 1.12,
    commercialRelevanceWeight: 1.1,
    disabledReason:
      "Manual or configured-feed only by default so BCN does not bypass paywalls or republish restricted FT content."
  },
  {
    id: "ons-updates",
    name: "Office for National Statistics",
    domain: "ons.gov.uk",
    type: "MANUAL",
    feedUrl: null,
    enabled: false,
    categoryHints: ["Economy", "UK Business", "Consumer Behaviour"],
    credibilityTier: "official",
    defaultRegion: "UK",
    defaultWeight: 1.15,
    commercialRelevanceWeight: 1,
    disabledReason:
      "No reliable official RSS feed is enabled in the registry yet. Add ONS signals manually or configure an approved feed."
  }
] as const satisfies readonly BcnIntelligenceSourceRegistryEntry[];

const CATEGORY_KEYWORDS: Array<{
  category: BcnIntelligenceCategory;
  keywords: string[];
}> = [
  {
    category: "Tax",
    keywords: ["hmrc", "tax", "vat", "corporation tax", "self assessment", "payroll", "making tax digital"]
  },
  {
    category: "Regulation",
    keywords: ["companies house", "regulation", "regulatory", "compliance", "reporting", "law", "rules", "enforcement"]
  },
  {
    category: "Economy",
    keywords: [
      "interest rate",
      "interest rates",
      "inflation",
      "gdp",
      "jobs data",
      "bank of england",
      "federal reserve",
      "recession",
      "economic",
      "economy"
    ]
  },
  {
    category: "AI",
    keywords: ["ai", "artificial intelligence", "automation", "openai", "anthropic", "google ai", "microsoft copilot"]
  },
  {
    category: "Hiring",
    keywords: ["hiring", "wages", "unemployment", "labour market", "recruitment", "jobs", "workforce", "layoffs"]
  },
  {
    category: "Marketing",
    keywords: ["ad spend", "advertising", "google", "meta", "tiktok", "search", "consumer demand", "marketing"]
  },
  {
    category: "Funding",
    keywords: ["funding", "investment", "venture", "loan", "grant", "raise", "raised", "capital"]
  },
  {
    category: "Technology",
    keywords: ["software", "platform", "cloud", "saas", "technology", "semiconductor", "chips"]
  },
  {
    category: "Cybersecurity",
    keywords: ["cyber", "cybersecurity", "data breach", "ransomware", "security", "hack"]
  },
  {
    category: "Supply Chain",
    keywords: ["supply chain", "shipping", "logistics", "manufacturing", "factory", "inventory", "exports", "imports"]
  },
  {
    category: "Energy",
    keywords: ["energy", "oil", "gas", "electricity", "power", "renewables", "fuel"]
  },
  {
    category: "Property",
    keywords: ["property", "rent", "mortgage", "commercial property", "housing", "office space"]
  },
  {
    category: "Consumer Behaviour",
    keywords: ["consumer", "retail", "spending", "demand", "shopping", "confidence"]
  },
  {
    category: "Leadership",
    keywords: ["chief executive", "ceo", "founder", "board", "leadership", "strategy", "turnaround"]
  },
  {
    category: "Global Markets",
    keywords: ["markets", "shares", "stocks", "currency", "dollar", "sterling", "global", "wall street"]
  },
  {
    category: "UK Business",
    keywords: ["uk", "britain", "british", "gov.uk", "department for business", "business secretary"]
  }
];

const CATEGORY_SLUGS = new Map(
  BCN_INTELLIGENCE_CATEGORIES.map((category) => [
    category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    category
  ])
);

export function getBcnIntelligenceSourceRegistry(): BcnIntelligenceSourceRegistryEntry[] {
  return SOURCE_REGISTRY.map((source) => ({ ...source }));
}

export function normaliseBcnIntelligenceCategory(value: string | null | undefined) {
  const normalised = (value ?? "").trim().toLowerCase();
  if (!normalised) {
    return null;
  }

  return (
    BCN_INTELLIGENCE_CATEGORIES.find((category) => category.toLowerCase() === normalised) ??
    CATEGORY_SLUGS.get(normalised.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) ??
    null
  );
}

export function bcnCategoryToTag(category: BcnIntelligenceCategory) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getBcnCategoryLabel(value: string | null | undefined) {
  return normaliseBcnIntelligenceCategory(value) ?? value ?? "";
}

export function inferBcnCategories(input: {
  title: string;
  summary?: string | null;
  content?: string | null;
  sourceName?: string | null;
  sourceDomain?: string | null;
  sourceHints?: readonly BcnIntelligenceCategory[];
}): BcnIntelligenceCategory[] {
  const haystack = [
    input.title,
    input.summary ?? "",
    input.content ?? "",
    input.sourceName ?? "",
    input.sourceDomain ?? ""
  ]
    .join(" ")
    .toLowerCase();

  const matched = CATEGORY_KEYWORDS.flatMap(({ category, keywords }) => {
    const score = keywords.reduce((count, keyword) => count + (haystack.includes(keyword) ? 1 : 0), 0);
    return score ? [{ category, score }] : [];
  });

  for (const hint of input.sourceHints ?? []) {
    matched.push({
      category: hint,
      score: 0.65
    });
  }

  const ranked = matched
    .reduce<Map<BcnIntelligenceCategory, number>>((scores, entry) => {
      scores.set(entry.category, (scores.get(entry.category) ?? 0) + entry.score);
      return scores;
    }, new Map())
    .entries();

  const categories = Array.from(ranked)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([category]) => category);

  return categories.length ? categories : ["UK Business"];
}

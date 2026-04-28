import {
  siteContentDefaults,
  siteContentSchemas,
  type SiteContentSlug,
  type SiteContentValueMap
} from "@/config/site-content";

const staleMembershipPlanPhrasePattern = new RegExp(`\\b${["both", "plans"].join(" ")}\\b`, "gi");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSiteContentValue(defaultValue: unknown, rawValue: unknown): unknown {
  if (typeof defaultValue === "string") {
    return typeof rawValue === "string" && rawValue.trim().length
      ? rawValue.trim()
      : defaultValue;
  }

  if (typeof defaultValue === "number") {
    return typeof rawValue === "number" && Number.isFinite(rawValue)
      ? rawValue
      : defaultValue;
  }

  if (typeof defaultValue === "boolean") {
    return typeof rawValue === "boolean" ? rawValue : defaultValue;
  }

  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(rawValue)) {
      return defaultValue;
    }

    return defaultValue.map((item, index) =>
      normalizeSiteContentValue(item, rawValue[index])
    );
  }

  if (isRecord(defaultValue)) {
    const rawRecord = isRecord(rawValue) ? rawValue : {};
    const normalized: Record<string, unknown> = {};

    for (const [key, nestedDefaultValue] of Object.entries(defaultValue)) {
      normalized[key] = normalizeSiteContentValue(
        nestedDefaultValue,
        rawRecord[key]
      );
    }

    return normalized;
  }

  return defaultValue;
}

export function normalizeSiteContentSections<K extends SiteContentSlug>(
  slug: K,
  rawSections: unknown
): SiteContentValueMap[K] {
  const defaults = siteContentDefaults[slug];
  const merged = normalizeSiteContentValue(defaults, rawSections);

  const parsed = siteContentSchemas[slug].safeParse(merged);
  if (parsed.success) {
    if (slug === "membership") {
      const membershipContent = parsed.data as SiteContentValueMap["membership"];
      return {
        ...membershipContent,
        faqs: membershipContent.faqs.map((item) => ({
          question: item.question.replace(staleMembershipPlanPhrasePattern, "all membership rooms"),
          answer: item.answer.replace(staleMembershipPlanPhrasePattern, "all membership rooms")
        }))
      } as SiteContentValueMap[K];
    }

    return parsed.data as SiteContentValueMap[K];
  }

  return defaults as SiteContentValueMap[K];
}

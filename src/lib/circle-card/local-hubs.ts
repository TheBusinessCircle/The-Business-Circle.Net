import type { CircleTrustSummary } from "@/lib/circle-card/circle-trust";

export const HUCKNALL_HUB_SLUG = "hucknall-circle-hub";
export const HUCKNALL_HUB_PATH = `/card/${HUCKNALL_HUB_SLUG}`;
export const BUSINESS_DIRECTORY_CATEGORIES = [
  ["food-drink", "Food & drink"],
  ["shopping", "Shops & retail"],
  ["trades", "Trades & home services"],
  ["health-beauty", "Health & beauty"],
  ["professional", "Professional services"],
  ["motoring", "Motoring & transport"],
  ["leisure", "Leisure & activities"],
  ["community", "Community & organisations"],
  ["other", "Other local businesses"]
] as const;
export type BusinessDirectoryCategory = typeof BUSINESS_DIRECTORY_CATEGORIES[number][0];

// A format check, never a claim that a business address has been verified.
const UK_POSTCODE = /^(?:GIR 0AA|[A-PR-UWYZ][A-HK-Y]?\d[\dA-HJKPSTUW]? \d[ABD-HJLNP-UW-Z]{2})$/;

export function normalizeBusinessPostcode(value: string | null | undefined) {
  const compact = (value ?? "").replace(/\s/g, "").toUpperCase();
  if (!compact) return "";
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function isValidBusinessPostcode(value: string | null | undefined) {
  return UK_POSTCODE.test(normalizeBusinessPostcode(value));
}

export function isHucknallBusinessPostcode(value: string | null | undefined) {
  const postcode = normalizeBusinessPostcode(value);
  return isValidBusinessPostcode(postcode) && postcode.split(" ")[0] === "NG15";
}

export function isBusinessDirectoryCategory(value: string): value is BusinessDirectoryCategory {
  return BUSINESS_DIRECTORY_CATEGORIES.some(([key]) => key === value);
}

export function getLocalHubPath(input: {
  cardType: string;
  businessPostcode?: string | null;
  isPublished: boolean;
  showInDiscover: boolean;
  archivedAt?: Date | null;
}) {
  return input.cardType === "BUSINESS" && input.isPublished && input.showInDiscover &&
    !input.archivedAt && isHucknallBusinessPostcode(input.businessPostcode)
    ? HUCKNALL_HUB_PATH : null;
}

// Existing Trust includes a membership signal. Paying must never improve directory position.
export function directoryCircleTrustScore(trust: Pick<CircleTrustSummary, "signals">) {
  return trust.signals.reduce((total, signal) =>
    signal.id === "bcn-member" ? total : total + Math.max(0, signal.scoreContribution), 0);
}

export type LocalHubBusiness = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: BusinessDirectoryCategory;
  trustScore: number;
  verifiedTestimonials: number;
};

export function sortLocalHubBusinesses<T extends LocalHubBusiness>(businesses: readonly T[]): T[] {
  return [...businesses].sort((a, b) => b.trustScore - a.trustScore ||
    a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" }) || a.slug.localeCompare(b.slug));
}

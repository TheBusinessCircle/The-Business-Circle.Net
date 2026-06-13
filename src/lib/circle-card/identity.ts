import type { CircleCardAccountType, Prisma } from "@prisma/client";

export const CIRCLE_CARD_ACCOUNT_TYPES = [
  "INDIVIDUAL",
  "FOUNDER",
  "TEAM"
] as const satisfies readonly CircleCardAccountType[];

export type CircleCardIdentityTag =
  | "content-creator"
  | "freelancer"
  | "consultant"
  | "tradesperson"
  | "agency-owner"
  | "coach"
  | "photographer"
  | "videographer"
  | "designer"
  | "developer"
  | "musician"
  | "restaurant"
  | "retail"
  | "service-provider"
  | "community-builder"
  | "student"
  | "job-seeker"
  | "other";

export const CIRCLE_CARD_IDENTITY_TAGS: Array<{
  value: CircleCardIdentityTag;
  label: string;
}> = [
  { value: "content-creator", label: "Content Creator" },
  { value: "freelancer", label: "Freelancer" },
  { value: "consultant", label: "Consultant" },
  { value: "tradesperson", label: "Tradesperson" },
  { value: "agency-owner", label: "Agency Owner" },
  { value: "coach", label: "Coach" },
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "designer", label: "Designer" },
  { value: "developer", label: "Developer" },
  { value: "musician", label: "Musician" },
  { value: "restaurant", label: "Restaurant" },
  { value: "retail", label: "Retail" },
  { value: "service-provider", label: "Service Provider" },
  { value: "community-builder", label: "Community Builder" },
  { value: "student", label: "Student" },
  { value: "job-seeker", label: "Job Seeker" },
  { value: "other", label: "Other" }
];

const IDENTITY_TAG_LABELS = new Map(
  CIRCLE_CARD_IDENTITY_TAGS.map((tag) => [tag.value, tag.label])
);

export const CIRCLE_CARD_ACCOUNT_TYPE_COPY: Record<
  CircleCardAccountType,
  {
    label: string;
    shortLabel: string;
    description: string;
    points: string[];
    localDiscoverySegment: "people" | "businesses" | "teams";
    futureUpgradePath: string;
    futureVerificationLabel: string;
  }
> = {
  INDIVIDUAL: {
    label: "Individual",
    shortLabel: "Individual",
    description: "Personal profile for networking, events, communities and a digital contact card.",
    points: ["Build your network", "Meet people", "Attend events", "Create a personal profile"],
    localDiscoverySegment: "people",
    futureUpgradePath: "Pro Personal",
    futureVerificationLabel: "Verified Individual"
  },
  FOUNDER: {
    label: "Founder / Business Owner",
    shortLabel: "Founder",
    description: "Business owner, freelancer, consultant, creator or operator building trust.",
    points: ["Promote your business", "Generate leads", "Show services", "Build trust"],
    localDiscoverySegment: "businesses",
    futureUpgradePath: "Pro Business",
    futureVerificationLabel: "Verified Founder"
  },
  TEAM: {
    label: "Team / Organisation",
    shortLabel: "Team",
    description: "Organisation, company or business with multiple people and future team tools.",
    points: ["Represent a company", "Manage multiple people", "Grow together"],
    localDiscoverySegment: "teams",
    futureUpgradePath: "Teams",
    futureVerificationLabel: "Verified Team"
  }
};

export const CIRCLE_CARD_IDENTITY_HIERARCHY = [
  "person",
  "company",
  "team",
  "business-circle-network"
] as const;

export function resolveCircleCardAccountType(
  value: FormDataEntryValue | string | null | undefined
): CircleCardAccountType | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return CIRCLE_CARD_ACCOUNT_TYPES.includes(normalized as CircleCardAccountType)
    ? (normalized as CircleCardAccountType)
    : null;
}

export function getCircleCardAccountTypeLabel(value: CircleCardAccountType | null | undefined) {
  return value ? CIRCLE_CARD_ACCOUNT_TYPE_COPY[value]?.shortLabel ?? value : null;
}

export function getCircleCardAccountTypeLongLabel(
  value: CircleCardAccountType | null | undefined
) {
  return value ? CIRCLE_CARD_ACCOUNT_TYPE_COPY[value]?.label ?? value : null;
}

export function getCircleCardIdentityTagLabel(value: string) {
  return IDENTITY_TAG_LABELS.get(value as CircleCardIdentityTag) ?? value;
}

export function normalizeCircleCardIdentityTags(values: Iterable<unknown>) {
  const allowedTags = new Set(CIRCLE_CARD_IDENTITY_TAGS.map((tag) => tag.value));
  const tags = Array.from(values)
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value;
      }

      return String(value ?? "")
        .split(",")
        .map((item) => item.trim());
    })
    .map((value) => String(value).trim().toLowerCase())
    .filter((value): value is CircleCardIdentityTag =>
      allowedTags.has(value as CircleCardIdentityTag)
    );

  return Array.from(new Set(tags)).slice(0, 8);
}

export function buildCircleCardIdentityFilterWhere(input: {
  accountType?: CircleCardAccountType | null;
  identityTag?: string | null;
  identityTags?: string[];
}): Prisma.CircleCardWhereInput {
  const normalizedTags = normalizeCircleCardIdentityTags([
    input.identityTag ?? "",
    ...(input.identityTags ?? [])
  ]);

  return {
    ...(input.accountType ? { accountType: input.accountType } : {}),
    ...(normalizedTags.length ? { identityTags: { hasSome: normalizedTags } } : {})
  };
}


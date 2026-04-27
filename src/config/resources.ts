import type { ResourceTier, ResourceType } from "@prisma/client";

export type ResourceCategoryOption = {
  label: string;
  value: string;
  tier: ResourceTier;
};

export type ResourceTypeOption = {
  label: string;
  value: ResourceType;
};

export type ResourceScheduleSlot = {
  weekday: 1 | 3 | 5;
  dayLabel: "Monday" | "Wednesday" | "Friday";
  time: string;
};

export type ResourceBlockType =
  | "TEXT"
  | "CHECKLIST"
  | "STEPS"
  | "IMAGE"
  | "VIDEO"
  | "QUOTE"
  | "CALLOUT"
  | "DOWNLOAD"
  | "LINKS";

export const RESOURCE_BLOCK_TYPES = [
  "TEXT",
  "CHECKLIST",
  "STEPS",
  "IMAGE",
  "VIDEO",
  "QUOTE",
  "CALLOUT",
  "DOWNLOAD",
  "LINKS"
] as const satisfies readonly ResourceBlockType[];

const DEFAULT_FOUNDATION_TIMES = ["09:00", "13:00", "18:00"] as const;
const DEFAULT_INNER_TIMES = ["10:30", "14:30", "19:30"] as const;
const DEFAULT_CORE_TIMES = ["12:00", "16:00", "20:30"] as const;
const DEFAULT_DAILY_FOUNDATION_TIME = "09:00";
const DEFAULT_DAILY_INNER_TIME = "13:00";
const DEFAULT_DAILY_CORE_TIME = "17:00";
const WEEKDAY_SEQUENCE: ResourceScheduleSlot["weekday"][] = [1, 3, 5];
const DAY_LABELS: Record<ResourceScheduleSlot["weekday"], ResourceScheduleSlot["dayLabel"]> = {
  1: "Monday",
  3: "Wednesday",
  5: "Friday"
};

export const RESOURCE_SCHEDULE_TIMEZONE =
  process.env.RESOURCE_SCHEDULE_TIMEZONE?.trim() || "Europe/London";

export const RESOURCE_AUTOMATION_THROTTLE_MS = normalizePositiveInteger(
  process.env.RESOURCE_AUTOMATION_THROTTLE_MS,
  5 * 60 * 1000
);

export const RESOURCE_GENERATION_PROVIDER =
  process.env.RESOURCE_GENERATION_PROVIDER?.trim().toLowerCase() || "openai";

export const RESOURCE_CONTENT_MODEL =
  process.env.RESOURCE_CONTENT_MODEL?.trim() ||
  process.env.OPENAI_RESOURCE_CONTENT_MODEL?.trim() ||
  "gpt-5.4-mini";

export const RESOURCE_IMAGE_MODEL =
  process.env.RESOURCE_IMAGE_MODEL?.trim() ||
  process.env.OPENAI_RESOURCE_IMAGE_MODEL?.trim() ||
  "gpt-image-2";

export const RESOURCE_IMAGE_FALLBACK_MODEL =
  process.env.RESOURCE_IMAGE_FALLBACK_MODEL?.trim() ||
  process.env.OPENAI_RESOURCE_IMAGE_FALLBACK_MODEL?.trim() ||
  "";

export const RESOURCE_IMAGE_SIZE = process.env.RESOURCE_IMAGE_SIZE?.trim() || "1024x1024";

export const RESOURCE_IMAGE_QUALITY = process.env.RESOURCE_IMAGE_QUALITY?.trim() || "medium";

export const RESOURCE_DAILY_PUBLISH_TIMES = {
  FOUNDATION: parseSingleTime(
    process.env.RESOURCE_DAILY_FOUNDATION_PUBLISH_TIME,
    DEFAULT_DAILY_FOUNDATION_TIME
  ),
  INNER: parseSingleTime(
    process.env.RESOURCE_DAILY_INNER_PUBLISH_TIME,
    DEFAULT_DAILY_INNER_TIME
  ),
  CORE: parseSingleTime(process.env.RESOURCE_DAILY_CORE_PUBLISH_TIME, DEFAULT_DAILY_CORE_TIME)
} as const satisfies Record<ResourceTier, string>;

export const RESOURCE_TIER_ORDER = [
  "FOUNDATION",
  "INNER",
  "CORE"
] as const satisfies readonly ResourceTier[];

export const RESOURCE_TIER_LABELS: Record<ResourceTier, string> = {
  FOUNDATION: "Foundation",
  INNER: "Inner Circle",
  CORE: "Core"
};

export const RESOURCE_TYPE_OPTIONS: ResourceTypeOption[] = [
  { value: "CLARITY", label: "Clarity" },
  { value: "STRATEGY", label: "Strategy" },
  { value: "OBSERVATION", label: "Observation" },
  { value: "MINDSET", label: "Mindset" },
  { value: "ACTION", label: "Action" }
];

export const RESOURCE_CATEGORIES_BY_TIER: Record<ResourceTier, string[]> = {
  FOUNDATION: [
    "Getting Started",
    "Business Foundations",
    "Offer Clarity",
    "Basic Marketing",
    "Direction and Thinking",
    "Customer Journey",
    "Decision Making",
    "Website and Conversion",
    "Positioning",
    "Operations",
    "Sales",
    "Messaging",
    "Trust and Credibility",
    "Pricing",
    "Client Experience",
    "Delivery",
    "Focus and Prioritisation"
  ],
  INNER: [
    "Offer Positioning",
    "Website and Conversion",
    "Customer Journey",
    "Pricing and Value",
    "Fixing Problems",
    "Offer Clarity",
    "Decision Making",
    "Positioning",
    "Operations",
    "Sales",
    "Messaging",
    "Team Clarity",
    "Trust and Credibility",
    "Pricing",
    "Client Experience",
    "Delivery",
    "Retention",
    "Growth Systems",
    "Focus and Prioritisation"
  ],
  CORE: [
    "Scaling and Structure",
    "Decision Making",
    "Time and Energy",
    "Systems",
    "Long Term Growth",
    "Leadership",
    "Strategic Direction",
    "Founder Pressure",
    "Growth Systems",
    "Positioning",
    "Operations",
    "Pricing",
    "Retention",
    "Focus and Prioritisation",
    "Delivery"
  ]
};

export const RESOURCE_CATEGORY_OPTIONS: ResourceCategoryOption[] = RESOURCE_TIER_ORDER.flatMap(
  (tier) =>
    RESOURCE_CATEGORIES_BY_TIER[tier].map((label) => ({
      label,
      value: label,
      tier
    }))
);

export const RESOURCE_TIER_SCHEDULES: Record<ResourceTier, ResourceScheduleSlot[]> = {
  FOUNDATION: buildTierSchedule(
    parseTierTimes(process.env.RESOURCE_FOUNDATION_PUBLISH_TIMES, DEFAULT_FOUNDATION_TIMES)
  ),
  INNER: buildTierSchedule(
    parseTierTimes(process.env.RESOURCE_INNER_PUBLISH_TIMES, DEFAULT_INNER_TIMES)
  ),
  CORE: buildTierSchedule(parseTierTimes(process.env.RESOURCE_CORE_PUBLISH_TIMES, DEFAULT_CORE_TIMES))
};

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseTierTimes(
  value: string | undefined,
  fallback: readonly [string, string, string]
): [string, string, string] {
  if (!value) {
    return [fallback[0], fallback[1], fallback[2]];
  }

  const parts = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length !== 3 || parts.some((item) => !/^\d{2}:\d{2}$/.test(item))) {
    return [fallback[0], fallback[1], fallback[2]];
  }

  return [parts[0], parts[1], parts[2]];
}

function parseSingleTime(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d{2}:\d{2}$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function buildTierSchedule(times: [string, string, string]): ResourceScheduleSlot[] {
  return WEEKDAY_SEQUENCE.map((weekday, index) => ({
    weekday,
    dayLabel: DAY_LABELS[weekday],
    time: times[index]
  }));
}

export function getResourceTierLabel(tier: ResourceTier): string {
  return RESOURCE_TIER_LABELS[tier];
}

export function getResourceTypeLabel(type: ResourceType): string {
  return RESOURCE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function getResourceCategoriesForTier(tier: ResourceTier): string[] {
  return RESOURCE_CATEGORIES_BY_TIER[tier];
}

export function isValidResourceCategoryForTier(category: string, tier: ResourceTier): boolean {
  return RESOURCE_CATEGORIES_BY_TIER[tier].includes(category);
}

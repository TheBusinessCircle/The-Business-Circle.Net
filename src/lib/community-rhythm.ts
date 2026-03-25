import { MembershipTier } from "@prisma/client";
import { getMembershipTierRank } from "@/config/membership";
import { COMMUNITY_CHANNEL_BLUEPRINTS } from "@/config/community";
import {
  COMMUNITY_QUIET_PROMPTS,
  type CommunityQuietPrompt
} from "@/config/community-prompts";
import { formatDate } from "@/lib/utils";

const ACTIVE_NOW_HOURS = 18;
const RECENT_ACTIVITY_HOURS = 72;
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export type ConversationPromptSuggestion = {
  id: string;
  title: string;
  prompt: string;
  type: CommunityQuietPrompt["type"];
  tier: MembershipTier;
  channelSlug: string;
  channelName: string;
};

export type CommunityRhythmBucket = "start" | "mid" | "end";

type ActivityInput = Date | string | null | undefined;
type FreshnessSignalOptions = {
  withinDayLabel?: string;
  withinWeekLabel?: string;
  fallbackPrefix?: string;
  emptyLabel?: string;
};

function normalizeDate(value: ActivityInput) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function weekIndex(now: Date) {
  return Math.floor(now.getTime() / WEEK_IN_MS);
}

function rotationSeed(value: string) {
  return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0);
}

function rotateArray<T>(items: T[], offset: number) {
  if (!items.length) {
    return [];
  }

  const normalizedOffset = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
}

function resolveChannelName(slug: string) {
  return COMMUNITY_CHANNEL_BLUEPRINTS.find((channel) => channel.slug === slug)?.name ?? slug;
}

function getRhythmPromptScore(prompt: CommunityQuietPrompt, bucket: CommunityRhythmBucket) {
  if (bucket === "start") {
    if (
      prompt.id === "foundation-one-focus-week" ||
      prompt.id === "foundation-what-working-on-now" ||
      prompt.id === "foundation-improve-this-week"
    ) {
      return 4;
    }

    if (prompt.type === "momentum" || prompt.type === "strategy") {
      return 2;
    }
  }

  if (bucket === "mid") {
    if (
      prompt.id === "foundation-where-stuck" ||
      prompt.id === "foundation-need-intro" ||
      prompt.id === "inner-circle-sales-leak"
    ) {
      return 4;
    }

    if (
      prompt.type === "operations" ||
      prompt.type === "connections" ||
      prompt.type === "visibility"
    ) {
      return 2;
    }
  }

  if (bucket === "end") {
    if (
      prompt.id === "foundation-useful-connection-happened" ||
      prompt.id === "foundation-what-improved-recently" ||
      prompt.id === "foundation-recent-change-helped"
    ) {
      return 4;
    }

    if (prompt.type === "reflection" || prompt.type === "momentum") {
      return 2;
    }
  }

  return 0;
}

export function getCommunityRhythmBucket(now = new Date()): CommunityRhythmBucket {
  const day = now.getDay();

  if (day === 1 || day === 2) {
    return "start";
  }

  if (day === 3 || day === 4) {
    return "mid";
  }

  return "end";
}

export function sortPromptsByRhythm<T extends CommunityQuietPrompt>(prompts: T[], now = new Date()) {
  const bucket = getCommunityRhythmBucket(now);

  return [...prompts].sort((left, right) => {
    const scoreDifference = getRhythmPromptScore(right, bucket) - getRhythmPromptScore(left, bucket);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.id.localeCompare(right.id);
  });
}

export function getSuggestedConversationPrompts(input: {
  membershipTier: MembershipTier;
  channelSlug?: string | null;
  limit?: number;
  now?: Date;
}): ConversationPromptSuggestion[] {
  const now = input.now ?? new Date();
  const accessibleTierRank = getMembershipTierRank(input.membershipTier);
  const matchingPrompts = COMMUNITY_QUIET_PROMPTS.filter((prompt) => {
    if (getMembershipTierRank(prompt.tier) > accessibleTierRank) {
      return false;
    }

    if (input.channelSlug) {
      return prompt.channelSlugs.includes(input.channelSlug);
    }

    return true;
  }).sort((left, right) => left.id.localeCompare(right.id));

  if (!matchingPrompts.length) {
    return [];
  }

  const rhythmBucket = getCommunityRhythmBucket(now);
  const seedSource = `${input.membershipTier}:${input.channelSlug ?? "all"}:${weekIndex(now)}:${rhythmBucket}`;
  const rotatedPrompts = rotateArray(matchingPrompts, rotationSeed(seedSource));
  const prioritizedPrompts = sortPromptsByRhythm(rotatedPrompts, now);
  const limit = input.limit ?? 3;

  return prioritizedPrompts.slice(0, limit).map((prompt, index) => {
    const channelSlug = input.channelSlug
      ? input.channelSlug
      : prompt.channelSlugs[(rotationSeed(`${prompt.id}:${index}`) + weekIndex(now)) % prompt.channelSlugs.length] ??
        prompt.channelSlugs[0];

    return {
      id: prompt.id,
      title: prompt.title,
      prompt: prompt.prompt,
      type: prompt.type,
      tier: prompt.tier,
      channelSlug,
      channelName: resolveChannelName(channelSlug)
    };
  });
}

export function rankPostsByMomentum<
  T extends {
    commentCount: number;
    likeCount: number;
    createdAt: string;
  }
>(posts: T[]) {
  return [...posts].sort((left, right) => {
    const rightScore = right.commentCount * 3 + right.likeCount;
    const leftScore = left.commentCount * 3 + left.likeCount;

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function isActivityCurrent(value: ActivityInput, now = new Date(), hours = ACTIVE_NOW_HOURS) {
  const activityAt = normalizeDate(value);

  if (!activityAt) {
    return false;
  }

  return now.getTime() - activityAt.getTime() <= hours * 60 * 60 * 1000;
}

export function countActiveItems<
  T extends {
    lastActivityAt?: string | null;
    createdAt?: string | null;
  }
>(items: T[], now = new Date(), hours = ACTIVE_NOW_HOURS) {
  return items.filter((item) => isActivityCurrent(item.lastActivityAt ?? item.createdAt, now, hours)).length;
}

export function countUniqueContributors<
  T extends {
    user?: {
      id?: string | null;
    } | null;
    userId?: string | null;
  }
>(items: T[]) {
  return new Set(
    items
      .map((item) => item.user?.id ?? item.userId ?? null)
      .filter((value): value is string => Boolean(value))
  ).size;
}

export function getPresenceSignal(value: ActivityInput, now = new Date()) {
  const activityAt = normalizeDate(value);

  if (!activityAt) {
    return {
      label: "Quiet lately",
      tone: "quiet" as const
    };
  }

  const ageInHours = (now.getTime() - activityAt.getTime()) / (60 * 60 * 1000);

  if (ageInHours <= ACTIVE_NOW_HOURS) {
    return {
      label: "Active now",
      tone: "live" as const
    };
  }

  if (ageInHours <= RECENT_ACTIVITY_HOURS) {
    return {
      label: "Recently active",
      tone: "recent" as const
    };
  }

  return {
    label: `Last active ${formatDate(activityAt)}`,
    tone: "quiet" as const
  };
}

export function getFreshnessSignal(
  value: ActivityInput,
  options: FreshnessSignalOptions = {},
  now = new Date()
) {
  const activityAt = normalizeDate(value);

  if (!activityAt) {
    return {
      label: options.emptyLabel ?? "Recently added",
      tone: "quiet" as const
    };
  }

  const ageInHours = (now.getTime() - activityAt.getTime()) / (60 * 60 * 1000);

  if (ageInHours <= 30) {
    return {
      label: options.withinDayLabel ?? "Active today",
      tone: "live" as const
    };
  }

  if (ageInHours <= 24 * 7) {
    return {
      label: options.withinWeekLabel ?? "Updated this week",
      tone: "recent" as const
    };
  }

  return {
    label: `${options.fallbackPrefix ?? "Updated"} ${formatDate(activityAt)}`,
    tone: "quiet" as const
  };
}

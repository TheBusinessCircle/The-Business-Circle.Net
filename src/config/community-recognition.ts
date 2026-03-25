import { ReputationEventType } from "@prisma/client";
import type { CommunityBadgeIcon, CommunityStatusLevel } from "@/types";

export const COMMUNITY_BADGE_DEFINITIONS: Array<{
  slug: string;
  name: string;
  description: string;
  icon: CommunityBadgeIcon;
  priority: number;
}> = [
  {
    slug: "founder",
    name: "Founder",
    description: "Founder of The Business Circle and leader of the private ecosystem.",
    icon: "crown",
    priority: 100
  },
  {
    slug: "founding-core",
    name: "Founding Core",
    description: "One of the original Core members who joined in the founding wave.",
    icon: "shield",
    priority: 95
  },
  {
    slug: "founding-inner-circle",
    name: "Founding Inner Circle",
    description: "One of the original Inner Circle members who joined in the founding wave.",
    icon: "crown",
    priority: 90
  },
  {
    slug: "core",
    name: "Core",
    description: "Core member with the highest level of private access inside The Business Circle.",
    icon: "shield",
    priority: 85
  },
  {
    slug: "inner-circle",
    name: "Inner Circle",
    description: "Premium member with access to Inner Circle strategy, networking, and founder access.",
    icon: "shield",
    priority: 80
  },
  {
    slug: "founding-member",
    name: "Founding Member",
    description: "Joined in the founding wave and secured founding member pricing.",
    icon: "star",
    priority: 70
  },
  {
    slug: "circle-leader",
    name: "Circle Leader",
    description: "Invited 25 members into The Business Circle community.",
    icon: "medal",
    priority: 60
  },
  {
    slug: "community-builder",
    name: "Community Builder",
    description: "Invited 10 members into The Business Circle community.",
    icon: "shield",
    priority: 50
  },
  {
    slug: "connector",
    name: "Connector",
    description: "Invited 3 members into The Business Circle community.",
    icon: "link",
    priority: 40
  },
  {
    slug: "contributor",
    name: "Contributor",
    description: "Earned reputation through helpful contributions and member support.",
    icon: "sparkles",
    priority: 30
  }
];

export const REPUTATION_EVENT_POINTS: Partial<Record<ReputationEventType, number>> = {
  [ReputationEventType.HELPFUL_POST]: 5,
  [ReputationEventType.ANSWER_MARKED_HELPFUL]: 10,
  [ReputationEventType.INVITE_MEMBER]: 20,
  [ReputationEventType.INVITE_INNER_CIRCLE]: 40
};

export const INVITE_BADGE_THRESHOLDS = {
  connector: 3,
  communityBuilder: 10,
  circleLeader: 25
} as const;

export const STATUS_LEVEL_SCORE_THRESHOLDS = {
  contributor: 25,
  communityBuilder: 75,
  circleLeader: 200
} as const;

export const COMMUNITY_STATUS_LEVELS: CommunityStatusLevel[] = [
  "Member",
  "Contributor",
  "Community Builder",
  "Circle Leader",
  "Inner Circle",
  "Core"
];

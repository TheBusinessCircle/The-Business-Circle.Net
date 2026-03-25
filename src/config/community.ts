import { ChannelAccessLevel, MembershipTier } from "@prisma/client";

export type CommunityChannelBlueprint = {
  name: string;
  slug: string;
  description: string;
  topic: string;
  position: number;
  accessTier: MembershipTier;
  accessLevel: ChannelAccessLevel;
  isPrivate: boolean;
  allowAutomatedPrompts?: boolean;
};

export const FOUNDATION_COMMUNITY_CHANNELS: CommunityChannelBlueprint[] = [
  {
    name: "Start Here",
    slug: "introductions",
    description: "Introduce yourself, your business, and what you are building.",
    topic: "Introductions",
    position: 0,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  },
  {
    name: "Business Conversations",
    slug: "general-chat",
    description: "Broader business discussion, decision points, and everyday founder thinking.",
    topic: "Business conversations",
    position: 1,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  },
  {
    name: "Connections / Collaboration",
    slug: "collaboration",
    description: "Partnerships, introductions, referrals, and aligned opportunities.",
    topic: "Connections and collaboration",
    position: 2,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  },
  {
    name: "Wins & Movement",
    slug: "wins-and-progress",
    description: "Momentum updates, progress, and useful lessons from what is working.",
    topic: "Wins and movement",
    position: 3,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  },
  {
    name: "Marketing / Visibility",
    slug: "marketing",
    description: "Positioning, demand, messaging, and visibility work.",
    topic: "Marketing and visibility",
    position: 4,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  },
  {
    name: "Business Support / Operations",
    slug: "business-support",
    description: "Operational questions, systems, delivery, and practical support.",
    topic: "Business support and operations",
    position: 5,
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  }
];

export const INNER_CIRCLE_COMMUNITY_CHANNELS: CommunityChannelBlueprint[] = [
  {
    name: "Inner Circle",
    slug: "inner-circle-chat",
    description: "A more focused room for higher-intent conversation and deeper discussion.",
    topic: "Inner Circle",
    position: 6,
    accessTier: MembershipTier.INNER_CIRCLE,
    accessLevel: ChannelAccessLevel.INNER_CIRCLE,
    isPrivate: true
  },
  {
    name: "Founder Strategy",
    slug: "founder-strategy",
    description: "Higher-level strategic discussion, trade-offs, and decision-led thinking.",
    topic: "Founder strategy",
    position: 7,
    accessTier: MembershipTier.INNER_CIRCLE,
    accessLevel: ChannelAccessLevel.INNER_CIRCLE,
    isPrivate: true
  }
];

export const CORE_COMMUNITY_CHANNELS: CommunityChannelBlueprint[] = [
  {
    name: "Core",
    slug: "premium-discussions",
    description: "The calmest room for higher-level discussion, sharper decisions, and founder proximity.",
    topic: "Core discussion",
    position: 8,
    accessTier: MembershipTier.CORE,
    accessLevel: ChannelAccessLevel.INNER_CIRCLE,
    isPrivate: true
  }
];

export const COMMUNITY_CHANNEL_BLUEPRINTS: CommunityChannelBlueprint[] = [
  ...FOUNDATION_COMMUNITY_CHANNELS,
  ...INNER_CIRCLE_COMMUNITY_CHANNELS,
  ...CORE_COMMUNITY_CHANNELS
];

export const DEFAULT_COMMUNITY_CHANNEL_SLUG = FOUNDATION_COMMUNITY_CHANNELS[0]?.slug ?? "introductions";
export const COMMUNITY_POLL_INTERVAL_MS = 3500;

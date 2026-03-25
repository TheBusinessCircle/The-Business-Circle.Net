import type { MembershipTier, ResourceType } from "@prisma/client";
import { buildCommunityChannelPath } from "@/lib/community-paths";

type ResourceDiscussionLink = {
  title: string;
  description: string;
  href: string;
  label: string;
};

function marketingDiscussion(category: string): ResourceDiscussionLink {
  return {
    title: "Continue this in Marketing / Visibility",
    description:
      `This topic usually sharpens further once it moves into a calmer conversation with other owners working on ${category.toLowerCase()}.`,
    href: buildCommunityChannelPath("marketing"),
    label: "Open marketing discussion"
  };
}

function operationsDiscussion(): ResourceDiscussionLink {
  return {
    title: "Continue this in Business Support / Operations",
    description:
      "Operational and structural resources usually become more useful when the next practical question is worked through with other members.",
    href: buildCommunityChannelPath("business-support"),
    label: "Open operations discussion"
  };
}

function strategyDiscussion(tier: MembershipTier): ResourceDiscussionLink {
  const href =
    tier === "FOUNDATION"
      ? buildCommunityChannelPath("general-chat")
      : buildCommunityChannelPath("founder-strategy");

  return {
    title: "Continue this in strategy discussion",
    description:
      "Take the sharper decision back into discussion so the resource becomes context for a real next move, not just more reading.",
    href,
    label: tier === "FOUNDATION" ? "Open business conversations" : "Open founder strategy"
  };
}

export function getResourceDiscussionLink(input: {
  category: string;
  type: ResourceType;
  membershipTier: MembershipTier;
}): ResourceDiscussionLink {
  const category = input.category.toLowerCase();

  if (
    category.includes("marketing") ||
    category.includes("website") ||
    category.includes("pricing") ||
    category.includes("offer") ||
    category.includes("customer journey")
  ) {
    return marketingDiscussion(input.category);
  }

  if (
    category.includes("systems") ||
    category.includes("structure") ||
    category.includes("fixing") ||
    category.includes("business foundations")
  ) {
    return operationsDiscussion();
  }

  if (input.type === "STRATEGY" || input.type === "CLARITY") {
    return strategyDiscussion(input.membershipTier);
  }

  return {
    title: "Continue this in Business Conversations",
    description:
      "Take the point that stood out most and bring it into the wider community so it can become a better decision or a better question.",
    href: buildCommunityChannelPath("general-chat"),
    label: "Open business conversations"
  };
}

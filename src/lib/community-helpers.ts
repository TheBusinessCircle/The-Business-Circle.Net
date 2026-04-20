import { createElement } from "react";
import { Badge } from "@/components/ui/badge";
import { parseBcnStructuredContent } from "@/lib/bcn-intelligence";
import {
  buildConnectionWinPreview,
  isConnectionWinTags,
} from "@/lib/connection-wins";

export const COMMUNITY_POST_KIND = {
  GENERAL: "GENERAL",
  WIN: "WIN",
  FOUNDER_POST: "FOUNDER_POST",
  AUTO_PROMPT: "AUTO_PROMPT",
} as const;

export type CommunityPostKindValue =
  (typeof COMMUNITY_POST_KIND)[keyof typeof COMMUNITY_POST_KIND];

export function authorName(user: {
  name?: string | null;
  email?: string | null;
}) {
  if (user?.name) return user.name;
  if (user?.email) {
    return user.email.split("@")[0];
  }
  return "Member";
}

export function postKindBadge(
  kind: string,
  tags: string[] = [],
) {
  if (tags.includes("bcn-update")) {
    return createElement(
      Badge,
      {
        variant: "outline",
        className: "border-gold/30 bg-gold/10 text-gold",
      },
      "BCN Signal",
    );
  }

  if (kind === COMMUNITY_POST_KIND.WIN || isConnectionWinTags(tags)) {
    return createElement(
      Badge,
      {
        variant: "outline",
        className: "border-silver/24 bg-silver/10 text-silver",
      },
      "Connection win",
    );
  }

  if (kind === COMMUNITY_POST_KIND.FOUNDER_POST) {
    return createElement(
      Badge,
      {
        variant: "outline",
        className: "border-gold/30 bg-gold/10 text-gold",
      },
      "Founder note",
    );
  }

  if (kind === COMMUNITY_POST_KIND.AUTO_PROMPT) {
    return createElement(
      Badge,
      {
        variant: "outline",
        className: "border-border text-muted",
      },
      "Founder prompt",
    );
  }

  return null;
}

export function buildCommunityPostPreview(
  content: string,
  tags: string[] = [],
) {
  const parsedBcnContent = parseBcnStructuredContent(content);
  if (parsedBcnContent) {
    return parsedBcnContent.articleDetail || parsedBcnContent.whyThisMatters;
  }

  const connectionWinPreview = buildConnectionWinPreview(content, tags);
  if (connectionWinPreview) {
    return connectionWinPreview;
  }

  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 180) {
    return normalized;
  }

  const truncated = normalized.slice(0, 160);
  const lastSpace = truncated.lastIndexOf(" ");

  return `${truncated
    .slice(0, lastSpace > 80 ? lastSpace : truncated.length)
    .trim()}...`;
}

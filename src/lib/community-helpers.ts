import { createElement } from "react";
import { CommunityPostKind } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { buildConnectionWinPreview, isConnectionWinTags } from "@/lib/connection-wins";

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

export function postKindBadge(kind: CommunityPostKind, tags: string[] = []) {
  if (isConnectionWinTags(tags)) {
    return createElement(
      Badge,
      { variant: "outline", className: "border-silver/24 bg-silver/10 text-silver" },
      "Connection win"
    );
  }

  if (kind === CommunityPostKind.FOUNDER_POST) {
    return createElement(
      Badge,
      { variant: "outline", className: "border-gold/30 bg-gold/10 text-gold" },
      "Founder note"
    );
  }

  if (kind === CommunityPostKind.AUTO_PROMPT) {
    return createElement(
      Badge,
      { variant: "outline", className: "border-border text-muted" },
      "Founder prompt"
    );
  }

  return null;
}

export function buildCommunityPostPreview(content: string, tags: string[] = []) {
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
  return `${truncated.slice(0, lastSpace > 80 ? lastSpace : truncated.length).trim()}...`;
}

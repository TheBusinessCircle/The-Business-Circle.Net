"use client";

import { Hash, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import type { CommunityChannelModel } from "@/types";

type CommunityHeaderProps = {
  channel: CommunityChannelModel;
  messageCount: number;
  transportModeLabel: string;
};

export function CommunityHeader({
  channel,
  messageCount,
  transportModeLabel
}: CommunityHeaderProps) {
  return (
    <header className="border-b border-border/70 bg-background/25 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
            <Hash size={14} className="text-muted" />
            {channel.slug}
          </p>
          <p className="mt-1 text-xs text-muted">
            {channel.description || "Business-focused member discussion channel."}
          </p>
          <p className="mt-1 text-[11px] tracking-[0.08em] text-muted uppercase">
            {channel.topic || "Founder Network Channel"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MembershipTierBadge tier={channel.accessTier} />
          <Badge variant="outline" className="text-muted normal-case tracking-normal">
            {messageCount} messages
          </Badge>
          <Badge variant="muted" className="normal-case tracking-normal">
            <Sparkles size={10} className="mr-1" />
            {transportModeLabel}
          </Badge>
        </div>
      </div>
    </header>
  );
}


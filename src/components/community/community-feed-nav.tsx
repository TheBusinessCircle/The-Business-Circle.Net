import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import type { CommunityFeedChannelModel } from "@/types";
import { buildCommunityChannelPath } from "@/lib/community-paths";
import { getCommunityChannelDisplayName } from "@/lib/community/channel-display";
import { cn } from "@/lib/utils";

type CommunityFeedNavProps = {
  channels: CommunityFeedChannelModel[];
  selectedSlug: string;
};

export function CommunityFeedNav({
  channels,
  selectedSlug
}: CommunityFeedNavProps) {
  return (
    <nav className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0" aria-label="Community rooms">
      <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {channels.map((channel) => {
          const isActive = channel.slug === selectedSlug;
          const channelDisplayName = getCommunityChannelDisplayName(channel);

          return (
            <Link
              key={channel.id}
              href={buildCommunityChannelPath(channel.slug)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-gold/35 bg-gold/12 text-gold shadow-gold-soft"
                  : "border-silver/14 bg-background/18 text-muted hover:border-silver/26 hover:text-foreground"
              )}
            >
              <span className="whitespace-nowrap">{channelDisplayName}</span>
              {channel.isPrivate ? <Lock size={13} className="shrink-0" /> : null}
              {channel.isAutomatedFeed ? <Sparkles size={13} className="shrink-0" /> : null}
              {channel.postCount ? (
                <span className="rounded-full bg-background/24 px-2 py-0.5 text-[11px] text-muted">
                  {channel.postCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import Link from "next/link";
import { Lock } from "lucide-react";
import type { CommunityFeedChannelModel } from "@/types";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { buildCommunityChannelPath } from "@/lib/community-paths";
import { cn, formatDate } from "@/lib/utils";

type CommunityFeedNavProps = {
  channels: CommunityFeedChannelModel[];
  selectedSlug: string;
};

export function CommunityFeedNav({
  channels,
  selectedSlug
}: CommunityFeedNavProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-3">
        {channels.map((channel) => {
          const isActive = channel.slug === selectedSlug;

          return (
            <Link
              key={channel.id}
              href={buildCommunityChannelPath(channel.slug)}
              className={cn(
                "group min-w-[240px] rounded-2xl border px-4 py-3 transition-all duration-200",
                isActive
                  ? "border-silver/28 bg-gradient-to-br from-silver/12 via-card/88 to-card/72 shadow-panel-soft"
                  : "border-silver/14 bg-card/55 hover:border-silver/24 hover:bg-card/72"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{channel.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                    {channel.description || channel.topic || "Member discussion area"}
                  </p>
                </div>
                {channel.isPrivate ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-silver/18 bg-silver/10 text-silver">
                    <Lock size={13} />
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <MembershipTierBadge tier={channel.accessTier} className="shrink-0" />
                <span className="text-[11px] text-muted">
                  {channel.postCount} {channel.postCount === 1 ? "post" : "posts"}
                </span>
                {channel.lastActivityAt ? (
                  <span className="text-[11px] text-muted">
                    Active {formatDate(channel.lastActivityAt)}
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

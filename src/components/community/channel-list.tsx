import Link from "next/link";
import { MembershipTier } from "@prisma/client";
import { Crown, Hash, Lock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { CommunityChannelModel } from "@/types";
import { cn } from "@/lib/utils";

type ChannelListProps = {
  channels: CommunityChannelModel[];
  selectedSlug: string;
};

function ChannelLink({
  channel,
  isActive
}: {
  channel: CommunityChannelModel;
  isActive: boolean;
}) {
  return (
    <Link
      href={`/community?channel=${channel.slug}`}
      className={cn(
        "block rounded-xl border px-3 py-2 transition-all duration-200",
        isActive
          ? "border-gold/40 bg-gold/10"
          : "border-border/80 bg-background/30 hover:border-border hover:bg-background/45"
      )}
    >
      <p className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
        <Hash size={13} className="text-muted" />
        {channel.slug}
        {channel.isPrivate ? <Lock size={12} className="text-gold" /> : null}
      </p>
      {channel.description ? <p className="mt-1 text-xs text-muted">{channel.description}</p> : null}
    </Link>
  );
}

export function ChannelList({ channels, selectedSlug }: ChannelListProps) {
  const foundationChannels = channels.filter(
    (channel) => channel.accessTier === MembershipTier.FOUNDATION
  );
  const innerCircleChannels = channels.filter(
    (channel) => channel.accessTier === MembershipTier.INNER_CIRCLE
  );
  const coreChannels = channels.filter(
    (channel) => channel.accessTier === MembershipTier.CORE
  );

  return (
    <aside className="flex h-[76vh] flex-col rounded-3xl border border-border/90 bg-card/75 shadow-panel-soft">
      <div className="border-b border-border/70 px-4 py-3">
        <p className="text-xs tracking-[0.12em] text-muted uppercase">Channels</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <section className="space-y-2">
          <p className="px-1 text-[11px] tracking-[0.1em] text-muted uppercase">Foundation</p>
          {foundationChannels.length ? (
            foundationChannels.map((channel) => (
              <ChannelLink
                key={channel.id}
                channel={channel}
                isActive={channel.slug === selectedSlug}
              />
            ))
          ) : (
            <EmptyState
              title="No Foundation categories"
              description="Foundation categories will appear once configured."
            />
          )}
        </section>

        {innerCircleChannels.length ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] tracking-[0.1em] text-muted uppercase">Inner Circle</p>
              <Badge variant="premium">
                <Crown size={10} className="mr-1" />
                Premium
              </Badge>
            </div>
            {innerCircleChannels.map((channel) => (
              <ChannelLink
                key={channel.id}
                channel={channel}
                isActive={channel.slug === selectedSlug}
              />
            ))}
          </section>
        ) : null}

        {coreChannels.length ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] tracking-[0.1em] text-muted uppercase">Core</p>
              <Badge variant="secondary">
                <ShieldCheck size={10} className="mr-1" />
                Private
              </Badge>
            </div>
            {coreChannels.map((channel) => (
              <ChannelLink
                key={channel.id}
                channel={channel}
                isActive={channel.slug === selectedSlug}
              />
            ))}
          </section>
        ) : null}
      </div>
    </aside>
  );
}



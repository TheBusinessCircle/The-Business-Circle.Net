import { CalendarDays, ExternalLink, MapPin, UserRound, Video } from "lucide-react";
import type { PlatformEventModel } from "@/types";
import { getExternalLinkProps } from "@/lib/links";
import { getTierAccentTextClassName, getTierCardClassName } from "@/lib/tier-styles";
import { cn } from "@/lib/utils";
import { formatEventScheduleWindow } from "@/lib/events";
import { EventTierBadge } from "@/components/events/event-tier-badge";

type EventCardProps = {
  event: PlatformEventModel;
  variant?: "default" | "compact";
  showDescription?: boolean;
  className?: string;
};

export function EventCard({
  event,
  variant = "default",
  showDescription = true,
  className
}: EventCardProps) {
  const isCompact = variant === "compact";
  const tierCardClassName = getTierCardClassName(event.accessTier);
  const tierAccentTextClassName = getTierAccentTextClassName(event.accessTier);
  const scheduleLabel = formatEventScheduleWindow({
    startAt: event.startAt,
    endAt: event.endAt,
    timezone: event.timezone
  });

  return (
    <article
      className={cn(
        "rounded-2xl border p-4 shadow-panel-soft transition-colors",
        tierCardClassName,
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className={cn("font-medium text-foreground", isCompact ? "text-sm" : "text-base")}>
            {event.title}
          </p>
          <p className={cn("inline-flex items-center gap-1 text-xs", tierAccentTextClassName)}>
            <CalendarDays size={12} />
            {scheduleLabel}
          </p>
        </div>
        <EventTierBadge tier={event.accessTier} />
      </div>

      {showDescription && !isCompact && event.description ? (
        <p className="mt-2 line-clamp-3 text-sm text-muted">{event.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
        {event.hostName ? (
          <span className={cn("inline-flex items-center gap-1", tierAccentTextClassName)}>
            <UserRound size={12} />
            Host: {event.hostName}
          </span>
        ) : null}
        {event.location ? (
          <span className={cn("inline-flex items-center gap-1", tierAccentTextClassName)}>
            <MapPin size={12} />
            {event.location}
          </span>
        ) : null}
      </div>

      {event.meetingLink ? (
        <a
          {...getExternalLinkProps(event.meetingLink)}
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline",
            isCompact ? "mt-2" : "mt-3"
          )}
        >
          <Video size={12} />
          Open meeting link
          <ExternalLink size={12} />
        </a>
      ) : null}
    </article>
  );
}

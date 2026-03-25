import type { Metadata } from "next";
import { CalendarCheck2 } from "lucide-react";
import { EventCard, EventTierBadge } from "@/components/events";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { allowedResourceTiers } from "@/lib/db/access";
import { formatEventScheduleWindow } from "@/lib/events";
import { roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { listRecentEventsForTiers, listUpcomingEventsForTiers } from "@/server/events";

export const metadata: Metadata = createPageMetadata({
  title: "Member Events",
  description:
    "Browse upcoming and recent events across The Business Circle Network based on your membership tier.",
  path: "/events"
});

export default async function EventsPage() {
  const session = await requireUser();
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const tiers = allowedResourceTiers(effectiveTier);

  const [upcomingEvents, recentEvents] = await Promise.all([
    listUpcomingEventsForTiers(tiers, { take: 18 }),
    listRecentEventsForTiers(tiers, { take: 8 })
  ]);

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Events</CardTitle>
          <CardDescription>
            Strategic sessions, member calls, and focused networking opportunities available to your tier.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Join live sessions with actionable outcomes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.length ? (
            upcomingEvents.map((event) => <EventCard key={event.id} event={event} />)
          ) : (
            <EmptyState
              icon={CalendarCheck2}
              title="No upcoming events scheduled"
              description="There are no events currently scheduled for your membership access."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recently Completed</CardTitle>
          <CardDescription>Past sessions for context and continuity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentEvents.length ? (
            recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/25 px-3 py-2"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm text-foreground">{event.title}</p>
                  <p className="text-xs text-muted">
                    {formatEventScheduleWindow({
                      startAt: event.startAt,
                      endAt: event.endAt,
                      timezone: event.timezone
                    })}
                  </p>
                  <p className="text-xs text-muted">Host: {event.hostName || "Business Circle Team"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <EventTierBadge tier={event.accessTier} />
                  <Badge variant="outline" className="shrink-0 normal-case tracking-normal">
                    <CalendarCheck2 size={12} className="mr-1" />
                    Completed
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={CalendarCheck2}
              title="No completed events yet"
              description="Completed sessions will appear here for continuity and reference."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

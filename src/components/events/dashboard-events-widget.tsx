import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { PlatformEventModel } from "@/types";
import { EventCard } from "@/components/events/event-card";

type DashboardEventsWidgetProps = {
  events: PlatformEventModel[];
};

export function DashboardEventsWidget({ events }: DashboardEventsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Events</CardTitle>
        <CardDescription>
          Calls, sessions, and networking opportunities on your schedule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length ? (
          <>
            {events.map((event) => (
              <EventCard key={event.id} event={event} variant="compact" showDescription={false} />
            ))}
            <Link href="/events" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Open full events calendar
              <ArrowUpRight size={12} />
            </Link>
          </>
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="No upcoming events yet"
            description="Your tier has no scheduled events right now. Check back soon."
          />
        )}
      </CardContent>
    </Card>
  );
}


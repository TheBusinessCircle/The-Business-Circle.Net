import type { Metadata } from "next";
import Link from "next/link";
import { EventAccessLevel, MembershipTier } from "@prisma/client";
import {
  CalendarClock,
  Crown,
  ExternalLink,
  Globe,
  MapPin,
  MonitorUp,
  Plus,
  Trash2,
  UserRound
} from "lucide-react";
import {
  createEventAction,
  deleteEventAction,
  updateEventAction
} from "@/actions/admin/event.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import { formatEventScheduleWindow } from "@/lib/events";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Events",
  description:
    "Create, edit, and manage member, Inner Circle, and Core events with access-level controls.",
  path: "/admin/events"
});

export const dynamic = "force-dynamic";

const DEFAULT_TIMEZONE = "Europe/London";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function toDateTimeLocalValue(value: Date | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function deliveryModeForEvent(event: { meetingLink: string | null }) {
  return event.meetingLink ? "online" : "offline";
}

function accessLevelLabel(level: EventAccessLevel, tier: MembershipTier) {
  switch (level) {
    case EventAccessLevel.PUBLIC:
      return "Public";
    case EventAccessLevel.MEMBERS:
      return "Members";
    case EventAccessLevel.INNER_CIRCLE:
      return tier === MembershipTier.CORE ? "Core" : "Inner Circle";
    case EventAccessLevel.ADMIN_ONLY:
      return "Admin Only";
    default:
      return level;
  }
}

function accessLevelBadge(level: EventAccessLevel, tier: MembershipTier) {
  if (level === EventAccessLevel.INNER_CIRCLE) {
    return (
      <Badge
        variant="outline"
        className={
          tier === MembershipTier.CORE
            ? "border-silver/35 bg-silver/10 text-foreground"
            : "border-gold/45 bg-gold/15 text-gold"
        }
      >
        <Crown size={11} className="mr-1" />
        {tier === MembershipTier.CORE ? "Core" : "Inner Circle"}
      </Badge>
    );
  }

  if (level === EventAccessLevel.ADMIN_ONLY) {
    return (
      <Badge variant="outline" className="border-red-500/35 bg-red-500/10 text-red-200">
        Admin Only
      </Badge>
    );
  }

  if (level === EventAccessLevel.PUBLIC) {
    return (
      <Badge variant="outline" className="border-sky-500/35 bg-sky-500/10 text-sky-200">
        Public
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-emerald-500/35 bg-emerald-500/10 text-emerald-200">
      Members
    </Badge>
  );
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "event-created": "Event created successfully.",
    "event-updated": "Event updated successfully.",
    "event-deleted": "Event deleted successfully."
  };

  const errorMap: Record<string, string> = {
    invalid: "The event form payload was invalid.",
    "not-found": "That event no longer exists.",
    "invalid-start-date": "Please provide a valid start date and time.",
    "invalid-end-date": "Please provide a valid end date and time.",
    "invalid-range": "End date/time must be later than the start date/time.",
    "invalid-timezone": "Please provide a valid IANA timezone (e.g. Europe/London).",
    "meeting-link-required": "Online events require a valid meeting link.",
    duplicate: "A duplicate unique value prevented this save."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function AdminEventsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;

  const editId = firstValue(params.edit);
  const eventsRaw = await db.event.findMany({
    orderBy: [{ startAt: "asc" }, { createdAt: "desc" }]
  });

  const now = new Date();
  const upcomingEvents = eventsRaw.filter((event) => event.startAt >= now);
  const pastEvents = eventsRaw.filter((event) => event.startAt < now).reverse();
  const events = [...upcomingEvents, ...pastEvents];
  const editingEvent = events.find((event) => event.id === editId) ?? null;

  const upcomingCount = events.filter((event) => event.startAt >= now).length;
  const onlineCount = events.filter((event) => Boolean(event.meetingLink)).length;
  const offlineCount = events.length - onlineCount;
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  const createReturnPath = "/admin/events";
  const editReturnPath = editingEvent ? `/admin/events?edit=${editingEvent.id}` : "/admin/events";

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
                <CalendarClock size={12} className="mr-1" />
                Event Operations
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Admin Event Manager</CardTitle>
              <CardDescription className="mt-2 text-base">
                Schedule high-value sessions for members, Inner Circle cohorts,
                Core members, and private admin operations.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-silver/35 bg-silver/10 text-silver">
                {events.length} total events
              </Badge>
              <Badge variant="outline" className="border-border text-muted">
                {upcomingCount} upcoming
              </Badge>
              <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary">
                {onlineCount} online
              </Badge>
              <Badge variant="outline" className="border-border text-muted">
                {offlineCount} offline
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/40 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-200" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Plus size={16} />
            Create Event
          </CardTitle>
          <CardDescription>
            Configure schedule, host, access level, and delivery mode. Offline
            events can include an optional location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEventAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="returnPath" value={createReturnPath} />

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Event Title</Label>
              <Input id="title" name="title" required placeholder="Founder Strategy Call" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                placeholder="What members will achieve during this event."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hostName">Host</Label>
              <Input id="hostName" name="hostName" placeholder="Business Circle Team" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessLevel">Access Level</Label>
              <Select id="accessLevel" name="accessLevel" defaultValue={EventAccessLevel.MEMBERS}>
                <option value={EventAccessLevel.MEMBERS}>Members</option>
                <option value={EventAccessLevel.INNER_CIRCLE}>Inner Circle</option>
                <option value={EventAccessLevel.PUBLIC}>Public</option>
                <option value={EventAccessLevel.ADMIN_ONLY}>Admin Only</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessTier">Membership Tier</Label>
              <Select id="accessTier" name="accessTier" defaultValue={MembershipTier.FOUNDATION}>
                <option value={MembershipTier.FOUNDATION}>Foundation</option>
                <option value={MembershipTier.INNER_CIRCLE}>Inner Circle</option>
                <option value={MembershipTier.CORE}>Core</option>
              </Select>
              <p className="text-xs text-muted">
                Use Core for private sessions reserved for Core members. Public and member events publish as Foundation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startAt">Start Date & Time</Label>
              <Input id="startAt" name="startAt" type="datetime-local" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endAt">End Date & Time (optional)</Label>
              <Input id="endAt" name="endAt" type="datetime-local" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                name="timezone"
                defaultValue={DEFAULT_TIMEZONE}
                placeholder="Europe/London"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryMode">Delivery Mode</Label>
              <Select id="deliveryMode" name="deliveryMode" defaultValue="online">
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingLink">Meeting Link</Label>
              <Input
                id="meetingLink"
                name="meetingLink"
                placeholder="https://meet.google.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="replayUrl">Replay URL (optional)</Label>
              <Input id="replayUrl" name="replayUrl" placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input id="location" name="location" placeholder="London HQ" />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">
                <Plus size={14} className="mr-1" />
                Create Event
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {editingEvent ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Event</CardTitle>
            <CardDescription>
              Update schedule, host, delivery mode, and tier access for this event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateEventAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="eventId" value={editingEvent.id} />
              <input type="hidden" name="returnPath" value={editReturnPath} />

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-title">Event Title</Label>
                <Input id="edit-title" name="title" defaultValue={editingEvent.title} required />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  rows={3}
                  defaultValue={editingEvent.description ?? ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-host">Host</Label>
                <Input id="edit-host" name="hostName" defaultValue={editingEvent.hostName ?? ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-access-level">Access Level</Label>
                <Select
                  id="edit-access-level"
                  name="accessLevel"
                  defaultValue={editingEvent.accessLevel}
                >
                  <option value={EventAccessLevel.MEMBERS}>Members</option>
                  <option value={EventAccessLevel.INNER_CIRCLE}>Inner Circle</option>
                  <option value={EventAccessLevel.PUBLIC}>Public</option>
                  <option value={EventAccessLevel.ADMIN_ONLY}>Admin Only</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-access-tier">Membership Tier</Label>
                <Select
                  id="edit-access-tier"
                  name="accessTier"
                  defaultValue={editingEvent.accessTier}
                >
                  <option value={MembershipTier.FOUNDATION}>Foundation</option>
                  <option value={MembershipTier.INNER_CIRCLE}>Inner Circle</option>
                  <option value={MembershipTier.CORE}>Core</option>
                </Select>
                <p className="text-xs text-muted">
                  Use Core for private sessions reserved for Core members. Public and member events publish as Foundation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-start">Start Date & Time</Label>
                <Input
                  id="edit-start"
                  name="startAt"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(editingEvent.startAt)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-end">End Date & Time (optional)</Label>
                <Input
                  id="edit-end"
                  name="endAt"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(editingEvent.endAt)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-timezone">Timezone</Label>
                <Input
                  id="edit-timezone"
                  name="timezone"
                  defaultValue={editingEvent.timezone || DEFAULT_TIMEZONE}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-delivery">Delivery Mode</Label>
                <Select
                  id="edit-delivery"
                  name="deliveryMode"
                  defaultValue={deliveryModeForEvent(editingEvent)}
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-meeting-link">Meeting Link</Label>
                <Input
                  id="edit-meeting-link"
                  name="meetingLink"
                  defaultValue={editingEvent.meetingLink ?? ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-replay-url">Replay URL (optional)</Label>
                <Input
                  id="edit-replay-url"
                  name="replayUrl"
                  defaultValue={editingEvent.replayUrl ?? ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location">Location (optional)</Label>
                <Input
                  id="edit-location"
                  name="location"
                  defaultValue={editingEvent.location ?? ""}
                />
              </div>

              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit" variant="outline">
                  Save Changes
                </Button>
                <Link href="/admin/events">
                  <Button type="button" variant="ghost">
                    Cancel Editing
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Event Table</CardTitle>
          <CardDescription>
            Review schedule and delivery details, then open an event for editing
            or delete it directly from the table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Schedule</th>
                  <th className="px-3 py-2 font-medium">Host</th>
                  <th className="px-3 py-2 font-medium">Delivery</th>
                  <th className="px-3 py-2 font-medium">Access</th>
                  <th className="px-3 py-2 font-medium">Location / Link</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.length ? (
                  events.map((event) => (
                    <tr key={event.id} className="border-b border-border/70 align-top">
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{event.title}</p>
                        {event.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted">{event.description}</p>
                        ) : (
                          <p className="mt-1 text-xs text-muted">No description</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {formatEventScheduleWindow({
                          startAt: event.startAt,
                          endAt: event.endAt,
                          timezone: event.timezone
                        })}
                      </td>
                      <td className="px-3 py-3 text-muted">
                        <span className="inline-flex items-center gap-1">
                          <UserRound size={12} />
                          {event.hostName || "Business Circle Team"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {event.meetingLink ? (
                          <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary">
                            <MonitorUp size={11} className="mr-1" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-border text-muted">
                            <MapPin size={11} className="mr-1" />
                            Offline
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          {accessLevelBadge(event.accessLevel, event.accessTier)}
                          <p className="text-xs text-muted">
                            {accessLevelLabel(event.accessLevel, event.accessTier)}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          {event.location ? (
                            <p className="text-xs text-muted">
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={11} />
                                {event.location}
                              </span>
                            </p>
                          ) : (
                            <p className="text-xs text-muted">No location set</p>
                          )}
                          {event.meetingLink ? (
                            <a
                              href={event.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Globe size={11} />
                              Open link
                              <ExternalLink size={11} />
                            </a>
                          ) : null}
                          {event.replayUrl ? (
                            <a
                              href={event.replayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Globe size={11} />
                              Replay
                              <ExternalLink size={11} />
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/events?edit=${event.id}`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <form action={deleteEventAction}>
                            <input type="hidden" name="eventId" value={event.id} />
                            <input type="hidden" name="returnPath" value="/admin/events" />
                            <Button type="submit" variant="danger" size="sm">
                              <Trash2 size={13} className="mr-1" />
                              Delete
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-muted">
                      No events scheduled yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

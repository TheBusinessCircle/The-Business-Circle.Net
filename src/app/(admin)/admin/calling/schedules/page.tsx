import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { createHostedCallRoomAction } from "@/actions/calling/calling.actions";
import {
  cancelScheduledCallRoomAction,
  updateScheduledCallRoomAction
} from "@/actions/admin/calling.actions";
import { AdminCallingSubnav } from "@/components/calling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPageMetadata } from "@/lib/seo";
import { getCallAudienceLabel } from "@/lib/calling";
import { formatDateTime } from "@/lib/utils";
import { listUpcomingCallSchedulesForAdmin } from "@/server/calling";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Calling Schedules",
  description: "Create, update, and cancel scheduled calling sessions.",
  path: "/admin/calling/schedules"
});

function toDateTimeLocalValue(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(params: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "scheduled-room-updated": "The scheduled room has been updated.",
    "scheduled-room-cancelled": "The scheduled room has been cancelled."
  };

  const errorMap: Record<string, string> = {
    "invalid-scheduled-room": "The scheduled room form was invalid.",
    "call-room-create-failed": "The scheduled room could not be created."
  };

  if (params.notice && noticeMap[params.notice]) {
    return { type: "notice" as const, message: noticeMap[params.notice] };
  }

  if (params.error && errorMap[params.error]) {
    return { type: "error" as const, message: errorMap[params.error] };
  }

  return null;
}

export default async function AdminCallingSchedulesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const schedules = await listUpcomingCallSchedulesForAdmin(20);
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div>
            <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
              <CalendarDays size={12} className="mr-1" />
              Scheduled Sessions
            </Badge>
            <CardTitle className="mt-3 font-display text-3xl">Schedule Manager</CardTitle>
            <CardDescription className="mt-2 text-base">
              Create founder-led sessions, edit upcoming rooms, and cancel rooms that should no longer run.
            </CardDescription>
          </div>

          <AdminCallingSubnav />
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
          <CardTitle>Create founder/admin session</CardTitle>
          <CardDescription>Use the same internal room creation flow the platform uses elsewhere.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createHostedCallRoomAction} className="space-y-4">
            <input type="hidden" name="returnPath" value="/admin/calling/schedules" />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="schedule-title">Room title</Label>
                <Input id="schedule-title" name="title" placeholder="Core strategic briefing" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-cap">Participant cap</Label>
                <Input id="schedule-cap" name="maxParticipants" type="number" min={2} max={100} defaultValue={30} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-description">Description</Label>
              <Textarea id="schedule-description" name="description" placeholder="Session context, outcomes, and what members should prepare." />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="schedule-audience">Audience</Label>
                <Select id="schedule-audience" name="audienceScope" defaultValue="INNER_CIRCLE">
                  <option value="FOUNDATION">Foundation and above</option>
                  <option value="INNER_CIRCLE">Inner Circle and above</option>
                  <option value="CORE">Core only</option>
                  <option value="CUSTOM">Custom tier list</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-start">Start time</Label>
                <Input id="schedule-start" name="startsAt" type="datetime-local" required />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="schedule-end">Optional end time</Label>
                <Input id="schedule-end" name="endsAt" type="datetime-local" />
              </div>
              <div className="space-y-2">
                <Label>Custom audience tiers</Label>
                <div className="flex flex-wrap gap-4 rounded-2xl border border-border/80 bg-background/25 p-4 text-sm text-muted">
                  {[
                    { label: "Foundation", value: "FOUNDATION" },
                    { label: "Inner Circle", value: "INNER_CIRCLE" },
                    { label: "Core", value: "CORE" }
                  ].map((tier) => (
                    <label key={`create-${tier.value}`} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="customTierVisibility"
                        value={tier.value}
                        className="h-4 w-4 rounded border-border bg-background/40"
                      />
                      {tier.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="isRecorded" className="h-4 w-4 rounded border-border bg-background/40" />
              Mark as future recording-enabled session shell
            </label>

            <Button type="submit">Create scheduled session</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming scheduled rooms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedules.length ? (
            schedules.map((schedule) => (
              <Card key={schedule.id} className="border-border/80 bg-background/20">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{schedule.title}</CardTitle>
                      <CardDescription>
                        {formatDateTime(schedule.startsAt)} | {getCallAudienceLabel(schedule.tierVisibility, schedule.customTierVisibility)}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{schedule.room?.status ?? "SCHEDULED"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={updateScheduledCallRoomAction} className="space-y-4">
                    <input type="hidden" name="roomId" value={schedule.room?.id ?? ""} />
                    <input type="hidden" name="returnPath" value="/admin/calling/schedules" />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`schedule-room-title-${schedule.id}`}>Title</Label>
                        <Input
                          id={`schedule-room-title-${schedule.id}`}
                          name="title"
                          defaultValue={schedule.title}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`schedule-room-cap-${schedule.id}`}>Max participants</Label>
                        <Input
                          id={`schedule-room-cap-${schedule.id}`}
                          name="maxParticipants"
                          type="number"
                          min={2}
                          max={100}
                          defaultValue={schedule.room?.maxParticipants ?? 10}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`schedule-room-description-${schedule.id}`}>Description</Label>
                      <Textarea
                        id={`schedule-room-description-${schedule.id}`}
                        name="description"
                        defaultValue={schedule.description ?? ""}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`schedule-room-audience-${schedule.id}`}>Audience</Label>
                        <Select
                          id={`schedule-room-audience-${schedule.id}`}
                          name="audienceScope"
                          defaultValue={schedule.tierVisibility}
                        >
                          <option value="FOUNDATION">Foundation and above</option>
                          <option value="INNER_CIRCLE">Inner Circle and above</option>
                          <option value="CORE">Core only</option>
                          <option value="CUSTOM">Custom tier list</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`schedule-room-start-${schedule.id}`}>Start</Label>
                        <Input
                          id={`schedule-room-start-${schedule.id}`}
                          name="startsAt"
                          type="datetime-local"
                          defaultValue={toDateTimeLocalValue(schedule.startsAt)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`schedule-room-end-${schedule.id}`}>End</Label>
                        <Input
                          id={`schedule-room-end-${schedule.id}`}
                          name="endsAt"
                          type="datetime-local"
                          defaultValue={schedule.endsAt ? toDateTimeLocalValue(schedule.endsAt) : ""}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 rounded-2xl border border-border/80 bg-background/25 p-4 text-sm text-muted">
                      {[
                        { label: "Foundation", value: "FOUNDATION" },
                        { label: "Inner Circle", value: "INNER_CIRCLE" },
                        { label: "Core", value: "CORE" }
                      ].map((tier) => (
                        <label key={`${schedule.id}-${tier.value}`} className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="customTierVisibility"
                            value={tier.value}
                            defaultChecked={schedule.customTierVisibility.includes(tier.value as "FOUNDATION" | "INNER_CIRCLE" | "CORE")}
                            className="h-4 w-4 rounded border-border bg-background/40"
                          />
                          {tier.label}
                        </label>
                      ))}
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        name="isRecorded"
                        defaultChecked={schedule.room?.isRecorded ?? false}
                        className="h-4 w-4 rounded border-border bg-background/40"
                      />
                      Mark as recording-enabled room shell
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <Button type="submit">Update schedule</Button>
                      <Button formAction={cancelScheduledCallRoomAction} variant="outline" type="submit">
                        Cancel room
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted">No scheduled rooms are currently queued.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

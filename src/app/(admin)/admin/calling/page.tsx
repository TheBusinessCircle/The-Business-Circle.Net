import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Radio, ShieldCheck, Video } from "lucide-react";
import { endAdminCallRoomAction } from "@/actions/admin/calling.actions";
import { AdminCallingSubnav } from "@/components/calling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCallAudienceLabel,
  getCallRoomStatusLabel,
  getCallRoomTypeLabel
} from "@/lib/calling";
import { createPageMetadata } from "@/lib/seo";
import { formatDateTime } from "@/lib/utils";
import {
  ensureRealtimeSystemConfig,
  listAdminCallRooms,
  listUpcomingCallSchedulesForAdmin
} from "@/server/calling";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Calling",
  description: "Realtime overview and calling controls for The Business Circle.",
  path: "/admin/calling"
});

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(params: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "call-room-ended": "The call room has been ended.",
    "host-request-approved": "The host access request has been approved.",
    "calling-config-updated": "Realtime config has been updated."
  };

  const errorMap: Record<string, string> = {
    "call-room-ended": "",
    "call-room-missing": "The selected room was missing.",
    "invalid-calling-config": "The realtime config form was invalid."
  };

  if (params.notice && noticeMap[params.notice]) {
    return { type: "notice" as const, message: noticeMap[params.notice] };
  }

  if (params.error && errorMap[params.error]) {
    return { type: "error" as const, message: errorMap[params.error] };
  }

  return null;
}

export default async function AdminCallingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [config, rooms, schedules] = await Promise.all([
    ensureRealtimeSystemConfig(),
    listAdminCallRooms(),
    listUpcomingCallSchedulesForAdmin(8)
  ]);
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
                <Video size={12} className="mr-1" />
                Calling Operations
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Realtime Overview</CardTitle>
              <CardDescription className="mt-2 text-base">
                Active rooms, scheduled sessions, host controls, and emergency toggles for the internal calling system.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="muted" className="normal-case tracking-normal">
                <Activity size={12} className="mr-1" />
                {rooms.length} active or scheduled rooms
              </Badge>
              <Badge variant="outline" className="normal-case tracking-normal text-silver">
                <Radio size={12} className="mr-1" />
                Member hosting {config.memberHostedGroupCallsEnabled ? "enabled" : "restricted"}
              </Badge>
            </div>
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

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>System state</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p className="inline-flex items-center gap-2">
              <ShieldCheck size={15} className="text-gold" />
              Global calling: {config.globalCallingEnabled ? "enabled" : "disabled"}
            </p>
            <p>Emergency shutdown: {config.emergencyShutdownEnabled ? "on" : "off"}</p>
            <p>Default member host cap: {config.defaultHostParticipantCap}</p>
            <p>Founder room default cap: {config.founderRoomDefaultCap}</p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming schedule</CardTitle>
            <CardDescription>Founder and approved-host sessions currently in the system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedules.length ? (
              schedules.map((schedule) => (
                <div key={schedule.id} className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{schedule.title}</p>
                      <p className="text-xs text-muted">{formatDateTime(schedule.startsAt)}</p>
                    </div>
                    <Badge variant="outline">
                      {getCallAudienceLabel(schedule.tierVisibility, schedule.customTierVisibility)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No upcoming sessions are currently scheduled.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active rooms</CardTitle>
          <CardDescription>
            Founder sessions are visible alongside approved-host rooms with current participant counts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rooms.length ? (
            rooms.map((room) => (
              <div key={room.id} className="rounded-2xl border border-border/80 bg-background/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-foreground">{room.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {getCallRoomTypeLabel(room.type)} | {getCallAudienceLabel(room.tierVisibility, room.customTierVisibility)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Host: {room.hostUser.name || room.hostUser.email} | Participants live: {room.liveParticipantCount}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{getCallRoomStatusLabel(room.status)}</Badge>
                    <Link href={`/calls/${room.id}`}>
                      <Button variant="outline">Open Room</Button>
                    </Link>
                    <form action={endAdminCallRoomAction}>
                      <input type="hidden" name="roomId" value={room.id} />
                      <input type="hidden" name="returnPath" value="/admin/calling" />
                      <Button type="submit">End Room</Button>
                    </form>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">No active or scheduled rooms are currently registered.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

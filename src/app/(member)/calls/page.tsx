import type { Metadata } from "next";
import Link from "next/link";
import { PhoneCall, Radio, ShieldCheck, Users, Video } from "lucide-react";
import {
  createHostedCallRoomAction,
  endHostedCallRoomAction,
  requestGroupHostAccessAction
} from "@/actions/calling/calling.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatTierVisibility,
  getCallAudienceLabel,
  getCallRoomStatusLabel,
  getCallRoomTypeLabel,
  getHostLevelLabel
} from "@/lib/calling";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import {
  canUserHostGroupCalls,
  canUserRequestGroupHostAccess,
  ensureRealtimeSystemConfig,
  listUserGroupHostAccessRequests,
  listVisibleCallRoomsForUser
} from "@/server/calling";
import { toCallingUser } from "@/server/calling/session";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Member Calls",
  description:
    "Start secure 1 to 1 Business Circle calls, join scheduled premium sessions, and manage approved hosted rooms.",
  path: "/calls"
});

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(params: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "host-request-sent": "Your host access request has been sent to the admin queue.",
    "call-room-ended": "The room has been ended.",
    "call-room-created": "The room has been created."
  };

  const errorMap: Record<string, string> = {
    "host-request-pending": "You already have a pending host access request.",
    "host-request-failed": "Unable to submit the host access request right now.",
    "call-room-create-failed": "Unable to create that call room right now.",
    "call-room-end-failed": "Unable to end that room right now.",
    "invalid-call-room": "Some room details were missing or invalid.",
    "call-room-access-denied": "You are not currently allowed to access that room.",
    "call-room-missing": "That room could not be found."
  };

  if (params.notice && noticeMap[params.notice]) {
    return { type: "notice" as const, message: noticeMap[params.notice] };
  }

  if (params.error && errorMap[params.error]) {
    return { type: "error" as const, message: errorMap[params.error] };
  }

  return null;
}

export default async function CallsPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const params = await searchParams;
  const actor = toCallingUser(session.user);
  const [config, hostAuth, requestAuth, rooms, hostRequests] = await Promise.all([
    ensureRealtimeSystemConfig(),
    canUserHostGroupCalls(actor),
    canUserRequestGroupHostAccess(actor),
    listVisibleCallRoomsForUser(actor),
    listUserGroupHostAccessRequests(actor.id)
  ]);

  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const liveRooms = rooms.filter((room) => room.status === "LIVE");
  const scheduledRooms = rooms.filter(
    (room) => room.status === "SCHEDULED" || (room.startsAt ? room.startsAt.getTime() > Date.now() : false)
  );

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
                <Video size={12} className="mr-1" />
                Internal Calling
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Member Calling Suite</CardTitle>
              <CardDescription className="mt-2 text-base">
                Start private 1 to 1 rooms, join scheduled Business Circle sessions, and keep
                group hosting tightly controlled.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="muted" className="normal-case tracking-normal">
                <PhoneCall size={12} className="mr-1" />
                1 to 1 calling for paid members
              </Badge>
              <Badge variant="outline" className="normal-case tracking-normal text-silver">
                <Radio size={12} className="mr-1" />
                Member-hosted groups {config.memberHostedGroupCallsEnabled ? "enabled" : "restricted"}
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

      {!config.globalCallingEnabled || config.emergencyShutdownEnabled ? (
        <Card className="border-red-500/40 bg-red-500/10">
          <CardContent className="py-4">
            <p className="text-sm text-red-200">
              Calling is currently disabled platform-wide. 1 to 1 and group rooms are temporarily unavailable.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1 to 1 calls</CardTitle>
              <CardDescription>
                Start direct private rooms from the member directory or from a member profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted">
              <p>
                Direct rooms are built into the platform for all paid members and stay completely
                separate from the existing community messaging flow.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/directory">
                  <Button>Open Directory</Button>
                </Link>
                <Link href="/profile">
                  <Button variant="outline">Open Profile</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {hostAuth.allowed ? "Create a group room" : "Controlled group hosting"}
              </CardTitle>
              <CardDescription>
                Founder rooms and approved host rooms use the same internal calling stack, but
                every cap and audience rule is still enforced server-side.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {hostAuth.allowed ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.08em] text-gold">Host level</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{getHostLevelLabel(hostAuth.hostLevel)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.08em] text-muted">Participant cap</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{hostAuth.maxParticipants}</p>
                    </div>
                    <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.08em] text-muted">Allowed audience</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formatTierVisibility(hostAuth.allowedTierVisibility)}
                      </p>
                    </div>
                  </div>

                  <form action={createHostedCallRoomAction} className="space-y-4">
                    <input type="hidden" name="returnPath" value="/calls" />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="call-title">Room title</Label>
                        <Input id="call-title" name="title" placeholder="Weekly strategy room" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="call-max-participants">Participant cap</Label>
                        <Input
                          id="call-max-participants"
                          name="maxParticipants"
                          type="number"
                          min={2}
                          max={hostAuth.maxParticipants}
                          defaultValue={Math.min(hostAuth.maxParticipants, actor.role === "ADMIN" ? config.founderRoomDefaultCap : hostAuth.maxParticipants)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="call-description">Description</Label>
                      <Textarea
                        id="call-description"
                        name="description"
                        placeholder="Set the topic, intent, and what members should bring into the room."
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="call-audience-scope">Audience</Label>
                        <Select id="call-audience-scope" name="audienceScope" defaultValue="FOUNDATION">
                          <option value="FOUNDATION">Foundation and above</option>
                          <option value="INNER_CIRCLE">Inner Circle and above</option>
                          <option value="CORE">Core only</option>
                          <option value="CUSTOM">Custom tier list</option>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="call-starts-at">Start time</Label>
                        <Input id="call-starts-at" name="startsAt" type="datetime-local" />
                        <p className="text-xs text-muted">Leave empty for an instant room.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="call-ends-at">Optional end time</Label>
                        <Input id="call-ends-at" name="endsAt" type="datetime-local" />
                      </div>

                      <div className="space-y-2">
                        <Label>Custom audience tiers</Label>
                        <div className="grid gap-2 rounded-2xl border border-border/80 bg-background/25 p-4 text-sm text-muted">
                          {[
                            { label: "Foundation", value: "FOUNDATION" },
                            { label: "Inner Circle", value: "INNER_CIRCLE" },
                            { label: "Core", value: "CORE" }
                          ].map((tier) => (
                            <label key={tier.value} className="inline-flex items-center gap-2">
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
                      Mark as future recording-enabled room shell
                    </label>

                    <Button type="submit">
                      {actor.role === "ADMIN" ? "Create Founder Room" : "Create Approved Host Room"}
                    </Button>
                  </form>
                </>
              ) : requestAuth.allowed ? (
                <form action={requestGroupHostAccessAction} className="space-y-4">
                  <input type="hidden" name="returnPath" value="/calls" />
                  <div className="rounded-2xl border border-border/80 bg-background/25 p-4 text-sm text-muted">
                    Higher-tier members can request limited hosting access. Admin still decides host
                    level, participant cap, concurrency, and audience visibility.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="host-request-message">Why do you want hosting access?</Label>
                    <Textarea
                      id="host-request-message"
                      name="message"
                      placeholder="Share the kind of room you want to host, who it is for, and the value it should create."
                    />
                  </div>
                  <Button type="submit">Request Group Host Access</Button>
                </form>
              ) : (
                <div className="rounded-2xl border border-border/80 bg-background/25 p-4 text-sm text-muted">
                  Group hosting remains controlled. Foundation members can join eligible rooms and use 1 to 1 calling,
                  while Inner Circle and Core members can request approval when hosting access is being opened up.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent host requests</CardTitle>
              <CardDescription>Your most recent group-host access status updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {hostRequests.length ? (
                hostRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{request.status.replaceAll("_", " ")}</p>
                      <p className="text-xs text-muted">{formatDateTime(request.requestedAt)}</p>
                    </div>
                    {request.reviewNotes ? (
                      <p className="mt-2 text-sm text-muted">{request.reviewNotes}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">No host access requests submitted yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guardrails</CardTitle>
              <CardDescription>Controlled v1 rules on the current VPS deployment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted">
              <p>Founder and admin rooms keep higher default caps and stronger operational control.</p>
              <p>Member-hosted group rooms can be disabled globally at any time.</p>
              <p>Join tokens are issued server-side only after membership and room access checks pass.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <ShieldCheck size={18} />
              Live Rooms
            </CardTitle>
            <CardDescription>Rooms you can join right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveRooms.length ? (
              liveRooms.map((room) => (
                <div key={room.id} className="rounded-2xl border border-border/80 bg-background/25 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{room.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {getCallRoomTypeLabel(room.type)} | {getCallAudienceLabel(room.tierVisibility, room.customTierVisibility)}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                      {getCallRoomStatusLabel(room.status)}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/calls/${room.id}`}>
                      <Button>Join Room</Button>
                    </Link>
                    {room.hostUserId === actor.id || actor.role === "ADMIN" ? (
                      <form action={endHostedCallRoomAction}>
                        <input type="hidden" name="roomId" value={room.id} />
                        <input type="hidden" name="returnPath" value="/calls" />
                        <Button type="submit" variant="outline">
                          End Room
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No live rooms are visible to you right now.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Users size={18} />
              Scheduled Rooms
            </CardTitle>
            <CardDescription>Upcoming sessions you are eligible to join.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheduledRooms.length ? (
              scheduledRooms.map((room) => (
                <div key={room.id} className="rounded-2xl border border-border/80 bg-background/25 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{room.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {room.startsAt ? formatDateTime(room.startsAt) : "Time to be confirmed"}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {getCallAudienceLabel(room.tierVisibility, room.customTierVisibility)}
                      </p>
                    </div>
                    <Badge variant="outline">{getCallRoomStatusLabel(room.status)}</Badge>
                  </div>
                  <div className="mt-4">
                    <Link href={`/calls/${room.id}`}>
                      <Button variant="outline">Open Room</Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No scheduled rooms are visible to you yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

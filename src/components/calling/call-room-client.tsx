"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ConnectionState,
  type Participant,
  Room,
  RoomEvent,
  type Track
} from "livekit-client";
import {
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCcw,
  Video,
  VideoOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";

type ParticipantDirectoryItem = {
  userId: string;
  name: string;
  role: string;
};

type CallRoomClientProps = {
  roomId: string;
  title: string;
  description?: string | null;
  audienceLabel: string;
  roomTypeLabel: string;
  startsAt?: string | null;
  maxParticipants: number;
  hostUserId: string;
  hostName: string;
  participantDirectory: ParticipantDirectoryItem[];
  canJoinNow: boolean;
};

type ParticipantSnapshot = {
  identity: string;
  userId: string;
  name: string;
  role: string;
  isLocal: boolean;
  isSpeaking: boolean;
  videoTrack: Track | null;
  audioTrack: Track | null;
};

function trackForKind(participant: Participant, kind: "audio" | "video") {
  for (const publication of participant.trackPublications.values()) {
    const track = publication.track;

    if (track?.kind === kind) {
      return track;
    }
  }

  return null;
}

function identityToUserId(identity: string) {
  return identity.startsWith("member:") ? identity.slice("member:".length) : identity;
}

function getConnectionLabel(connectionState: ConnectionState) {
  if (connectionState === ConnectionState.Connected) {
    return "Connected";
  }

  if (connectionState === ConnectionState.Connecting) {
    return "Connecting";
  }

  if (connectionState === ConnectionState.Reconnecting) {
    return "Reconnecting";
  }

  return "Waiting";
}

function MediaTrackView({
  track,
  kind,
  muted = false
}: {
  track: Track | null;
  kind: "audio" | "video";
  muted?: boolean;
}) {
  const ref = useRef<HTMLMediaElement | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element || !track) {
      return;
    }

    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);

  if (!track) {
    return null;
  }

  if (kind === "audio") {
    return <audio ref={ref as React.RefObject<HTMLAudioElement>} autoPlay playsInline muted={muted} />;
  }

  return (
    <video
      ref={ref as React.RefObject<HTMLVideoElement>}
      autoPlay
      playsInline
      muted={muted}
      className="h-full w-full object-cover"
    />
  );
}

export function CallRoomClient({
  roomId,
  title,
  description,
  audienceLabel,
  roomTypeLabel,
  startsAt,
  maxParticipants,
  hostUserId,
  hostName,
  participantDirectory,
  canJoinNow
}: CallRoomClientProps) {
  const router = useRouter();
  const [roomState, setRoomState] = useState<Room | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [isJoining, startJoinTransition] = useTransition();
  const [isLeaving, startLeaveTransition] = useTransition();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const roomRef = useRef<Room | null>(null);

  const participantDirectoryByUserId = useMemo(
    () =>
      new Map(
        participantDirectory.map((participant) => [
          participant.userId,
          participant
        ])
      ),
    [participantDirectory]
  );

  const participantSnapshots = useMemo(() => {
    if (!roomState) {
      return [] as ParticipantSnapshot[];
    }

    const participants: Participant[] = [
      roomState.localParticipant,
      ...Array.from(roomState.remoteParticipants.values())
    ];

    return participants.map((participant) => {
      const userId = identityToUserId(participant.identity);
      const directoryEntry = participantDirectoryByUserId.get(userId);

      return {
        identity: participant.identity,
        userId,
        name: participant.name || directoryEntry?.name || "Business Circle Member",
        role: directoryEntry?.role || (userId === hostUserId ? "HOST" : "MEMBER"),
        isLocal: participant.identity === roomState.localParticipant.identity,
        isSpeaking: participant.isSpeaking,
        videoTrack: trackForKind(participant, "video"),
        audioTrack: trackForKind(participant, "audio")
      };
    });
  }, [hostUserId, participantDirectoryByUserId, roomState]);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
    };
  }, []);

  const connectToRoom = () => {
    setJoinError(null);

    startJoinTransition(async () => {
      try {
        const response = await fetch(`/api/calls/${roomId}/token`, {
          method: "POST"
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          token?: string;
          url?: string;
          rtcConfig?: {
            iceServers?: RTCIceServer[];
          } | null;
        };

        if (!response.ok || !payload.token || !payload.url) {
          setJoinError(payload.error ?? "Unable to join the room.");
          return;
        }

        const nextRoom = new Room({
          adaptiveStream: true,
          dynacast: true
        });

        const syncState = () => {
          setRoomState(nextRoom);
          setConnectionState(nextRoom.state);
          setMicEnabled(nextRoom.localParticipant.isMicrophoneEnabled);
          setCameraEnabled(nextRoom.localParticipant.isCameraEnabled);
        };

        nextRoom
          .on(RoomEvent.ConnectionStateChanged, (state) => {
            setConnectionState(state);
            syncState();
          })
          .on(RoomEvent.ParticipantConnected, syncState)
          .on(RoomEvent.ParticipantDisconnected, syncState)
          .on(RoomEvent.TrackSubscribed, syncState)
          .on(RoomEvent.TrackUnsubscribed, syncState)
          .on(RoomEvent.LocalTrackPublished, syncState)
          .on(RoomEvent.LocalTrackUnpublished, syncState)
          .on(RoomEvent.ActiveSpeakersChanged, syncState)
          .on(RoomEvent.Reconnected, syncState)
          .on(RoomEvent.Reconnecting, syncState)
          .on(RoomEvent.Disconnected, syncState);

        await nextRoom.connect(payload.url, payload.token, payload.rtcConfig?.iceServers?.length
          ? {
              rtcConfig: {
                iceServers: payload.rtcConfig.iceServers
              }
            }
          : undefined);
        await nextRoom.localParticipant.setCameraEnabled(true);
        await nextRoom.localParticipant.setMicrophoneEnabled(true);

        roomRef.current = nextRoom;
        syncState();
      } catch (error) {
        setJoinError(error instanceof Error ? error.message : "Unable to join the room.");
      }
    });
  };

  const leaveRoom = () => {
    startLeaveTransition(async () => {
      try {
        await fetch(`/api/calls/${roomId}/presence`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            state: "LEFT"
          })
        });
      } catch {}

      roomRef.current?.disconnect();
      roomRef.current = null;
      setRoomState(null);
      setConnectionState(ConnectionState.Disconnected);
      router.push("/calls");
      router.refresh();
    });
  };

  const toggleMicrophone = () => {
    if (!roomRef.current) {
      return;
    }

    void roomRef.current.localParticipant
      .setMicrophoneEnabled(!micEnabled)
      .then(() => setMicEnabled(roomRef.current?.localParticipant.isMicrophoneEnabled ?? false));
  };

  const toggleCamera = () => {
    if (!roomRef.current) {
      return;
    }

    void roomRef.current.localParticipant
      .setCameraEnabled(!cameraEnabled)
      .then(() => setCameraEnabled(roomRef.current?.localParticipant.isCameraEnabled ?? false));
  };

  const gridClassName =
    participantSnapshots.length <= 1
      ? "md:grid-cols-1"
      : participantSnapshots.length === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="space-y-6">
      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                  {roomTypeLabel}
                </Badge>
                <Badge variant="outline" className="border-border/80 bg-background/30 text-silver">
                  {audienceLabel}
                </Badge>
                <Badge variant="outline" className="border-border/80 bg-background/30 text-silver">
                  Max {maxParticipants}
                </Badge>
              </div>
              <CardTitle className="mt-3 text-3xl">{title}</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                {description || `Hosted by ${hostName}.`}
              </CardDescription>
            </div>

            <div className="space-y-2 rounded-2xl border border-border/80 bg-background/25 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted">Connection</p>
              <p className="text-sm font-medium text-foreground">{getConnectionLabel(connectionState)}</p>
              {startsAt ? (
                <p className="text-xs text-muted">Starts {formatDateTime(startsAt)}</p>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      {!roomState ? (
        <Card>
          <CardHeader>
            <CardTitle>Join the room</CardTitle>
            <CardDescription>
              Camera and microphone are enabled after you join. If the room is scheduled for later,
              the host can still enter first while members wait for the room to open.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button type="button" size="lg" disabled={isJoining || !canJoinNow} onClick={connectToRoom}>
              {isJoining ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Video size={16} className="mr-2" />}
              {canJoinNow ? "Join Call Room" : "Waiting For Host"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/calls")}>
              Back To Calls
            </Button>
            {joinError ? <p className="text-sm text-destructive">{joinError}</p> : null}
            {!canJoinNow && startsAt ? (
              <p className="text-sm text-muted">
                This room opens for members at {formatDateTime(startsAt)}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Room view</CardTitle>
            <CardDescription>
              Participant media is rendered directly inside the platform using your internal calling stack.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn("grid gap-4", gridClassName)}>
              {participantSnapshots.length ? (
                participantSnapshots.map((participant) => (
                  <div
                    key={participant.identity}
                    className="relative overflow-hidden rounded-3xl border border-border/80 bg-background/30"
                  >
                    <div className="aspect-video bg-background/60">
                      {participant.videoTrack ? (
                        <MediaTrackView
                          track={participant.videoTrack}
                          kind="video"
                          muted={participant.isLocal}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-background via-card to-background/70">
                          <div className="rounded-full border border-gold/25 bg-gold/10 px-6 py-6 text-2xl font-semibold text-gold">
                            {participant.name.slice(0, 1).toUpperCase()}
                          </div>
                        </div>
                      )}
                      <MediaTrackView
                        track={participant.audioTrack}
                        kind="audio"
                        muted={participant.isLocal}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-background/40 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{participant.name}</p>
                        <p className="text-xs text-muted">
                          {participant.role}
                          {participant.isLocal ? " | You" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {participant.userId === hostUserId ? (
                          <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                            Host
                          </Badge>
                        ) : null}
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            participant.isSpeaking ? "bg-gold shadow-[0_0_0_6px_rgba(214,180,103,0.18)]" : "bg-silver/30"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-border/80 bg-background/25 p-10 text-center text-sm text-muted">
                  Join the room to start rendering participant media.
                </div>
              )}
            </div>

            {roomState ? (
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={toggleMicrophone}>
                  {micEnabled ? <Mic size={16} className="mr-2" /> : <MicOff size={16} className="mr-2" />}
                  {micEnabled ? "Mute Mic" : "Unmute Mic"}
                </Button>
                <Button type="button" variant="outline" onClick={toggleCamera}>
                  {cameraEnabled ? <Video size={16} className="mr-2" /> : <VideoOff size={16} className="mr-2" />}
                  {cameraEnabled ? "Camera Off" : "Camera On"}
                </Button>
                <Button type="button" variant="danger" onClick={leaveRoom} disabled={isLeaving}>
                  {isLeaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <PhoneOff size={16} className="mr-2" />}
                  Leave Call
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.refresh()}>
                  <RefreshCcw size={16} className="mr-2" />
                  Refresh Room
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Participant list</CardTitle>
              <CardDescription>Hosts and members currently visible in the room.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {participantSnapshots.length ? (
                participantSnapshots.map((participant) => (
                  <div
                    key={`${participant.identity}-list`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/25 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{participant.name}</p>
                      <p className="text-xs text-muted">
                        {participant.role}
                        {participant.isLocal ? " | You" : ""}
                      </p>
                    </div>
                    {participant.userId === hostUserId ? (
                      <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                        Host
                      </Badge>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">No participants are connected yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Room controls</CardTitle>
              <CardDescription>
                Built for v1 growth: private 1 to 1 rooms, controlled group access, and clean upgrade paths later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted">
              <p>Screen share, moderation, recording, and room chat can be layered into this room shell later.</p>
              <p>Participant caps and join rules are still enforced server-side before tokens are issued.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

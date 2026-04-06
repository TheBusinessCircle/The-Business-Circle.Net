"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ConnectionState,
  type Participant,
  Room,
  RoomEvent,
  Track
} from "livekit-client";
import {
  AlertCircle,
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
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
  isCameraEnabled: boolean;
  isMicrophoneEnabled: boolean;
  videoTrack: Track | null;
  audioTrack: Track | null;
};

type MediaAccessState = "idle" | "granted" | "denied";

const CONNECTION_ERROR_COPY = "Unable to start the call right now. Please try again in a moment.";
const DEVICE_FALLBACK_COPY =
  "Camera or microphone access is currently unavailable. You can still join and enable devices when ready, if supported.";
const DEVICE_PERMISSION_DENIED_COPY =
  "Camera or microphone access was denied. Allow access in your browser site settings, then retry preview or join without devices for now.";
const DEVICE_NOT_FOUND_COPY =
  "A camera or microphone could not be found for this device. You can still join and enable devices later if they become available.";
const DEVICE_IN_USE_COPY =
  "Your camera or microphone is currently busy in another app or browser tab. Close the other app, then try preview again.";
const DEVICE_SECURE_CONTEXT_COPY =
  "Camera and microphone preview needs a secure page context. Use HTTPS or localhost, then try again.";

function stopMediaStream(stream: MediaStream | null) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
}

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

  if (
    connectionState === ConnectionState.Reconnecting ||
    connectionState === ConnectionState.SignalReconnecting
  ) {
    return "Reconnecting";
  }

  return "Disconnected";
}

function getPreviewConnectionLabel(input: { canJoinNow: boolean; isPreparingPreview: boolean }) {
  if (input.isPreparingPreview) {
    return "Preparing preview";
  }

  return input.canJoinNow ? "Ready to join" : "Waiting for host";
}

function getParticipantRoleLabel(role: string) {
  if (role === "HOST") {
    return "Host";
  }

  if (role === "ADMIN") {
    return "Admin";
  }

  if (role === "MEMBER") {
    return "Member";
  }

  return role;
}

function buildLiveKitVideoCaptureOptions(deviceId?: string) {
  return {
    deviceId: deviceId ? { ideal: deviceId } : undefined,
    frameRate: { ideal: 30, max: 30 },
    resolution: {
      width: 1280,
      height: 720,
      frameRate: 30
    }
  };
}

function buildLiveKitAudioCaptureOptions(deviceId?: string) {
  return {
    deviceId: deviceId ? { ideal: deviceId } : undefined,
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true
  };
}

function buildPreviewVideoConstraints(deviceId?: string): MediaTrackConstraints {
  return {
    deviceId: deviceId ? { ideal: deviceId } : undefined,
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 }
  };
}

function buildPreviewAudioConstraints(deviceId?: string): MediaTrackConstraints {
  return {
    deviceId: deviceId ? { ideal: deviceId } : undefined,
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true
  };
}

function resolvePreferredDeviceId(
  currentValue: string,
  devices: MediaDeviceInfo[],
  activeDeviceId?: string
) {
  if (currentValue && devices.some((device) => device.deviceId === currentValue)) {
    return currentValue;
  }

  if (activeDeviceId && devices.some((device) => device.deviceId === activeDeviceId)) {
    return activeDeviceId;
  }

  return devices[0]?.deviceId ?? "";
}

function formatDeviceLabel(device: MediaDeviceInfo, fallbackPrefix: string, index: number) {
  return device.label || `${fallbackPrefix} ${index + 1}`;
}

function isBlockedByPermissionsPolicy(feature: "camera" | "microphone") {
  if (typeof document === "undefined") {
    return false;
  }

  const documentWithPolicy = document as Document & {
    permissionsPolicy?: { allowsFeature?: (value: string) => boolean };
    featurePolicy?: { allowsFeature?: (value: string) => boolean };
  };
  const policy =
    documentWithPolicy.permissionsPolicy ?? documentWithPolicy.featurePolicy;

  if (!policy?.allowsFeature) {
    return false;
  }

  try {
    return !policy.allowsFeature(feature);
  } catch {
    return false;
  }
}

function getMediaPolicyBlockReason() {
  const blockedFeatures = ["camera", "microphone"].filter((feature) =>
    isBlockedByPermissionsPolicy(feature as "camera" | "microphone")
  );

  return blockedFeatures.length ? blockedFeatures.join(",") : null;
}

function getPreviewErrorCopy(error: unknown) {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return DEVICE_SECURE_CONTEXT_COPY;
  }

  if (getMediaPolicyBlockReason()) {
    return "Camera and microphone are currently blocked by the page security policy. Refresh the page and try again.";
  }

  if (error instanceof Error && error.message === "media-blocked-by-permissions-policy") {
    return "Camera and microphone are currently blocked by the page security policy. Refresh the page and try again.";
  }

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return DEVICE_PERMISSION_DENIED_COPY;
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return DEVICE_NOT_FOUND_COPY;
    }

    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return DEVICE_IN_USE_COPY;
    }
  }

  if (error instanceof Error && error.message === "media-preview-not-supported") {
    return DEVICE_FALLBACK_COPY;
  }

  return DEVICE_FALLBACK_COPY;
}

function getJoinFailureCopy(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "Failed to fetch") {
      return "Unable to reach the call service right now. Please try again in a moment.";
    }

    return error.message || CONNECTION_ERROR_COPY;
  }

  return CONNECTION_ERROR_COPY;
}

function isPermissionDeniedError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")
  );
}

function setPreviewTrackEnabled(
  stream: MediaStream | null,
  kind: "audio" | "video",
  enabled: boolean
) {
  if (!stream) {
    return false;
  }

  const tracks =
    kind === "video" ? stream.getVideoTracks() : stream.getAudioTracks();

  if (!tracks.length) {
    return false;
  }

  tracks.forEach((track) => {
    track.enabled = enabled;
  });

  return true;
}

function stopTracksExcept(stream: MediaStream | null, keepTracks: Set<MediaStreamTrack>) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => {
    if (!keepTracks.has(track)) {
      track.stop();
    }
  });
}

async function requestPreviewStream(input: {
  cameraId?: string;
  microphoneId?: string;
}) {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    throw new Error("media-preview-not-supported");
  }

  if (getMediaPolicyBlockReason()) {
    throw new Error("media-blocked-by-permissions-policy");
  }

  const videoConstraints = buildPreviewVideoConstraints(input.cameraId);
  const audioConstraints = buildPreviewAudioConstraints(input.microphoneId);

  try {
    return {
      stream: await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints
      }),
      partialFailure: false
    };
  } catch (error) {
    const partialStream = new MediaStream();

    try {
      const videoOnly = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });
      videoOnly.getVideoTracks().forEach((track) => partialStream.addTrack(track));
    } catch {}

    try {
      const audioOnly = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: audioConstraints
      });
      audioOnly.getAudioTracks().forEach((track) => partialStream.addTrack(track));
    } catch {}

    if (partialStream.getTracks().length > 0) {
      return {
        stream: partialStream,
        partialFailure: true
      };
    }

    throw error;
  }
}

function MediaTrackView({
  track,
  kind,
  muted = false,
  mirrored = false
}: {
  track: Track | null;
  kind: "audio" | "video";
  muted?: boolean;
  mirrored?: boolean;
}) {
  const ref = useRef<HTMLMediaElement | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element || !track) {
      return;
    }

    track.attach(element);
    void element.play().catch(() => undefined);
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
      className={cn("h-full w-full object-cover", mirrored ? "[transform:scaleX(-1)]" : undefined)}
    />
  );
}

function PreviewStreamView({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    element.srcObject = stream;
    void element.play().catch(() => undefined);

    return () => {
      element.srcObject = null;
    };
  }, [stream]);

  if (!stream?.getVideoTracks().length) {
    return null;
  }

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className="h-full w-full object-cover [transform:scaleX(-1)]"
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
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [isJoining, startJoinTransition] = useTransition();
  const [isLeaving, startLeaveTransition] = useTransition();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [deviceNotice, setDeviceNotice] = useState<string | null>(null);
  const [mediaAccessState, setMediaAccessState] = useState<MediaAccessState>("idle");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState("");
  const [previewAudioLevel, setPreviewAudioLevel] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const previewRequestIdRef = useRef(0);
  const cameraEnabledRef = useRef(cameraEnabled);
  const micEnabledRef = useRef(micEnabled);
  const lastPreviewWarningRef = useRef<string | null>(null);
  const supportsMediaPreview =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices) &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  const participantDirectoryByUserId = useMemo(
    () =>
      new Map(
        participantDirectory.map((participant) => [participant.userId, participant])
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
        isCameraEnabled: participant.isCameraEnabled,
        isMicrophoneEnabled: participant.isMicrophoneEnabled,
        videoTrack: trackForKind(participant, "video"),
        audioTrack: trackForKind(participant, "audio")
      };
    });
  }, [hostUserId, participantDirectoryByUserId, roomState]);

  const isDirectRoom = roomTypeLabel.toLowerCase() === "1 to 1 call";
  const hasGrantedMediaAccess = mediaAccessState === "granted";
  const remoteParticipantCount = roomState?.remoteParticipants.size ?? 0;
  const waitingForParticipant =
    Boolean(roomState) && connectionState === ConnectionState.Connected && remoteParticipantCount === 0;
  const isReconnecting =
    connectionState === ConnectionState.Reconnecting ||
    connectionState === ConnectionState.SignalReconnecting;
  const connectionLabel = roomState
    ? getConnectionLabel(connectionState)
    : getPreviewConnectionLabel({ canJoinNow, isPreparingPreview });
  const previewActionLabel = !hasGrantedMediaAccess
    ? mediaAccessState === "denied"
      ? "Retry Camera & Mic Access"
      : "Allow Camera & Mic"
    : "Refresh Preview";

  const syncRoomFromInstance = useCallback((room: Room) => {
    setRoomState(room);
    setConnectionState(room.state);
    setMicEnabled(room.localParticipant.isMicrophoneEnabled);
    setCameraEnabled(room.localParticipant.isCameraEnabled);
  }, []);

  const clearPreviewReference = useCallback(() => {
    previewStreamRef.current = null;
    setPreviewStream(null);
    setPreviewAudioLevel(0);
  }, []);

  const releasePreview = useCallback(() => {
    stopMediaStream(previewStreamRef.current);
    clearPreviewReference();
  }, [clearPreviewReference]);

  const syncPreviewTrackStates = useCallback(
    (stream: MediaStream | null) => {
      if (!stream) {
        return;
      }

      stream.getVideoTracks().forEach((track) => {
        track.enabled = cameraEnabledRef.current;
      });

      stream.getAudioTracks().forEach((track) => {
        track.enabled = micEnabledRef.current;
      });
    },
    []
  );

  const syncAvailableDevices = useCallback(async (activeStream?: MediaStream | null) => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.enumerateDevices !== "function"
    ) {
      return;
    }

    const hasDeviceAccess =
      mediaAccessState === "granted" || Boolean(activeStream?.getTracks().length);

    if (!hasDeviceAccess) {
      setAvailableCameras([]);
      setAvailableMicrophones([]);
      setSelectedCameraId("");
      setSelectedMicrophoneId("");
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const microphones = devices.filter((device) => device.kind === "audioinput");
    const activeCameraId = activeStream?.getVideoTracks()[0]?.getSettings().deviceId;
    const activeMicrophoneId = activeStream?.getAudioTracks()[0]?.getSettings().deviceId;

    setAvailableCameras(cameras);
    setAvailableMicrophones(microphones);
    setSelectedCameraId((current) =>
      resolvePreferredDeviceId(current, cameras, activeCameraId)
    );
    setSelectedMicrophoneId((current) =>
      resolvePreferredDeviceId(current, microphones, activeMicrophoneId)
    );
  }, [mediaAccessState]);

  const updatePresence = useCallback(
    async (state: "JOINED" | "LEFT", keepalive = false) => {
      await fetch(`/api/calls/${roomId}/presence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ state }),
        keepalive
      });
    },
    [roomId]
  );

  const applyPreferredDevicesToRoom = useCallback(
    async (room: Room, previewStream: MediaStream | null) => {
      const publishedTracks = new Set<MediaStreamTrack>();
      const publishActions: Promise<unknown>[] = [];
      const previewVideoTrack = previewStream?.getVideoTracks()[0];
      const previewAudioTrack = previewStream?.getAudioTracks()[0];

      if (cameraEnabled) {
        if (previewVideoTrack) {
          publishActions.push(
            room.localParticipant
              .publishTrack(previewVideoTrack, { source: Track.Source.Camera })
              .then(() => {
                publishedTracks.add(previewVideoTrack);
              })
          );
        } else {
          publishActions.push(
            room.localParticipant.setCameraEnabled(
              true,
              buildLiveKitVideoCaptureOptions(selectedCameraId)
            )
          );
        }
      } else {
        publishActions.push(room.localParticipant.setCameraEnabled(false));
      }

      if (micEnabled) {
        if (previewAudioTrack) {
          publishActions.push(
            room.localParticipant
              .publishTrack(previewAudioTrack, { source: Track.Source.Microphone })
              .then(() => {
                publishedTracks.add(previewAudioTrack);
              })
          );
        } else {
          publishActions.push(
            room.localParticipant.setMicrophoneEnabled(
              true,
              buildLiveKitAudioCaptureOptions(selectedMicrophoneId)
            )
          );
        }
      } else {
        publishActions.push(room.localParticipant.setMicrophoneEnabled(false));
      }

      const publishResults = await Promise.allSettled(publishActions);

      const failed = publishResults.some((result) => result.status === "rejected");

      stopTracksExcept(previewStream, publishedTracks);
      clearPreviewReference();
      setDeviceNotice(failed ? DEVICE_FALLBACK_COPY : null);
      syncRoomFromInstance(room);

      const hasActiveLocalMedia =
        Boolean(previewStream?.getTracks().length) ||
        room.localParticipant.isCameraEnabled ||
        room.localParticipant.isMicrophoneEnabled;

      if (hasActiveLocalMedia) {
        setMediaAccessState("granted");
        await syncAvailableDevices(previewStream);
      }

      if (failed && process.env.NODE_ENV !== "production") {
        console.error("[calling] local-media-enable-failed", {
          roomId,
          cameraEnabled,
          micEnabled
        });
      }
    },
    [
      cameraEnabled,
      clearPreviewReference,
      micEnabled,
      roomId,
      selectedCameraId,
      selectedMicrophoneId,
      syncAvailableDevices,
      syncRoomFromInstance
    ]
  );

  const refreshPreview = useCallback(async () => {
    if (roomRef.current) {
      return;
    }

    if (!supportsMediaPreview) {
      setIsPreparingPreview(false);
      setDeviceNotice(DEVICE_FALLBACK_COPY);
      return;
    }

    const requestId = ++previewRequestIdRef.current;
    const previousPreviewStream = previewStreamRef.current;
    const activeVideoTrack = previousPreviewStream?.getVideoTracks()[0];
    const activeAudioTrack = previousPreviewStream?.getAudioTracks()[0];
    const activeVideoDeviceId = activeVideoTrack?.getSettings().deviceId;
    const activeAudioDeviceId = activeAudioTrack?.getSettings().deviceId;
    const needsVideoRefresh =
      cameraEnabledRef.current &&
      (!activeVideoTrack ||
        Boolean(selectedCameraId && activeVideoDeviceId && selectedCameraId !== activeVideoDeviceId));
    const needsAudioRefresh =
      micEnabledRef.current &&
      (!activeAudioTrack ||
        Boolean(
          selectedMicrophoneId &&
            activeAudioDeviceId &&
            selectedMicrophoneId !== activeAudioDeviceId
        ));

    if (previousPreviewStream && !needsVideoRefresh && !needsAudioRefresh) {
      setMediaAccessState("granted");
      syncPreviewTrackStates(previousPreviewStream);
      setIsPreparingPreview(false);
      return;
    }

    setIsPreparingPreview(true);
    setDeviceNotice(null);

    try {
      const result = await requestPreviewStream({
        cameraId: selectedCameraId || undefined,
        microphoneId: selectedMicrophoneId || undefined
      });

      if (previewRequestIdRef.current !== requestId || roomRef.current) {
        stopMediaStream(result.stream);
        return;
      }

      syncPreviewTrackStates(result.stream);
      stopMediaStream(previewStreamRef.current);
      previewStreamRef.current = result.stream;
      setPreviewStream(result.stream);
      setMediaAccessState("granted");
      setDeviceNotice(result.partialFailure ? DEVICE_FALLBACK_COPY : null);
      await syncAvailableDevices(result.stream);
    } catch (error) {
      if (previewRequestIdRef.current !== requestId) {
        return;
      }

      if (!previousPreviewStream) {
        releasePreview();
      } else {
        syncPreviewTrackStates(previousPreviewStream);
      }

      if (isPermissionDeniedError(error)) {
        setMediaAccessState("denied");
      }

      setDeviceNotice(getPreviewErrorCopy(error));
      await syncAvailableDevices();

      if (process.env.NODE_ENV !== "production") {
        const warningCode = error instanceof Error ? error.message : "unknown";

        if (lastPreviewWarningRef.current !== warningCode) {
          lastPreviewWarningRef.current = warningCode;
          console.warn("[calling] preview-media-failed", {
            roomId,
            error: warningCode
          });
        }
      }
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setIsPreparingPreview(false);
      }
    }
  }, [
    releasePreview,
    roomId,
    selectedCameraId,
    selectedMicrophoneId,
    supportsMediaPreview,
    syncAvailableDevices,
    syncPreviewTrackStates
  ]);

  useEffect(() => {
    cameraEnabledRef.current = cameraEnabled;
  }, [cameraEnabled]);

  useEffect(() => {
    micEnabledRef.current = micEnabled;
  }, [micEnabled]);

  useEffect(() => {
    if (!hasGrantedMediaAccess) {
      void syncAvailableDevices();
      return;
    }

    void syncAvailableDevices(previewStreamRef.current);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.addEventListener !== "function"
    ) {
      return;
    }

    const handleDeviceChange = () => {
      void syncAvailableDevices(previewStreamRef.current);
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [hasGrantedMediaAccess, syncAvailableDevices]);

  useEffect(() => {
    if (roomState) {
      setIsPreparingPreview(false);
    }

    return () => {
      previewRequestIdRef.current += 1;
    };
  }, [roomState]);

  useEffect(() => {
    if (roomState || previewStream || isPreparingPreview || !hasGrantedMediaAccess) {
      return;
    }

    if (getMediaPolicyBlockReason()) {
      return;
    }

    const retryPreviewIfNeeded = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }

      if (!roomRef.current && !previewStreamRef.current) {
        void refreshPreview();
      }
    };

    window.addEventListener("focus", retryPreviewIfNeeded);
    document.addEventListener("visibilitychange", retryPreviewIfNeeded);

    return () => {
      window.removeEventListener("focus", retryPreviewIfNeeded);
      document.removeEventListener("visibilitychange", retryPreviewIfNeeded);
    };
  }, [hasGrantedMediaAccess, isPreparingPreview, previewStream, refreshPreview, roomState]);

  useEffect(() => {
    syncPreviewTrackStates(previewStream);
  }, [cameraEnabled, micEnabled, previewStream, syncPreviewTrackStates]);

  useEffect(() => {
    if (!previewStream?.getAudioTracks().length || typeof window === "undefined") {
      setPreviewAudioLevel(0);
      return;
    }

    const AudioContextCtor =
      typeof window.AudioContext !== "undefined"
        ? window.AudioContext
        : (
            window as Window &
              typeof globalThis & {
                webkitAudioContext?: typeof AudioContext;
              }
          ).webkitAudioContext;

    if (!AudioContextCtor) {
      setPreviewAudioLevel(0);
      return;
    }

    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(previewStream);
    const samples = new Uint8Array(analyser.fftSize);
    let animationFrameId = 0;

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);
    void audioContext.resume().catch(() => undefined);

    const updateLevel = () => {
      analyser.getByteTimeDomainData(samples);

      let total = 0;

      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        total += normalized * normalized;
      }

      const rootMeanSquare = Math.sqrt(total / samples.length);
      setPreviewAudioLevel(Math.min(1, rootMeanSquare * 4.5));
      animationFrameId = window.requestAnimationFrame(updateLevel);
    };

    animationFrameId = window.requestAnimationFrame(updateLevel);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      source.disconnect();
      analyser.disconnect();
      void audioContext.close().catch(() => undefined);
      setPreviewAudioLevel(0);
    };
  }, [previewStream]);

  useEffect(() => {
    return () => {
      const activeRoom = roomRef.current;
      roomRef.current = null;

      if (activeRoom) {
        void updatePresence("LEFT", true).catch(() => undefined);
        void activeRoom.disconnect();
      }

      releasePreview();
    };
  }, [releasePreview, updatePresence]);

  const connectToRoom = () => {
    setJoinError(null);
 
    startJoinTransition(async () => {
      let nextRoom: Room | null = null;

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
          setJoinError(payload.error ?? CONNECTION_ERROR_COPY);
          return;
        }

        const roomInstance = new Room({
          adaptiveStream: true,
          dynacast: true
        });
        nextRoom = roomInstance;

        const syncState = () => {
          if (roomRef.current !== roomInstance) {
            return;
          }

          syncRoomFromInstance(roomInstance);
        };

        roomInstance
          .on(RoomEvent.ConnectionStateChanged, syncState)
          .on(RoomEvent.ParticipantConnected, syncState)
          .on(RoomEvent.ParticipantDisconnected, syncState)
          .on(RoomEvent.TrackSubscribed, syncState)
          .on(RoomEvent.TrackUnsubscribed, syncState)
          .on(RoomEvent.TrackMuted, syncState)
          .on(RoomEvent.TrackUnmuted, syncState)
          .on(RoomEvent.LocalTrackPublished, syncState)
          .on(RoomEvent.LocalTrackUnpublished, syncState)
          .on(RoomEvent.ActiveSpeakersChanged, syncState)
          .on(RoomEvent.Reconnected, syncState)
          .on(RoomEvent.Reconnecting, syncState)
          .on(RoomEvent.Disconnected, syncState);

        await roomInstance.prepareConnection(payload.url, payload.token).catch(() => undefined);
        await roomInstance.connect(
          payload.url,
          payload.token,
          payload.rtcConfig?.iceServers?.length
            ? {
                rtcConfig: {
                  iceServers: payload.rtcConfig.iceServers
                }
              }
            : undefined
        );

        roomRef.current = roomInstance;
        syncRoomFromInstance(roomInstance);
        setJoinError(null);

        await roomInstance.startAudio().catch(() => undefined);
        await Promise.allSettled([
          updatePresence("JOINED"),
          applyPreferredDevicesToRoom(roomInstance, previewStreamRef.current)
        ]);
      } catch (error) {
        if (nextRoom) {
          await nextRoom.disconnect().catch(() => undefined);
        }

        roomRef.current = null;
        setRoomState(null);
        setConnectionState(ConnectionState.Disconnected);
        setJoinError(getJoinFailureCopy(error));

        if (process.env.NODE_ENV !== "production") {
          console.error("[calling] room-connect-failed", {
            roomId,
            error: error instanceof Error ? error.message : "unknown",
            stack: error instanceof Error ? error.stack : undefined
          });
        }
      }
    });
  };

  const toggleMicrophone = () => {
    const activeRoom = roomRef.current;

    if (!activeRoom) {
      const nextValue = !micEnabled;
      micEnabledRef.current = nextValue;
      setMicEnabled(nextValue);

      const updated = setPreviewTrackEnabled(previewStreamRef.current, "audio", nextValue);
      if (updated || !nextValue) {
        setDeviceNotice(null);
      } else {
        void refreshPreview();
      }

      return;
    }

    const nextValue = !micEnabled;

    void activeRoom.localParticipant
      .setMicrophoneEnabled(
        nextValue,
        nextValue ? buildLiveKitAudioCaptureOptions(selectedMicrophoneId) : undefined
      )
      .then(async () => {
        if (nextValue) {
          setMediaAccessState("granted");
          await syncAvailableDevices();
        }

        setDeviceNotice(null);
        syncRoomFromInstance(activeRoom);
      })
      .catch(() => {
        setDeviceNotice(DEVICE_FALLBACK_COPY);
      });
  };

  const toggleCamera = () => {
    const activeRoom = roomRef.current;

    if (!activeRoom) {
      const nextValue = !cameraEnabled;
      cameraEnabledRef.current = nextValue;
      setCameraEnabled(nextValue);

      const updated = setPreviewTrackEnabled(previewStreamRef.current, "video", nextValue);
      if (updated || !nextValue) {
        setDeviceNotice(null);
      } else {
        void refreshPreview();
      }

      return;
    }

    const nextValue = !cameraEnabled;

    void activeRoom.localParticipant
      .setCameraEnabled(
        nextValue,
        nextValue ? buildLiveKitVideoCaptureOptions(selectedCameraId) : undefined
      )
      .then(async () => {
        if (nextValue) {
          setMediaAccessState("granted");
          await syncAvailableDevices();
        }

        setDeviceNotice(null);
        syncRoomFromInstance(activeRoom);
      })
      .catch(() => {
        setDeviceNotice(DEVICE_FALLBACK_COPY);
      });
  };

  const leaveRoom = () => {
    const activeRoom = roomRef.current;

    startLeaveTransition(async () => {
      roomRef.current = null;

      await Promise.allSettled([
        updatePresence("LEFT"),
        activeRoom ? activeRoom.disconnect() : Promise.resolve()
      ]);

      setRoomState(null);
      setConnectionState(ConnectionState.Disconnected);
      setJoinError(null);
      setDeviceNotice(null);
      router.push("/calls");
      router.refresh();
    });
  };

  const handleCameraDeviceChange = (deviceId: string) => {
    setSelectedCameraId(deviceId);

    if (roomRef.current && deviceId) {
      void roomRef.current
        .switchActiveDevice("videoinput", deviceId)
        .then(() => {
          setDeviceNotice(null);
          syncRoomFromInstance(roomRef.current as Room);
        })
        .catch(() => {
          setDeviceNotice(DEVICE_FALLBACK_COPY);
        });
    }
  };

  const handleMicrophoneDeviceChange = (deviceId: string) => {
    setSelectedMicrophoneId(deviceId);

    if (roomRef.current && deviceId) {
      void roomRef.current
        .switchActiveDevice("audioinput", deviceId)
        .then(() => {
          setDeviceNotice(null);
          syncRoomFromInstance(roomRef.current as Room);
        })
        .catch(() => {
          setDeviceNotice(DEVICE_FALLBACK_COPY);
        });
    }
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
                {isDirectRoom ? (
                  <Badge
                    variant="outline"
                    className="border-border/80 bg-background/30 text-silver"
                  >
                    Private 1 to 1 room
                  </Badge>
                ) : null}
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
              <p className="text-sm font-medium text-foreground">{connectionLabel}</p>
              {startsAt ? (
                <p className="text-xs text-muted">Starts {formatDateTime(startsAt)}</p>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      {!roomState ? (
        <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-background via-card/85 to-background/70">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle>Prepare to join</CardTitle>
                <CardDescription className="max-w-2xl">
                  Check your camera, microphone, and devices before entering the room.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                {canJoinNow ? "Room ready" : "Waiting for host"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-background/30">
                <div className="aspect-video bg-background/60">
                  {previewStream?.getVideoTracks().length ? (
                    <PreviewStreamView stream={previewStream} />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-background via-card to-background/70 px-6 text-center">
                      <div className="space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold">
                          {cameraEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {cameraEnabled
                              ? hasGrantedMediaAccess
                                ? "Camera preview is not available yet."
                                : "Allow camera and microphone access to start your preview."
                              : "Camera is off for this join."}
                          </p>
                          <p className="text-sm text-muted">
                            {cameraEnabled
                              ? hasGrantedMediaAccess
                                ? "You can still join and enable devices as soon as permissions are ready."
                                : "We will list your available devices after access is granted."
                              : "You can enter the room with audio only and enable video later."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isPreparingPreview ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-4 py-2 text-sm text-foreground">
                        <Loader2 size={15} className="animate-spin" />
                        Preparing local preview
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-background/45 px-4 py-3">
                  <Badge variant="outline" className="border-border/80 bg-background/30 text-silver">
                    {cameraEnabled ? (
                      <Video size={13} className="mr-1.5" />
                    ) : (
                      <VideoOff size={13} className="mr-1.5" />
                    )}
                    {cameraEnabled ? "Camera on" : "Camera off"}
                  </Badge>
                  <Badge variant="outline" className="border-border/80 bg-background/30 text-silver">
                    {micEnabled ? (
                      <Mic size={13} className="mr-1.5" />
                    ) : (
                      <MicOff size={13} className="mr-1.5" />
                    )}
                    {micEnabled ? "Mic on" : "Mic muted"}
                  </Badge>
                  <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/30 px-3 py-1.5 text-xs text-silver">
                    <span>Mic level</span>
                    <span className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => {
                        const threshold = (index + 1) / 5;

                        return (
                          <span
                            key={`preview-level-${index}`}
                            className={cn(
                              "h-2 w-1.5 rounded-full bg-silver/25 transition-colors",
                              previewAudioLevel >= threshold ? "bg-gold" : undefined
                            )}
                          />
                        );
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {deviceNotice ? (
                <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-muted">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <span className="inline-flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 shrink-0 text-gold" />
                      <span>{deviceNotice}</span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void refreshPreview()}
                      disabled={isPreparingPreview || isJoining}
                    >
                      {isPreparingPreview ? (
                        <Loader2 size={14} className="mr-2 animate-spin" />
                      ) : (
                        <RefreshCcw size={14} className="mr-2" />
                      )}
                      {previewActionLabel}
                    </Button>
                  </div>
                </div>
              ) : null}

              {!canJoinNow && startsAt ? (
                <div className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-muted">
                  This room opens for members at {formatDateTime(startsAt)}.
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-border/80 bg-background/25 p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Room context</p>
                <p className="mt-3 text-lg font-medium text-foreground">{title}</p>
                <p className="mt-2 text-sm text-muted">
                  {isDirectRoom
                    ? "This is a private 1 to 1 room. You can enter first and wait inside for the other participant."
                    : "You can join the room as soon as you are ready and wait inside if others have not arrived yet."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={cameraEnabled ? "outline" : "ghost"}
                  aria-pressed={cameraEnabled}
                  onClick={toggleCamera}
                  disabled={isJoining}
                >
                  {cameraEnabled ? (
                    <Video size={16} className="mr-2" />
                  ) : (
                    <VideoOff size={16} className="mr-2" />
                  )}
                  {cameraEnabled ? "Camera on" : "Camera off"}
                </Button>
                <Button
                  type="button"
                  variant={micEnabled ? "outline" : "ghost"}
                  aria-pressed={micEnabled}
                  onClick={toggleMicrophone}
                  disabled={isJoining}
                >
                  {micEnabled ? (
                    <Mic size={16} className="mr-2" />
                  ) : (
                    <MicOff size={16} className="mr-2" />
                  )}
                  {micEnabled ? "Mic on" : "Mic muted"}
                </Button>
              </div>

              <div className="space-y-4 rounded-3xl border border-border/80 bg-background/25 p-5">
                <div className="space-y-2">
                  <Label htmlFor="call-camera-device">Camera device</Label>
                  <Select
                    id="call-camera-device"
                    value={selectedCameraId}
                    onChange={(event) => handleCameraDeviceChange(event.target.value)}
                    disabled={!hasGrantedMediaAccess || !availableCameras.length || isJoining}
                  >
                    {hasGrantedMediaAccess ? (
                      availableCameras.length ? null : <option value="">No camera detected</option>
                    ) : (
                      <option value="">Allow camera access to list devices</option>
                    )}
                    {availableCameras.map((device, index) => (
                      <option key={device.deviceId || `${device.kind}-${index}`} value={device.deviceId}>
                        {formatDeviceLabel(device, "Camera", index)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="call-mic-device">Microphone device</Label>
                  <Select
                    id="call-mic-device"
                    value={selectedMicrophoneId}
                    onChange={(event) => handleMicrophoneDeviceChange(event.target.value)}
                    disabled={!hasGrantedMediaAccess || !availableMicrophones.length || isJoining}
                  >
                    {hasGrantedMediaAccess ? (
                      availableMicrophones.length ? null : (
                        <option value="">No microphone detected</option>
                      )
                    ) : (
                      <option value="">Allow microphone access to list devices</option>
                    )}
                    {availableMicrophones.map((device, index) => (
                      <option key={device.deviceId || `${device.kind}-${index}`} value={device.deviceId}>
                        {formatDeviceLabel(device, "Microphone", index)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {joinError ? (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {joinError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {!previewStream ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void refreshPreview()}
                    disabled={isPreparingPreview || isJoining}
                  >
                    {isPreparingPreview ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <RefreshCcw size={16} className="mr-2" />
                    )}
                    {previewActionLabel}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="lg"
                  disabled={isJoining || !canJoinNow}
                  onClick={connectToRoom}
                >
                  {isJoining ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Video size={16} className="mr-2" />
                  )}
                  {canJoinNow ? "Join Call Room" : "Waiting For Host"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/calls")}
                  disabled={isJoining}
                >
                  Back To Calls
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {isReconnecting ? (
            <Card className="border-gold/25 bg-gold/8">
              <CardContent className="flex items-center gap-3 py-4 text-sm text-muted">
                <Loader2 size={16} className="animate-spin text-gold" />
                <span>
                  Reconnecting to the room. Your media will resume automatically when the link
                  stabilises.
                </span>
              </CardContent>
            </Card>
          ) : null}

          {waitingForParticipant ? (
            <Card className="border-gold/25 bg-gold/8">
              <CardContent className="py-4">
                <p className="text-sm font-medium text-foreground">
                  Waiting for the other participant to join.
                </p>
                <p className="mt-1 text-sm text-muted">
                  You are already in the room and will connect as soon as they enter.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {deviceNotice ? (
            <Card className="border-border/80 bg-background/25">
              <CardContent className="py-4 text-sm text-muted">
                <span className="inline-flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-gold" />
                  <span>{deviceNotice}</span>
                </span>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Room view</CardTitle>
                <CardDescription>
                  Participant media is rendered directly inside the platform using your internal
                  calling stack.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={cn("grid gap-4", gridClassName)}>
                  {participantSnapshots.map((participant) => (
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
                            mirrored={participant.isLocal}
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
                            {getParticipantRoleLabel(participant.role)}
                            {participant.isLocal ? " | You" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {participant.userId === hostUserId ? (
                            <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                              Host
                            </Badge>
                          ) : null}
                          <Badge
                            variant="outline"
                            className="border-border/80 bg-background/35 text-silver"
                          >
                            {participant.isMicrophoneEnabled ? (
                              <Mic size={12} className="mr-1.5" />
                            ) : (
                              <MicOff size={12} className="mr-1.5" />
                            )}
                            {participant.isMicrophoneEnabled ? "Mic on" : "Mic muted"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-border/80 bg-background/35 text-silver"
                          >
                            {participant.isCameraEnabled ? (
                              <Video size={12} className="mr-1.5" />
                            ) : (
                              <VideoOff size={12} className="mr-1.5" />
                            )}
                            {participant.isCameraEnabled ? "Camera on" : "Camera off"}
                          </Badge>
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full",
                              participant.isSpeaking
                                ? "bg-gold shadow-[0_0_0_6px_rgba(214,180,103,0.18)]"
                                : "bg-silver/30"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={micEnabled}
                    onClick={toggleMicrophone}
                  >
                    {micEnabled ? (
                      <Mic size={16} className="mr-2" />
                    ) : (
                      <MicOff size={16} className="mr-2" />
                    )}
                    {micEnabled ? "Mute Mic" : "Unmute Mic"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={cameraEnabled}
                    onClick={toggleCamera}
                  >
                    {cameraEnabled ? (
                      <Video size={16} className="mr-2" />
                    ) : (
                      <VideoOff size={16} className="mr-2" />
                    )}
                    {cameraEnabled ? "Camera Off" : "Camera On"}
                  </Button>
                  <Button type="button" variant="danger" onClick={leaveRoom} disabled={isLeaving}>
                    {isLeaving ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <PhoneOff size={16} className="mr-2" />
                    )}
                    Leave Call
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => router.refresh()}>
                    <RefreshCcw size={16} className="mr-2" />
                    Refresh Room
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Participant list</CardTitle>
                  <CardDescription>Participants currently connected in this room.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {participantSnapshots.map((participant) => (
                    <div
                      key={`${participant.identity}-list`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/25 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{participant.name}</p>
                        <p className="text-xs text-muted">
                          {getParticipantRoleLabel(participant.role)}
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
                            participant.isSpeaking
                              ? "bg-gold shadow-[0_0_0_6px_rgba(214,180,103,0.18)]"
                              : "bg-silver/30"
                          )}
                        />
                      </div>
                    </div>
                  ))}

                  {participantSnapshots.length === 1 ? (
                    <p className="text-sm text-muted">Only you are connected right now.</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Device controls</CardTitle>
                  <CardDescription>
                    Switch active devices without leaving the room whenever your setup changes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="in-room-camera-device">Camera device</Label>
                    <Select
                      id="in-room-camera-device"
                      value={selectedCameraId}
                      onChange={(event) => handleCameraDeviceChange(event.target.value)}
                      disabled={!hasGrantedMediaAccess || !availableCameras.length}
                    >
                      {hasGrantedMediaAccess ? (
                        availableCameras.length ? null : <option value="">No camera detected</option>
                      ) : (
                        <option value="">Allow camera access to list devices</option>
                      )}
                      {availableCameras.map((device, index) => (
                        <option key={device.deviceId || `${device.kind}-${index}`} value={device.deviceId}>
                          {formatDeviceLabel(device, "Camera", index)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="in-room-mic-device">Microphone device</Label>
                    <Select
                      id="in-room-mic-device"
                      value={selectedMicrophoneId}
                      onChange={(event) => handleMicrophoneDeviceChange(event.target.value)}
                      disabled={!hasGrantedMediaAccess || !availableMicrophones.length}
                    >
                      {hasGrantedMediaAccess ? (
                        availableMicrophones.length ? null : (
                          <option value="">No microphone detected</option>
                        )
                      ) : (
                        <option value="">Allow microphone access to list devices</option>
                      )}
                      {availableMicrophones.map((device, index) => (
                        <option key={device.deviceId || `${device.kind}-${index}`} value={device.deviceId}>
                          {formatDeviceLabel(device, "Microphone", index)}
                        </option>
                      ))}
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

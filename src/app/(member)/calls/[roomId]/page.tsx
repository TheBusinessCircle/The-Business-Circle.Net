import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CallRoomClient } from "@/components/calling";
import {
  getCallAudienceLabel,
  getCallRoomTypeLabel
} from "@/lib/calling";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { validateCallRoomAccess } from "@/server/calling";
import { toCallingUser } from "@/server/calling/session";

type PageProps = {
  params: Promise<{ roomId: string }>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Call Room",
  description: "Join a secure internal Business Circle call room.",
  path: "/calls"
});

export const dynamic = "force-dynamic";

export default async function CallRoomPage({ params }: PageProps) {
  const session = await requireUser();
  const { roomId } = await params;
  const result = await validateCallRoomAccess({
    roomId,
    actor: toCallingUser(session.user)
  });

  if (!result.allowed || !result.room) {
    redirect("/calls?error=call-room-access-denied");
  }

  const room = result.room;

  return (
    <CallRoomClient
      roomId={room.id}
      title={room.title}
      description={room.description}
      audienceLabel={getCallAudienceLabel(room.tierVisibility, room.customTierVisibility)}
      roomTypeLabel={getCallRoomTypeLabel(room.type)}
      startsAt={room.startsAt?.toISOString() ?? null}
      maxParticipants={room.maxParticipants}
      hostUserId={room.hostUserId}
      hostName={room.hostUser.name || room.hostUser.email || "Business Circle Host"}
      canJoinNow={result.canJoinNow ?? false}
      participantDirectory={room.participants.map((participant) => ({
        userId: participant.userId,
        name: participant.user.name || participant.user.email || "Business Circle Member",
        role: participant.role
      }))}
    />
  );
}

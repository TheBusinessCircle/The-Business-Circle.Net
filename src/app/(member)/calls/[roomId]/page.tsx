import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
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
  path: "/calls",
  noIndex: true
});

export const dynamic = "force-dynamic";

export default async function CallRoomPage({ params }: PageProps) {
  const session = await requireUser({ allowUnentitled: isBcnV2Enabled() });
  const { roomId } = await params;
  const result = await validateCallRoomAccess({
    roomId,
    actor: toCallingUser(session.user)
  });

  if (!result.allowed || !result.room) {
    redirect(isBcnV2Enabled() ? "/messages?error=call-room-access-denied" : "/calls?error=call-room-access-denied");
  }

  const room = result.room;

  const content = (
    <CallRoomClient
      exitPath={isBcnV2Enabled() ? "/messages" : "/calls"}
      roomId={room.id}
      title={room.title}
      description={room.description}
      audienceLabel={getCallAudienceLabel(room.tierVisibility, room.customTierVisibility)}
      roomTypeLabel={getCallRoomTypeLabel(room.type)}
      startsAt={room.startsAt?.toISOString() ?? null}
      maxParticipants={room.maxParticipants}
      hostUserId={room.hostUserId}
      hostName={room.hostUser.name || (isBcnV2Enabled() ? "BCN host" : room.hostUser.email) || "Business Circle Host"}
      canJoinNow={result.canJoinNow ?? false}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
      canManageRoom={session.user.role === "ADMIN" || room.hostUserId === session.user.id}
      participantDirectory={room.participants.map((participant) => ({
        userId: participant.userId,
        name: participant.user.name || (isBcnV2Enabled() ? "BCN member" : participant.user.email) || "Business Circle Member",
        role: participant.role
      }))}
    />
  );
  return isBcnV2Enabled() ? <div className="v2-call-surface">{content}</div> : content;
}

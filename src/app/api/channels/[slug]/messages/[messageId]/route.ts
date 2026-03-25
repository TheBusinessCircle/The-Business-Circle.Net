import { NextResponse } from "next/server";
import { isAdminRole, userCanAccessTier } from "@/lib/auth/permissions";
import { publishCommunityEvent } from "@/lib/community";
import { ensureCommunityRealtimePublisherConfigured } from "@/lib/community/ably-publisher";
import { requireApiUser } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { messageDeleteSchema } from "@/lib/validators";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import { ensureCommunityChannels } from "@/server/community";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; messageId: string }> }
) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json(
        { error: "Untrusted request origin." },
        { status: 403 }
      );
    }

    const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        { error: "Only admins can delete community messages." },
        { status: 403 }
      );
    }

    await ensureCommunityChannels();
    ensureCommunityRealtimePublisherConfigured();

    const { slug, messageId } = await context.params;
    const parsed = messageDeleteSchema.safeParse({ messageId });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message id." }, { status: 400 });
    }

    const channel = await prisma.channel.findFirst({
      where: {
        slug,
        isArchived: false
      },
      select: {
        id: true,
        slug: true,
        accessTier: true
      }
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 });
    }

    if (!userCanAccessTier(authResult.user, channel.accessTier)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const message = await prisma.message.findFirst({
      where: {
        id: parsed.data.messageId,
        channelId: channel.id,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    await prisma.message.update({
      where: {
        id: message.id
      },
      data: {
        deletedAt: new Date(),
        editedAt: new Date(),
        isEdited: true,
        content: "[Message removed by admin]"
      }
    });

    await publishCommunityEvent({
      type: "message.deleted",
      channelSlug: channel.slug,
      messageId: message.id
    });

    return NextResponse.json({ ok: true, messageId: message.id });
  } catch (error) {
    logServerError("channel-message-delete-failed", error);
    return NextResponse.json({ error: "Failed to delete message." }, { status: 500 });
  }
}

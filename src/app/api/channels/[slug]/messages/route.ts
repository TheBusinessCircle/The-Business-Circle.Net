import { NextResponse } from "next/server";
import { MembershipTier } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/auth/api";
import { userCanAccessTier } from "@/lib/auth/permissions";
import { publishCommunityEvent } from "@/lib/community";
import { ensureCommunityRealtimePublisherConfigured } from "@/lib/community/ably-publisher";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validators";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import { ensureCommunityChannels } from "@/server/community";
import { getCommunityRecognitionForUsers } from "@/server/community-recognition";
import type { ChannelMessageModel } from "@/types";

const DEFAULT_TAKE = 120;
const MAX_TAKE = 200;

const messageUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  membershipTier: true,
  role: true,
  memberRoleTag: true,
  foundingMember: true,
  foundingTier: true,
  profile: {
    select: {
      collaborationTags: true,
      business: {
        select: {
          industry: true
        }
      }
    }
  }
} satisfies Prisma.UserSelect;

type MessageWithUser = Prisma.MessageGetPayload<{
  include: {
    user: {
      select: typeof messageUserSelect;
    };
  };
}>;

function toChannelMessageModel(message: MessageWithUser): ChannelMessageModel {
  return {
    id: message.id,
    channelId: message.channelId,
    userId: message.userId,
    parentMessageId: message.parentMessageId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    isEdited: message.isEdited,
    user: {
      id: message.user.id,
      name: message.user.name,
      email: message.user.email,
      image: message.user.image,
      membershipTier: message.user.membershipTier,
      role: message.user.role,
      memberRoleTag: message.user.memberRoleTag,
      foundingMember: message.user.foundingMember,
      foundingTier: message.user.foundingTier,
      primaryBadge: null,
      statusLevel: "Member",
      reputationScore: 0,
      referralCount: 0,
      industry: message.user.profile?.business?.industry ?? null,
      focusTags: message.user.profile?.collaborationTags?.slice(0, 3) ?? []
    }
  };
}

function resolveTake(url: string): number {
  const searchParams = new URL(url).searchParams;
  const takeRaw = Number(searchParams.get("take") ?? DEFAULT_TAKE);

  if (!Number.isFinite(takeRaw)) {
    return DEFAULT_TAKE;
  }

  return Math.min(Math.max(Math.floor(takeRaw), 1), MAX_TAKE);
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    await ensureCommunityChannels();

    const { slug } = await context.params;
    const channel = await prisma.channel.findFirst({
      where: {
        slug,
        isArchived: false
      }
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (!userCanAccessTier(authResult.user, channel.accessTier)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const take = resolveTake(request.url);

    const messages = await prisma.message.findMany({
      where: {
        channelId: channel.id,
        deletedAt: null
      },
      include: {
        user: {
          select: messageUserSelect
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take
    });

    const recognitionByUserId = await getCommunityRecognitionForUsers(
      messages.map((message) => message.user.id)
    );

    return NextResponse.json({
      messages: messages.reverse().map((message) => {
        const base = toChannelMessageModel(message);
        const recognition = recognitionByUserId.get(message.user.id);

        return {
          ...base,
          user: {
            ...base.user,
            primaryBadge: recognition?.primaryBadge ?? null,
            statusLevel: recognition?.statusLevel ?? "Member",
            reputationScore: recognition?.score ?? 0,
            referralCount: recognition?.referralCount ?? 0
          }
        };
      }),
      channel: {
        id: channel.id,
        slug: channel.slug,
        name: channel.name,
        description: channel.description,
        topic: channel.topic,
        accessTier: channel.accessTier,
        accessLevel: channel.accessLevel,
        position: channel.position,
        isPrivate: channel.isPrivate,
        isPremiumChannel: channel.accessTier !== MembershipTier.FOUNDATION
      }
    });
  } catch (error) {
    logServerError("channel-message-fetch-failed", error);
    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
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

    await ensureCommunityChannels();
    ensureCommunityRealtimePublisherConfigured();

    const { slug } = await context.params;
    const messageRate = await consumeRateLimit({
      key: `api:channels:message:${authResult.user.id}:${slug}`,
      limit: 25,
      windowMs: 60 * 1000
    });
    const headers = rateLimitHeaders(messageRate);

    if (!messageRate.allowed) {
      return NextResponse.json(
        { error: "You're sending messages too quickly. Please wait a moment." },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(messageRate.retryAfterSeconds)
          }
        }
      );
    }

    const parsed = messageSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid message payload." },
        { status: 400, headers }
      );
    }

    const trimmedContent = parsed.data.content.trim();

    if (!trimmedContent.length) {
      return NextResponse.json(
        { error: "Message cannot be empty." },
        { status: 400, headers }
      );
    }

    const channel = await prisma.channel.findFirst({
      where: {
        slug,
        isArchived: false
      }
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404, headers });
    }

    if (!userCanAccessTier(authResult.user, channel.accessTier)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
    }

    let parentMessageId: string | null = null;
    if (parsed.data.parentMessageId) {
      const parentMessage = await prisma.message.findFirst({
        where: {
          id: parsed.data.parentMessageId,
          channelId: channel.id,
          deletedAt: null
        },
        select: { id: true }
      });

      if (!parentMessage) {
        return NextResponse.json(
          { error: "Reply target is unavailable." },
          { status: 400, headers }
        );
      }

      parentMessageId = parentMessage.id;
    }

    const message = await prisma.message.create({
      data: {
        channelId: channel.id,
        userId: authResult.user.id,
        content: trimmedContent,
        parentMessageId
      },
      include: {
        user: {
          select: messageUserSelect
        }
      }
    });
    const recognitionByUserId = await getCommunityRecognitionForUsers([message.user.id]);
    const recognition = recognitionByUserId.get(message.user.id);
    const baseMessageModel = toChannelMessageModel(message);
    const messageModel = {
      ...baseMessageModel,
      user: {
        ...baseMessageModel.user,
        primaryBadge: recognition?.primaryBadge ?? null,
        statusLevel: recognition?.statusLevel ?? "Member",
        reputationScore: recognition?.score ?? 0,
        referralCount: recognition?.referralCount ?? 0
      }
    };

    await publishCommunityEvent({
      type: "message.created",
      channelSlug: channel.slug,
      message: messageModel
    });

    return NextResponse.json({ message: messageModel }, { headers });
  } catch (error) {
    logServerError("channel-message-send-failed", error);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}

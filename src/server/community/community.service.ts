import {
  CommunityPostKind,
  CommunityPromptTriggerSource,
  MembershipTier,
  Prisma,
  Role
} from "@prisma/client";
import { COMMUNITY_CHANNEL_BLUEPRINTS } from "@/config/community";
import {
  COMMUNITY_PROMPT_INACTIVITY_HOURS_BY_TIER,
  COMMUNITY_PROMPT_MIN_HOURS_BETWEEN_POSTS,
  COMMUNITY_PROMPT_RECENT_FOUNDER_POST_HOURS,
  COMMUNITY_PROMPT_WEEKLY_LIMIT,
  COMMUNITY_QUIET_PROMPTS
} from "@/config/community-prompts";
import { canTierAccess } from "@/lib/auth/permissions";
import { sortPromptsByRhythm } from "@/lib/community-rhythm";
import { CONNECTION_WIN_TAG } from "@/lib/connection-wins";
import { db } from "@/lib/db";
import { assertNoBlockedProfanity } from "@/lib/moderation/profanity";
import { logServerWarning } from "@/lib/security/logging";
import { getCommunityRecognitionForUsers } from "@/server/community-recognition";
import { listUpcomingEventsForTiers } from "@/server/events";
import type {
  ChannelMessageModel,
  CommunityChannelModel,
  CommunityCommentModel,
  CommunityEventModel,
  CommunityFeedChannelModel,
  CommunityFeedPageModel,
  CommunityPostDetailModel,
  CommunityRecentPostModel,
  CommunityPostSummaryModel,
  CommunityUserSummaryModel
} from "@/types";

const COMMUNITY_POST_PAGE_SIZE = 18;
const DEFAULT_AUTOMATION_RANDOM_THRESHOLD = 0.48;

const communityUserSelect = {
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

type CommunityUserRecord = Prisma.UserGetPayload<{
  select: typeof communityUserSelect;
}>;

type FeedChannelRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  topic: string | null;
  accessTier: MembershipTier;
  accessLevel: Prisma.ChannelGetPayload<{ select: { accessLevel: true } }>["accessLevel"];
  position: number;
  isPrivate: boolean;
  communityPosts: Array<{
    createdAt: Date;
  }>;
  _count: {
    communityPosts: number;
  };
};

type FeedCommentRecord = {
  id: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likes?: Array<{
    userId: string;
  }>;
  _count?: {
    likes: number;
  };
  user: CommunityUserRecord;
};

function mapChannelBase(
  channel: Pick<
    FeedChannelRecord,
    "id" | "slug" | "name" | "description" | "topic" | "accessTier" | "accessLevel" | "position" | "isPrivate"
  >
): CommunityChannelModel {
  return {
    ...channel,
    isPremiumChannel: channel.accessTier !== MembershipTier.FOUNDATION
  };
}

function mapFeedChannel(channel: FeedChannelRecord): CommunityFeedChannelModel {
  return {
    ...mapChannelBase(channel),
    postCount: channel._count.communityPosts,
    lastActivityAt: channel.communityPosts[0]?.createdAt.toISOString() ?? null
  };
}

async function buildRecognitionMap(userIds: string[]) {
  return getCommunityRecognitionForUsers(Array.from(new Set(userIds)).filter(Boolean));
}

function mapCommunityUser(
  user: CommunityUserRecord,
  recognitionByUserId: Awaited<ReturnType<typeof buildRecognitionMap>>
): CommunityUserSummaryModel {
  const recognition = recognitionByUserId.get(user.id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    membershipTier: user.membershipTier,
    role: user.role,
    memberRoleTag: user.memberRoleTag,
    foundingMember: user.foundingMember,
    foundingTier: user.foundingTier,
    primaryBadge: recognition?.primaryBadge ?? null,
    statusLevel: recognition?.statusLevel ?? "Member",
    reputationScore: recognition?.score ?? 0,
    referralCount: recognition?.referralCount ?? 0,
    industry: user.profile?.business?.industry ?? null,
    focusTags: user.profile?.collaborationTags?.slice(0, 3) ?? []
  };
}

function buildCommentTree(
  comments: FeedCommentRecord[],
  recognitionByUserId: Awaited<ReturnType<typeof buildRecognitionMap>>
): CommunityCommentModel[] {
  const byParentId = new Map<string | null, FeedCommentRecord[]>();

  for (const comment of comments) {
    const collection = byParentId.get(comment.parentCommentId) ?? [];
    collection.push(comment);
    byParentId.set(comment.parentCommentId, collection);
  }

  const mapBranch = (parentCommentId: string | null): CommunityCommentModel[] => {
    const branch = byParentId.get(parentCommentId) ?? [];

    return branch.map((comment) => ({
      id: comment.id,
      postId: comment.postId,
      parentCommentId: comment.parentCommentId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      likeCount: comment._count?.likes ?? 0,
      viewerHasLiked: (comment.likes?.length ?? 0) > 0,
      user: mapCommunityUser(comment.user, recognitionByUserId),
      replies: mapBranch(comment.id)
    }));
  };

  return mapBranch(null);
}

function isCommentLikeMetadataUnavailableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2021" && error.code !== "P2022") {
    return false;
  }

  return error.message.includes("CommunityCommentLike");
}

async function getCommunityComments(input: { postId: string; viewerUserId: string }) {
  try {
    return await db.communityComment.findMany({
      where: {
        postId: input.postId,
        deletedAt: null
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true,
        postId: true,
        parentCommentId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        likes: {
          where: {
            userId: input.viewerUserId
          },
          select: {
            userId: true
          }
        },
        _count: {
          select: {
            likes: true
          }
        },
        user: {
          select: communityUserSelect
        }
      }
    });
  } catch (error) {
    if (!isCommentLikeMetadataUnavailableError(error)) {
      throw error;
    }

    logServerWarning("community-comment-like-metadata-unavailable", {
      postId: input.postId
    });

    return db.communityComment.findMany({
      where: {
        postId: input.postId,
        deletedAt: null
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true,
        postId: true,
        parentCommentId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: communityUserSelect
        }
      }
    });
  }
}

function normalizeTagList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 5);
}

function founderPostKind(role: Role): CommunityPostKind {
  return role === Role.ADMIN ? CommunityPostKind.FOUNDER_POST : CommunityPostKind.MEMBER_POST;
}

function inactivityCutoffForTier(tier: MembershipTier) {
  const hours = COMMUNITY_PROMPT_INACTIVITY_HOURS_BY_TIER[tier];
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function resolvePromptAuthorId(): Promise<string | null> {
  const configuredPromptAuthorId = process.env.COMMUNITY_PROMPT_AUTHOR_ID?.trim();
  if (configuredPromptAuthorId) {
    const configuredUser = await db.user.findUnique({
      where: {
        id: configuredPromptAuthorId
      },
      select: {
        id: true
      }
    });

    return configuredUser?.id ?? null;
  }

  const firstAdmin = await db.user.findFirst({
    where: {
      role: Role.ADMIN,
      suspended: false
    },
    select: {
      id: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return firstAdmin?.id ?? null;
}

async function getAccessibleChannelBySlug(slug: string, userTier: MembershipTier) {
  const channel = await db.channel.findUnique({
    where: {
      slug
    },
    select: {
      id: true,
      slug: true,
      accessTier: true,
      isArchived: true
    }
  });

  if (!channel || channel.isArchived || !canTierAccess(userTier, channel.accessTier)) {
    throw new Error("community-channel-forbidden");
  }

  return channel;
}

export async function ensureCommunityChannels(): Promise<void> {
  const requiredSlugs = COMMUNITY_CHANNEL_BLUEPRINTS.map((channel) => channel.slug);

  const existingChannels = await db.channel.findMany({
    where: {
      slug: {
        in: requiredSlugs
      },
      isArchived: false
    },
    select: {
      slug: true
    }
  });

  if (existingChannels.length === requiredSlugs.length) {
    await db.$transaction(
      COMMUNITY_CHANNEL_BLUEPRINTS.map((channel) =>
        db.channel.update({
          where: {
            slug: channel.slug
          },
          data: {
            name: channel.name,
            description: channel.description,
            topic: channel.topic,
            position: channel.position,
            accessTier: channel.accessTier,
            accessLevel: channel.accessLevel,
            isPrivate: channel.isPrivate,
            allowAutomatedPrompts: channel.allowAutomatedPrompts ?? true,
            isArchived: false
          }
        })
      )
    );
    return;
  }

  await db.$transaction(
    COMMUNITY_CHANNEL_BLUEPRINTS.map((channel) =>
      db.channel.upsert({
        where: {
          slug: channel.slug
        },
        update: {
          name: channel.name,
          description: channel.description,
          topic: channel.topic,
          position: channel.position,
          accessTier: channel.accessTier,
          accessLevel: channel.accessLevel,
          isPrivate: channel.isPrivate,
          allowAutomatedPrompts: channel.allowAutomatedPrompts ?? true,
          isArchived: false
        },
        create: {
          name: channel.name,
          slug: channel.slug,
          description: channel.description,
          topic: channel.topic,
          position: channel.position,
          accessTier: channel.accessTier,
          accessLevel: channel.accessLevel,
          isPrivate: channel.isPrivate,
          allowAutomatedPrompts: channel.allowAutomatedPrompts ?? true,
          isArchived: false
        }
      })
    )
  );
}

export async function listChannelsForTier(tiers: MembershipTier[]): Promise<CommunityChannelModel[]> {
  const channels = await db.channel.findMany({
    where: {
      accessTier: {
        in: tiers
      },
      isArchived: false
    },
    orderBy: [
      {
        position: "asc"
      },
      {
        createdAt: "asc"
      }
    ],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      topic: true,
      accessTier: true,
      accessLevel: true,
      position: true,
      isPrivate: true
    }
  });

  return channels.map(mapChannelBase);
}

export async function listCommunityFeedChannels(
  tiers: MembershipTier[]
): Promise<CommunityFeedChannelModel[]> {
  const channels = await db.channel.findMany({
    where: {
      accessTier: {
        in: tiers
      },
      isArchived: false
    },
    orderBy: [
      {
        position: "asc"
      },
      {
        createdAt: "asc"
      }
    ],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      topic: true,
      accessTier: true,
      accessLevel: true,
      position: true,
      isPrivate: true,
      communityPosts: {
        where: {
          deletedAt: null
        },
        select: {
          createdAt: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      },
      _count: {
        select: {
          communityPosts: {
            where: {
              deletedAt: null
            }
          }
        }
      }
    }
  });

  return channels.map(mapFeedChannel);
}

export async function getCommunityFeedPage(input: {
  tiers: MembershipTier[];
  selectedSlug?: string;
  viewerUserId: string;
}): Promise<CommunityFeedPageModel> {
  const channels = await listCommunityFeedChannels(input.tiers);
  const selectedChannel =
    channels.find((channel) => channel.slug === input.selectedSlug) ?? channels[0] ?? null;

  if (!selectedChannel) {
    return {
      channels,
      selectedChannel: null,
      posts: []
    };
  }

  const posts = await db.communityPost.findMany({
    where: {
      channelId: selectedChannel.id,
      deletedAt: null
    },
    orderBy: {
      createdAt: "desc"
    },
    take: COMMUNITY_POST_PAGE_SIZE,
    select: {
      id: true,
      channelId: true,
      userId: true,
      title: true,
      content: true,
      tags: true,
      kind: true,
      promptId: true,
      promptTier: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: communityUserSelect
      },
      likes: {
        where: {
          userId: input.viewerUserId
        },
        select: {
          userId: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: {
            where: {
              deletedAt: null
            }
          }
        }
      }
    }
  });

  const recognitionByUserId = await buildRecognitionMap(posts.map((post) => post.user.id));

  const mappedPosts: CommunityPostSummaryModel[] = posts.map((post) => ({
    id: post.id,
    channelId: post.channelId,
    title: post.title,
    content: post.content,
    tags: post.tags,
    kind: post.kind,
    promptId: post.promptId,
    promptTier: post.promptTier,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    viewerHasLiked: post.likes.length > 0,
    user: mapCommunityUser(post.user, recognitionByUserId)
  }));

  return {
    channels,
    selectedChannel,
    posts: mappedPosts
  };
}

export async function listRecentCommunityPostsForTiers(input: {
  tiers: MembershipTier[];
  viewerUserId: string;
  take?: number;
}): Promise<CommunityRecentPostModel[]> {
  const posts = await db.communityPost.findMany({
    where: {
      deletedAt: null,
      channel: {
        accessTier: {
          in: input.tiers
        },
        isArchived: false
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: input.take ?? 6,
    select: {
      id: true,
      channelId: true,
      title: true,
      content: true,
      tags: true,
      kind: true,
      promptId: true,
      promptTier: true,
      createdAt: true,
      updatedAt: true,
      channel: {
        select: {
          name: true,
          slug: true
        }
      },
      user: {
        select: communityUserSelect
      },
      likes: {
        where: {
          userId: input.viewerUserId
        },
        select: {
          userId: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: {
            where: {
              deletedAt: null
            }
          }
        }
      }
    }
  });

  const recognitionByUserId = await buildRecognitionMap(posts.map((post) => post.user.id));

  return posts.map((post) => ({
    id: post.id,
    channelId: post.channelId,
    title: post.title,
    content: post.content,
    tags: post.tags,
    kind: post.kind,
    promptId: post.promptId,
    promptTier: post.promptTier,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    viewerHasLiked: post.likes.length > 0,
    user: mapCommunityUser(post.user, recognitionByUserId),
    channel: post.channel
  }));
}

export async function listRecentConnectionWinsForTiers(input: {
  tiers: MembershipTier[];
  viewerUserId: string;
  take?: number;
}): Promise<CommunityRecentPostModel[]> {
  const posts = await db.communityPost.findMany({
    where: {
      deletedAt: null,
      OR: [
        {
          kind: CommunityPostKind.WIN
        },
        {
          tags: {
            has: CONNECTION_WIN_TAG
          }
        }
      ],
      channel: {
        accessTier: {
          in: input.tiers
        },
        isArchived: false
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: input.take ?? 3,
    select: {
      id: true,
      channelId: true,
      title: true,
      content: true,
      tags: true,
      kind: true,
      promptId: true,
      promptTier: true,
      createdAt: true,
      updatedAt: true,
      channel: {
        select: {
          name: true,
          slug: true
        }
      },
      user: {
        select: communityUserSelect
      },
      likes: {
        where: {
          userId: input.viewerUserId
        },
        select: {
          userId: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: {
            where: {
              deletedAt: null
            }
          }
        }
      }
    }
  });

  const recognitionByUserId = await buildRecognitionMap(posts.map((post) => post.user.id));

  return posts.map((post) => ({
    id: post.id,
    channelId: post.channelId,
    title: post.title,
    content: post.content,
    tags: post.tags,
    kind: post.kind,
    promptId: post.promptId,
    promptTier: post.promptTier,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    viewerHasLiked: post.likes.length > 0,
    user: mapCommunityUser(post.user, recognitionByUserId),
    channel: post.channel
  }));
}

export async function getCommunityPostDetail(input: {
  postId: string;
  viewerUserId: string;
  viewerTier: MembershipTier;
}): Promise<CommunityPostDetailModel | null> {
  const post = await db.communityPost.findUnique({
    where: {
      id: input.postId
    },
    select: {
      id: true,
      channelId: true,
      title: true,
      content: true,
      tags: true,
      kind: true,
      promptId: true,
      promptTier: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      channel: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          topic: true,
          accessTier: true,
          accessLevel: true,
          position: true,
          isPrivate: true,
          isArchived: true
        }
      },
      user: {
        select: communityUserSelect
      },
      likes: {
        where: {
          userId: input.viewerUserId
        },
        select: {
          userId: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: {
            where: {
              deletedAt: null
            }
          }
        }
      }
    }
  });

  if (
    !post ||
    post.deletedAt ||
    post.channel.isArchived ||
    !canTierAccess(input.viewerTier, post.channel.accessTier)
  ) {
    return null;
  }

  const comments = await getCommunityComments({
    postId: post.id,
    viewerUserId: input.viewerUserId
  });

  const recognitionByUserId = await buildRecognitionMap([
    post.user.id,
    ...comments.map((comment) => comment.user.id)
  ]);

  return {
    id: post.id,
    channelId: post.channelId,
    title: post.title,
    content: post.content,
    tags: post.tags,
    kind: post.kind,
    promptId: post.promptId,
    promptTier: post.promptTier,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    viewerHasLiked: post.likes.length > 0,
    user: mapCommunityUser(post.user, recognitionByUserId),
    comments: buildCommentTree(comments, recognitionByUserId),
    channel: mapChannelBase(post.channel)
  };
}

export async function createCommunityPost(input: {
  channelSlug: string;
  userId: string;
  userRole: Role;
  userTier: MembershipTier;
  title: string;
  content: string;
  tags?: string;
  kind?: CommunityPostKind;
}) {
  const channel = await getAccessibleChannelBySlug(input.channelSlug, input.userTier);
  assertNoBlockedProfanity(`${input.title} ${input.content}`);

  return db.communityPost.create({
    data: {
      channelId: channel.id,
      userId: input.userId,
      title: input.title.trim(),
      content: input.content.trim(),
      tags: normalizeTagList(input.tags),
      kind: input.kind ?? founderPostKind(input.userRole)
    }
  });
}

export async function createCommunityComment(input: {
  postId: string;
  userId: string;
  userTier: MembershipTier;
  content: string;
  parentCommentId?: string | null;
}) {
  const post = await db.communityPost.findUnique({
    where: {
      id: input.postId
    },
    select: {
      id: true,
      deletedAt: true,
      channel: {
        select: {
          accessTier: true
        }
      }
    }
  });

  if (!post || post.deletedAt || !canTierAccess(input.userTier, post.channel.accessTier)) {
    throw new Error("community-post-forbidden");
  }

  assertNoBlockedProfanity(input.content);

  return db.communityComment.create({
    data: {
      postId: post.id,
      userId: input.userId,
      parentCommentId: input.parentCommentId ?? null,
      content: input.content.trim()
    }
  });
}

export async function toggleCommunityPostLike(input: {
  postId: string;
  userId: string;
  userTier: MembershipTier;
}) {
  const post = await db.communityPost.findUnique({
    where: {
      id: input.postId
    },
    select: {
      id: true,
      deletedAt: true,
      channel: {
        select: {
          accessTier: true
        }
      }
    }
  });

  if (!post || post.deletedAt || !canTierAccess(input.userTier, post.channel.accessTier)) {
    throw new Error("community-post-forbidden");
  }

  const existingLike = await db.communityPostLike.findUnique({
    where: {
      postId_userId: {
        postId: input.postId,
        userId: input.userId
      }
    }
  });

  if (existingLike) {
    await db.communityPostLike.delete({
      where: {
        postId_userId: {
          postId: input.postId,
          userId: input.userId
        }
      }
    });
    return false;
  }

  await db.communityPostLike.create({
    data: {
      postId: input.postId,
      userId: input.userId
    }
  });
  return true;
}

export async function toggleCommunityCommentLike(input: {
  commentId: string;
  userId: string;
  userTier: MembershipTier;
}) {
  const comment = await db.communityComment.findUnique({
    where: {
      id: input.commentId
    },
    select: {
      id: true,
      postId: true,
      deletedAt: true,
      post: {
        select: {
          deletedAt: true,
          channel: {
            select: {
              accessTier: true
            }
          }
        }
      }
    }
  });

  if (
    !comment ||
    comment.deletedAt ||
    comment.post.deletedAt ||
    !canTierAccess(input.userTier, comment.post.channel.accessTier)
  ) {
    throw new Error("community-comment-forbidden");
  }

  const existingLike = await db.communityCommentLike.findUnique({
    where: {
      commentId_userId: {
        commentId: input.commentId,
        userId: input.userId
      }
    }
  });

  if (existingLike) {
    await db.communityCommentLike.delete({
      where: {
        commentId_userId: {
          commentId: input.commentId,
          userId: input.userId
        }
      }
    });

    return {
      liked: false,
      postId: comment.postId
    };
  }

  await db.communityCommentLike.create({
    data: {
      commentId: input.commentId,
      userId: input.userId
    }
  });

  return {
    liked: true,
    postId: comment.postId
  };
}

export async function maybePublishQuietCommunityPrompt(input: {
  actorUserId?: string | null;
  triggerSource?: CommunityPromptTriggerSource;
  randomThreshold?: number;
}) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const minGapDate = new Date(
    now.getTime() - COMMUNITY_PROMPT_MIN_HOURS_BETWEEN_POSTS * 60 * 60 * 1000
  );
  const recentFounderCutoff = new Date(
    now.getTime() - COMMUNITY_PROMPT_RECENT_FOUNDER_POST_HOURS * 60 * 60 * 1000
  );

  const [promptCountThisWeek, lastPromptEvent] = await Promise.all([
    db.communityPromptEvent.count({
      where: {
        status: "PUBLISHED",
        createdAt: {
          gte: weekAgo
        }
      }
    }),
    db.communityPromptEvent.findFirst({
      where: {
        status: "PUBLISHED"
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        createdAt: true
      }
    })
  ]);

  if (promptCountThisWeek >= COMMUNITY_PROMPT_WEEKLY_LIMIT) {
    return null;
  }

  if (lastPromptEvent && lastPromptEvent.createdAt >= minGapDate) {
    return null;
  }

  const channels = await db.channel.findMany({
    where: {
      isArchived: false,
      allowAutomatedPrompts: true
    },
    select: {
      id: true,
      slug: true,
      accessTier: true
    }
  });

  if (!channels.length) {
    return null;
  }

  const [latestPosts, recentFounderPosts, promptUsage] = await Promise.all([
    db.communityPost.findMany({
      where: {
        channelId: {
          in: channels.map((channel) => channel.id)
        },
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        channelId: true,
        createdAt: true
      }
    }),
    db.communityPost.findMany({
      where: {
        kind: CommunityPostKind.FOUNDER_POST,
        deletedAt: null,
        createdAt: {
          gte: recentFounderCutoff
        }
      },
      select: {
        channelId: true
      }
    }),
    db.communityPromptEvent.findMany({
      where: {
        status: "PUBLISHED"
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        channelId: true,
        promptId: true,
        createdAt: true
      }
    })
  ]);

  const latestPostByChannelId = new Map<string, Date>();
  for (const post of latestPosts) {
    if (!latestPostByChannelId.has(post.channelId)) {
      latestPostByChannelId.set(post.channelId, post.createdAt);
    }
  }

  const founderActiveChannelIds = new Set(recentFounderPosts.map((post) => post.channelId));
  const recentPromptByChannelId = new Map<string, Date>();
  const promptLastUsedAt = new Map<string, Date>();

  for (const event of promptUsage) {
    if (!recentPromptByChannelId.has(event.channelId)) {
      recentPromptByChannelId.set(event.channelId, event.createdAt);
    }

    if (!promptLastUsedAt.has(event.promptId)) {
      promptLastUsedAt.set(event.promptId, event.createdAt);
    }
  }

  const candidates = channels
    .map((channel) => {
      if (founderActiveChannelIds.has(channel.id)) {
        return null;
      }

      const lastPostAt = latestPostByChannelId.get(channel.id);
      const inactivityCutoff = inactivityCutoffForTier(channel.accessTier);
      if (lastPostAt && lastPostAt > inactivityCutoff) {
        return null;
      }

      const lastPromptAtForChannel = recentPromptByChannelId.get(channel.id);
      if (lastPromptAtForChannel && lastPromptAtForChannel > inactivityCutoff) {
        return null;
      }

      const prompts = sortPromptsByRhythm(
        COMMUNITY_QUIET_PROMPTS.filter(
          (prompt) =>
            prompt.active &&
            prompt.tier === channel.accessTier &&
            prompt.channelSlugs.includes(channel.slug) &&
            (!promptLastUsedAt.has(prompt.id) ||
              promptLastUsedAt.get(prompt.id)! <=
                new Date(now.getTime() - prompt.cooldownDays * 24 * 60 * 60 * 1000))
        ),
        now
      );

      if (!prompts.length) {
        return null;
      }

      return {
        channel,
        prompts,
        idleSince: lastPostAt ?? new Date(0)
      };
    })
    .filter(Boolean);

  if (!candidates.length) {
    return null;
  }

  if (Math.random() > (input.randomThreshold ?? DEFAULT_AUTOMATION_RANDOM_THRESHOLD)) {
    return null;
  }

  const promptAuthorId = await resolvePromptAuthorId();
  if (!promptAuthorId) {
    return null;
  }

  const sortedCandidates = candidates.sort(
    (a, b) => a!.idleSince.getTime() - b!.idleSince.getTime()
  );
  const candidatePool = sortedCandidates.slice(0, Math.min(3, sortedCandidates.length));
  const selectedCandidate = candidatePool[Math.floor(Math.random() * candidatePool.length)]!;
  const promptPool = selectedCandidate.prompts.slice(0, Math.min(2, selectedCandidate.prompts.length));
  const selectedPrompt = promptPool[Math.floor(Math.random() * promptPool.length)]!;

  const created = await db.$transaction(async (tx) => {
    const post = await tx.communityPost.create({
      data: {
        channelId: selectedCandidate.channel.id,
        userId: promptAuthorId,
        title: selectedPrompt.title,
        content: selectedPrompt.prompt,
        kind: CommunityPostKind.AUTO_PROMPT,
        promptId: selectedPrompt.id,
        promptTier: selectedPrompt.tier
      }
    });

    await tx.communityPromptEvent.create({
      data: {
        channelId: selectedCandidate.channel.id,
        postId: post.id,
        actorUserId: input.actorUserId ?? null,
        promptId: selectedPrompt.id,
        promptTier: selectedPrompt.tier,
        triggerSource: input.triggerSource ?? CommunityPromptTriggerSource.OPPORTUNISTIC,
        reason: `quiet-room:${selectedCandidate.channel.slug}`
      }
    });

    return post;
  });

  return created;
}

export async function listMessagesForChannel(channelId: string, limit = 80): Promise<ChannelMessageModel[]> {
  const messages = await db.message.findMany({
    where: {
      channelId,
      deletedAt: null
    },
    include: {
      user: {
        select: communityUserSelect
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });

  const recognitionByUserId = await buildRecognitionMap(messages.map((message) => message.user.id));

  return messages.reverse().map((message) => ({
    id: message.id,
    channelId: message.channelId,
    userId: message.userId,
    parentMessageId: message.parentMessageId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    isEdited: message.isEdited,
    user: mapCommunityUser(message.user, recognitionByUserId)
  }));
}

export async function listUpcomingEventsForTier(
  tiers: MembershipTier[],
  take = 8
): Promise<CommunityEventModel[]> {
  return listUpcomingEventsForTiers(tiers, { take });
}

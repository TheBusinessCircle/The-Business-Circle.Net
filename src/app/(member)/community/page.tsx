import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { VisualPlacementBackground } from "@/components/visual-media";
import { FirstThreeMovesCard } from "@/components/member/first-three-moves-card";
import {
  CommunityFeed,
  CommunityFeedNav
} from "@/components/community";
import { isStandaloneCommunityChannelSlug } from "@/config/community";
import { buildCommunityChannelPath, buildCommunityFeedPostPath } from "@/lib/community-paths";
import { roleToTier } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { allowedResourceTiers } from "@/lib/db/access";
import {
  ensureCommunityChannels,
  getCommunityFeedPage,
  listRecentConnectionWinsForTiers,
  listUpcomingEventsForTier,
  maybePublishBcnCuratedPosts,
  maybePublishQuietCommunityPrompt
} from "@/server/community";
import { getVisualMediaPlacement } from "@/server/visual-media";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Community",
  description:
    "Category-led member discussions for business owners building with more structure, clarity, and better conversation quality.",
  path: "/community"
});

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "post-created": "Your discussion is now live in the room.",
    "comment-created": "Your reply has been added."
  };

  const errorMap: Record<string, string> = {
    "post-invalid": "Please give the discussion a clearer title and enough detail for useful replies.",
    "post-blocked": "Please rewrite that before posting. Profanity and abusive language are blocked to keep the rooms commercially useful.",
    "channel-readonly": "That room is curated automatically. Add your perspective in the comments underneath the published updates instead.",
    "comment-invalid": "Please add enough detail for the reply to be useful.",
    "comment-blocked": "Please rewrite that before posting. Profanity and abusive language are blocked to keep the rooms commercially useful.",
    "comment-forbidden": "That reply is no longer available in this discussion.",
    "channel-forbidden": "You do not currently have access to that room.",
    "post-forbidden": "That discussion is no longer available at your access level."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function CommunityPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const params = await searchParams;

  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const tiers = allowedResourceTiers(effectiveTier);

  await ensureCommunityChannels();

  await maybePublishQuietCommunityPrompt({
    actorUserId: session.user.id
  });
  await maybePublishBcnCuratedPosts();

  const selectedSlugRaw = typeof params.channel === "string" ? params.channel : undefined;
  const expandedPostId = typeof params.post === "string" ? params.post : null;

  if (selectedSlugRaw && isStandaloneCommunityChannelSlug(selectedSlugRaw)) {
    const redirectedPath = expandedPostId
      ? buildCommunityFeedPostPath(selectedSlugRaw, expandedPostId)
      : buildCommunityChannelPath(selectedSlugRaw);
    const redirectUrl = new URL(redirectedPath, "http://localhost");

    for (const key of ["notice", "error"]) {
      const value = params[key];
      if (typeof value === "string" && value) {
        redirectUrl.searchParams.set(key, value);
      }
    }

    redirect(`${redirectUrl.pathname}${redirectUrl.search}`);
  }

  const [
    feed,
    upcomingEvents,
    recentConnectionWins,
    communityHeroPlacement,
    memberIntroductionPost,
    memberUsefulPost,
    latestMemberComment
  ] = await Promise.all([
    getCommunityFeedPage({
      tiers,
      selectedSlug: selectedSlugRaw,
      viewerUserId: session.user.id
    }),
    listUpcomingEventsForTier(tiers, 4),
    listRecentConnectionWinsForTiers({
      tiers,
      viewerUserId: session.user.id,
      take: 1
    }),
    getVisualMediaPlacement("community.hero"),
    prisma.communityPost.findFirst({
      where: {
        userId: session.user.id,
        deletedAt: null,
        channel: {
          slug: "introductions"
        }
      },
      select: {
        id: true
      }
    }),
    prisma.communityPost.findFirst({
      where: {
        userId: session.user.id,
        deletedAt: null,
        NOT: {
          channel: {
            slug: "introductions"
          }
        }
      },
      select: {
        id: true
      }
    }),
    prisma.communityComment.findFirst({
      where: {
        userId: session.user.id,
        deletedAt: null
      },
      select: {
        id: true
      }
    })
  ]);

  if (!feed.selectedChannel) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Community rooms are not available yet"
        description="Admins can configure the discussion rooms from the control panel. Refresh once the rooms are in place."
      />
    );
  }

  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const hasIntroduced = Boolean(memberIntroductionPost);
  const hasStartedUsefulPost = Boolean(memberUsefulPost);
  const hasSupportedAnotherMember = Boolean(latestMemberComment);
  const firstThreeMovesComplete =
    hasIntroduced && hasStartedUsefulPost && hasSupportedAnotherMember;
  const firstPostToExplore =
    feed.posts.find((post) => post.user.id !== session.user.id) ?? feed.posts[0] ?? null;
  const firstThreeMovesExploreHref = firstPostToExplore
    ? buildCommunityFeedPostPath(feed.selectedChannel.slug, firstPostToExplore.id)
    : buildCommunityChannelPath(feed.selectedChannel.slug);

  return (
    <div className="member-page-stack">
      <Card className="relative overflow-hidden border-silver/24 bg-gradient-to-br from-silver/12 via-card/82 to-card/72">
        <VisualPlacementBackground placement={communityHeroPlacement} tone="structured" />
        <CardHeader className="relative z-[1]">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Member discussions</p>
          <CardTitle className="font-display text-3xl">Structured discussions</CardTitle>
          <p className="max-w-4xl text-sm leading-relaxed text-muted">
            A calmer discussion space for business owners who want stronger context, more useful replies,
            and less noise than live chat. Choose a room, open the strongest thread, or start a discussion when you have something worth placing in front of the group.
          </p>
        </CardHeader>
        <CardContent className="relative z-[1] pt-0">
          <CommunityFeedNav
            channels={feed.channels}
            selectedSlug={feed.selectedChannel.slug}
          />
        </CardContent>
      </Card>

      {feedback ? (
        <Card
          className={
            feedback.type === "error"
              ? "border-red-500/35 bg-red-500/10"
              : "border-gold/30 bg-gold/10"
          }
        >
          <CardContent className="py-3">
            <p
              className={
                feedback.type === "error" ? "text-sm text-red-100" : "text-sm text-gold"
              }
            >
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!firstThreeMovesComplete ? (
        <FirstThreeMovesCard
          hasIntroduced={hasIntroduced}
          hasStartedUsefulPost={hasStartedUsefulPost}
          hasSupportedAnotherMember={hasSupportedAnotherMember}
          exploreHref={firstThreeMovesExploreHref}
        />
      ) : null}

      <CommunityFeed
        feed={feed}
        upcomingEvents={upcomingEvents}
        membershipTier={effectiveTier}
        currentUserName={session.user.name}
        currentUserId={session.user.id}
        viewerCanContinuePrivately={
          Boolean(session.user.emailVerified) || session.user.role === "ADMIN"
        }
        initialExpandedPostId={expandedPostId}
        featuredConnectionWin={recentConnectionWins[0] ?? null}
        viewerIsAdmin={session.user.role === "ADMIN"}
      />
    </div>
  );
}

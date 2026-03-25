import type { Metadata } from "next";
import { MessageSquareText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CommunityFeed,
  CommunityFeedNav
} from "@/components/community";
import { roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { allowedResourceTiers } from "@/lib/db/access";
import {
  ensureCommunityChannels,
  getCommunityFeedPage,
  listRecentConnectionWinsForTiers,
  listUpcomingEventsForTier,
  maybePublishQuietCommunityPrompt
} from "@/server/community";

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
    "post-created": "Your post is now live in the community.",
    "comment-created": "Your comment has been added."
  };

  const errorMap: Record<string, string> = {
    "post-invalid": "Please give the post a clearer title and a little more detail.",
    "comment-invalid": "Please add a little more detail before posting that comment.",
    "comment-forbidden": "That comment is no longer available in this discussion.",
    "channel-forbidden": "You do not currently have access to that category.",
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

  const selectedSlugRaw = typeof params.channel === "string" ? params.channel : undefined;
  const expandedPostId = typeof params.post === "string" ? params.post : null;
  const [feed, upcomingEvents, recentConnectionWins] = await Promise.all([
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
    })
  ]);

  if (!feed.selectedChannel) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Community categories are not available yet"
        description="Admins can configure categories from the control panel. Refresh after categories are added."
      />
    );
  }

  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  return (
    <div className="space-y-6">
      <Card className="border-silver/24 bg-gradient-to-br from-silver/12 via-card/82 to-card/72">
        <CardHeader>
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Member discussions</p>
          <CardTitle className="font-display text-3xl">Community</CardTitle>
          <p className="max-w-4xl text-sm leading-relaxed text-muted">
            A calmer discussion space for business owners who want visible conversations, better context,
            and less noise than live chat. Choose a room, expand a post inline, or open the full discussion when you need the whole thread.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
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

      <CommunityFeed
        feed={feed}
        upcomingEvents={upcomingEvents}
        membershipTier={effectiveTier}
        currentUserName={session.user.name}
        initialExpandedPostId={expandedPostId}
        featuredConnectionWin={recentConnectionWins[0] ?? null}
      />
    </div>
  );
}

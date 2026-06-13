import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CommunityFeed,
  CommunityFeedNav
} from "@/components/community";
import { isStandaloneCommunityChannelSlug } from "@/config/community";
import { buildCommunityChannelPath, buildCommunityFeedPostPath } from "@/lib/community-paths";
import { countActiveItems, countUniqueContributors } from "@/lib/community-rhythm";
import { roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { allowedResourceTiers } from "@/lib/db/access";
import {
  ensureCommunityChannels,
  getCommunityFeedPage,
  listUpcomingEventsForTier,
  maybePublishBcnCuratedPosts,
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
    upcomingEvents
  ] = await Promise.all([
    getCommunityFeedPage({
      tiers,
      selectedSlug: selectedSlugRaw,
      viewerUserId: session.user.id
    }),
    listUpcomingEventsForTier(tiers, 4)
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
  const totalPostCount = feed.channels.reduce((total, channel) => total + channel.postCount, 0);
  const activeNowCount = countActiveItems(feed.channels);
  const contributingMemberCount = countUniqueContributors(feed.posts);

  return (
    <div className="member-page-stack">
      <Card className="overflow-hidden rounded-xl border-silver/18 bg-card/62">
        <CardHeader className="gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-2">
              <CardTitle className="font-display text-2xl sm:text-3xl">Community</CardTitle>
              <p className="max-w-3xl text-sm leading-relaxed text-muted">
                Useful conversations, wins, questions and introductions from members.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted">
              <span className="rounded-full border border-silver/14 bg-background/20 px-3 py-1.5">
                {totalPostCount} {totalPostCount === 1 ? "post" : "posts"}
              </span>
              {contributingMemberCount ? (
                <span className="rounded-full border border-silver/14 bg-background/20 px-3 py-1.5">
                  {contributingMemberCount} contributing
                </span>
              ) : null}
              {activeNowCount ? (
                <span className="rounded-full border border-gold/24 bg-gold/10 px-3 py-1.5 text-gold">
                  {activeNowCount} active now
                </span>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-6">
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
        currentUserImage={session.user.image}
        currentUserId={session.user.id}
        viewerCanContinuePrivately={
          Boolean(session.user.emailVerified) || session.user.role === "ADMIN"
        }
        initialExpandedPostId={expandedPostId}
        viewerIsAdmin={session.user.role === "ADMIN"}
      />
    </div>
  );
}

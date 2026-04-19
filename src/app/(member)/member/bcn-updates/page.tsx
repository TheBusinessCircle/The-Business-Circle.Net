import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, Sparkles, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { Badge } from "@/components/ui/badge";
import { CommunityPostFeedList } from "@/components/community/community-post-feed-list";
import {
  BCN_UPDATES_CHANNEL_SLUG,
  BCN_UPDATES_MEMBER_ROUTE
} from "@/config/community";
import { buildCommunityFeedPostPath } from "@/lib/community-paths";
import { allowedResourceTiers } from "@/lib/db/access";
import { roleToTier } from "@/lib/permissions";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import {
  ensureCommunityChannels,
  getCommunityFeedPage,
  maybePublishBcnCuratedPosts
} from "@/server/community";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "BCN Updates",
  description:
    "Latest world business news updates curated through the Business Circle lens, giving members a cleaner read on the developments, signals, and shifts worth paying attention to now.",
  path: BCN_UPDATES_MEMBER_ROUTE,
  keywords: [
    "BCN updates",
    "world business news",
    "latest business updates",
    "business circle news",
    "global business developments",
    "member business intelligence"
  ]
});

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "comment-created": "Your reply has been added to the update.",
    "post-created": "The update is now live."
  };

  const errorMap: Record<string, string> = {
    "comment-invalid": "Please add enough detail for the reply to be useful.",
    "comment-blocked": "Please rewrite that before posting. Profanity and abusive language are blocked here too.",
    "comment-forbidden": "That reply is no longer available in this update.",
    "post-forbidden": "That update is no longer available at your access level."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function BcnUpdatesPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const params = await searchParams;
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const tiers = allowedResourceTiers(effectiveTier);

  await ensureCommunityChannels();
  await maybePublishBcnCuratedPosts();

  const expandedPostId = typeof params.post === "string" ? params.post : null;
  const feed = await getCommunityFeedPage({
    tiers,
    selectedSlug: BCN_UPDATES_CHANNEL_SLUG,
    viewerUserId: session.user.id,
    includeStandalone: true
  });

  if (!feed.selectedChannel || feed.selectedChannel.slug !== BCN_UPDATES_CHANNEL_SLUG) {
    return (
      <EmptyState
        icon={Sparkles}
        title="BCN Updates are not available yet"
        description="The curated member intelligence feed will appear here once the BCN Updates channel is ready."
      />
    );
  }

  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const selectedChannel = feed.selectedChannel;
  const discussionReadyCount = feed.posts.filter((post) => post.commentCount > 0).length;

  return (
    <div className="space-y-6">
      <Card className="border-gold/28 bg-gradient-to-br from-gold/10 via-card/88 to-card/72">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-gold/25 bg-gold/10 text-gold">
              <Sparkles size={12} className="mr-1" />
              Curated member intelligence
            </Badge>
            <MembershipTierBadge tier={selectedChannel.accessTier} />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
              BCN intelligence layer
            </p>
            <CardTitle className="font-display text-3xl">BCN Updates</CardTitle>
            <CardDescription className="max-w-4xl text-base leading-relaxed">
              The latest world business news updates, curated in a clearer BCN format so members can track the developments, commercial signals, and market shifts most worth paying attention to, with discussion underneath each update.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Format</p>
            <p className="mt-2 text-base font-semibold text-foreground">Automated, member-facing feed</p>
            <p className="mt-2 text-sm text-muted">
              Updates publish in a cleaner curated format rather than as open room threads.
            </p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Discussion</p>
            <p className="mt-2 text-base font-semibold text-foreground">
              {discussionReadyCount} update{discussionReadyCount === 1 ? "" : "s"} with replies
            </p>
            <p className="mt-2 text-sm text-muted">
              Members can still comment and reply beneath every update using the standard discussion stack.
            </p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Access</p>
            <p className="mt-2 text-base font-semibold text-foreground">Available to eligible paid members</p>
            <p className="mt-2 text-sm text-muted">
              Access follows the existing member auth, paid-tier gating, and moderation rules already used across the dashboard.
            </p>
          </div>
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
            <p className={feedback.type === "error" ? "text-sm text-red-100" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="border-silver/18 bg-card/68">
            <CardHeader>
              <CardTitle className="text-2xl">
                Global business movement, filtered for BCN members
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-relaxed">
                This page is designed to feel more like a premium business intelligence layer than a chat room. Each update is selected and structured first, then members can add context, replies, and perspective beneath it.
              </CardDescription>
            </CardHeader>
          </Card>

          {feed.posts.length ? (
            <CommunityPostFeedList
              posts={feed.posts}
              channelSlug={BCN_UPDATES_CHANNEL_SLUG}
              currentUserId={session.user.id}
              viewerCanContinuePrivately={
                Boolean(session.user.emailVerified) || session.user.role === "ADMIN"
              }
              initialExpandedPostId={expandedPostId}
            />
          ) : (
            <EmptyState
              icon={MessagesSquare}
              title="No BCN Updates yet"
              description="Curated business developments will appear here as the automation feed publishes them."
            />
          )}
        </div>

        <aside className="space-y-5">
          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-xl">
                <Workflow size={16} className="text-silver" />
                How this space works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted">
              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                BCN Updates is curated centrally, so members do not open top-level posts here.
              </div>
              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                Comments and replies stay enabled so each update can still become a useful member discussion.
              </div>
              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                Community remains the place for normal member-started rooms and broader conversation.
              </div>
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-xl">
                <Sparkles size={16} className="text-silver" />
                Latest movement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feed.posts.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  href={buildCommunityFeedPostPath(BCN_UPDATES_CHANNEL_SLUG, post.id)}
                  className="block rounded-2xl border border-silver/14 bg-background/18 px-4 py-4 transition-colors hover:border-silver/26 hover:bg-background/28"
                >
                  <p className="text-sm font-medium text-foreground">{post.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>{post.commentCount} comment{post.commentCount === 1 ? "" : "s"}</span>
                    <span>{post.likeCount} like{post.likeCount === 1 ? "" : "s"}</span>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

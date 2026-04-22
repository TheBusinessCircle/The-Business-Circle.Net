import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MessagesSquare, Sparkles, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { Badge } from "@/components/ui/badge";
import { CommunityPostFeedList } from "@/components/community/community-post-feed-list";
import { VisualPlacementBackground } from "@/components/visual-media";
import {
  BCN_UPDATES_CHANNEL_SLUG,
  BCN_UPDATES_MEMBER_ROUTE
} from "@/config/community";
import {
  getBcnFreshnessLabel,
  getBcnTagLabel,
  getVisibleCommunityTags,
  parseBcnStructuredContent,
  sortBcnSignals
} from "@/lib/bcn-intelligence";
import { buildCommunityFeedPostPath, buildCommunityPostPath } from "@/lib/community-paths";
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
import { getVisualMediaPlacement } from "@/server/visual-media";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "BCN Intelligence",
  description:
    "Premium BCN Intelligence for members: the clearest founder-facing read on the business developments, operator signals, and market shifts worth checking first.",
  path: BCN_UPDATES_MEMBER_ROUTE,
  keywords: [
    "BCN Intelligence",
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
  const [feed, intelligenceHeroPlacement] = await Promise.all([
    getCommunityFeedPage({
      tiers,
      selectedSlug: BCN_UPDATES_CHANNEL_SLUG,
      viewerUserId: session.user.id,
      includeStandalone: true
    }),
    getVisualMediaPlacement("intelligence.hero")
  ]);

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
  const rankedPosts = sortBcnSignals(feed.posts);
  const selectedChannel = feed.selectedChannel;
  const discussionReadyCount = rankedPosts.filter((post) => post.commentCount > 0).length;
  const latestSignal = rankedPosts[0] ?? null;
  const mostDiscussedSignal =
    [...rankedPosts].sort(
      (left, right) =>
        right.commentCount - left.commentCount ||
        right.likeCount - left.likeCount ||
        right.createdAt.localeCompare(left.createdAt)
    )[0] ?? null;
  const categoryCounts = rankedPosts.reduce<Map<string, number>>((counts, post) => {
    for (const tag of getVisibleCommunityTags(post.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }

    return counts;
  }, new Map());
  const topCategories = Array.from(categoryCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4);
  const latestSignalPreview = latestSignal ? parseBcnStructuredContent(latestSignal.content) : null;
  const latestSignalFreshness = latestSignal ? getBcnFreshnessLabel(latestSignal.createdAt) : null;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-gold/28 bg-gradient-to-br from-gold/10 via-card/88 to-card/72">
        <VisualPlacementBackground placement={intelligenceHeroPlacement} tone="editorial" />
        <CardHeader className="relative z-[1] space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-gold/25 bg-gold/10 text-gold">
              <Sparkles size={12} className="mr-1" />
              Curated member intelligence
            </Badge>
            <MembershipTierBadge tier={selectedChannel.accessTier} />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
              Morning signal board
            </p>
            <CardTitle className="font-display text-3xl">BCN Intelligence</CardTitle>
            <CardDescription className="max-w-4xl text-base leading-relaxed">
              Start here before the wider news cycle. BCN Intelligence is built to give founders and operators the fastest read on what matters this morning, why it matters commercially, and what deserves a member conversation underneath.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="relative z-[1] grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Signal quality</p>
            <p className="mt-2 text-base font-semibold text-foreground">Ranked for operator relevance first</p>
            <p className="mt-2 text-sm text-muted">
              The strongest commercial movement lands first instead of letting pure recency decide what members see.
            </p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Briefing depth</p>
            <p className="mt-2 text-base font-semibold text-foreground">
              Fuller article detail before the BCN breakdown
            </p>
            <p className="mt-2 text-sm text-muted">
              The source detail now carries more of the company, product, region, scale, and timing context before BCN interpretation starts.
            </p>
          </div>
          <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Discussion pulse</p>
            <p className="mt-2 text-base font-semibold text-foreground">
              {discussionReadyCount} signal{discussionReadyCount === 1 ? "" : "s"} already drawing replies
            </p>
            <p className="mt-2 text-sm text-muted">
              Comments and replies still sit underneath every intelligence item using the existing member discussion stack.
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
              <CardTitle className="text-2xl">What matters this morning</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-relaxed">
                The page is ordered to help members catch the highest commercial signal fast, then drop into the detail only where it is genuinely worth their attention.
              </CardDescription>
            </CardHeader>
          </Card>

          {latestSignal ? (
            <Card className="overflow-hidden border-gold/32 bg-gradient-to-br from-gold/12 via-card/82 to-card/74 shadow-gold-soft">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-gold/28 bg-gold/10 text-gold">
                    <Sparkles size={12} className="mr-1" />
                    Today&apos;s signal
                  </Badge>
                  {latestSignalFreshness ? (
                    <Badge
                      variant="outline"
                      className="border-silver/16 bg-background/16 normal-case tracking-normal text-muted"
                    >
                      {latestSignalFreshness}
                    </Badge>
                  ) : null}
                  {getVisibleCommunityTags(latestSignal.tags).slice(0, 2).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-silver/16 bg-silver/10 normal-case tracking-normal text-silver"
                    >
                      {getBcnTagLabel(tag)}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gold">
                    Biggest founder signal in the last 24 hours
                  </p>
                  <CardTitle className="max-w-4xl text-3xl leading-tight">
                    {latestSignal.title}
                  </CardTitle>
                  <CardDescription className="max-w-4xl text-sm leading-relaxed text-foreground/80">
                    {latestSignalPreview?.articleDetail ??
                      latestSignalPreview?.keyDetail ??
                      "Selected because it has a direct operator angle for founders, leaders, and owner-led teams."}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-silver/14 bg-background/16 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Key detail</p>
                    <p className="mt-2 text-sm leading-7 text-foreground/88">
                      {latestSignalPreview?.keyDetail ?? latestSignalPreview?.whatHappened}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-silver/14 bg-background/16 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Why this matters</p>
                    <p className="mt-2 text-sm leading-7 text-foreground/88">
                      {latestSignalPreview?.whyThisMatters ??
                        "Worth discussing when the signal changes pricing, demand, staffing, execution, or strategic timing."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-silver/14 bg-background/16 px-4 py-4 md:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-silver">What to watch next</p>
                    <p className="mt-2 text-sm leading-7 text-foreground/88">
                      {latestSignalPreview?.whatToWatchNext ??
                        "Watch for whether the next updates show a wider operating shift rather than a single headline."}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-3 rounded-2xl border border-silver/14 bg-background/16 px-4 py-4">
                  <div className="space-y-2 text-sm text-muted">
                    <p>{latestSignal.commentCount} comment{latestSignal.commentCount === 1 ? "" : "s"}</p>
                    <p>{latestSignal.likeCount} like{latestSignal.likeCount === 1 ? "" : "s"}</p>
                    <p>{formatDate(latestSignal.createdAt)}</p>
                  </div>
                  <Link
                    href={buildCommunityPostPath(latestSignal.id, BCN_UPDATES_CHANNEL_SLUG)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gold transition-colors hover:text-gold/80"
                  >
                    Open full signal
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {feed.posts.length ? (
            <CommunityPostFeedList
              posts={rankedPosts}
              channelSlug={BCN_UPDATES_CHANNEL_SLUG}
              currentUserId={session.user.id}
              viewerCanContinuePrivately={
                Boolean(session.user.emailVerified) || session.user.role === "ADMIN"
              }
              initialExpandedPostId={expandedPostId}
              featuredPostId={latestSignal?.id ?? null}
            />
          ) : (
            <EmptyState
              icon={MessagesSquare}
              title="No BCN Signals yet"
              description="Once the BCN automation catches relevant stories inside the last 24 hours, they will appear here as clean discussion-ready intelligence items."
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
                BCN Intelligence is curated centrally, so members do not open top-level posts here.
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
                Signal board
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mostDiscussedSignal ? (
                <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Most discussed</p>
                  <Link
                    href={buildCommunityFeedPostPath(BCN_UPDATES_CHANNEL_SLUG, mostDiscussedSignal.id)}
                    className="mt-2 block text-sm font-medium text-foreground transition-colors hover:text-gold"
                  >
                    {mostDiscussedSignal.title}
                  </Link>
                  <p className="mt-2 text-xs text-muted">
                    {mostDiscussedSignal.commentCount} comment
                    {mostDiscussedSignal.commentCount === 1 ? "" : "s"} and {mostDiscussedSignal.likeCount} like
                    {mostDiscussedSignal.likeCount === 1 ? "" : "s"}
                  </p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Active categories</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topCategories.length ? (
                    topCategories.map(([tag, count]) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-silver/16 bg-silver/10 normal-case tracking-normal text-silver"
                      >
                        {getBcnTagLabel(tag)} {count}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted">Category signals will appear once posts publish.</span>
                  )}
                </div>
              </div>

              {rankedPosts.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  href={buildCommunityFeedPostPath(BCN_UPDATES_CHANNEL_SLUG, post.id)}
                  className="block rounded-2xl border border-silver/14 bg-background/18 px-4 py-4 transition-colors hover:border-silver/26 hover:bg-background/28"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {getVisibleCommunityTags(post.tags).slice(0, 1).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-silver/16 bg-silver/10 normal-case tracking-normal text-silver"
                      >
                        {getBcnTagLabel(tag)}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">{post.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>{getBcnFreshnessLabel(post.createdAt)}</span>
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

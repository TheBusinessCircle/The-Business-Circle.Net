import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MessagesSquare, RefreshCw, Sparkles, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { Badge } from "@/components/ui/badge";
import { CommunityPostFeedList } from "@/components/community/community-post-feed-list";
import { CommunitySourcePreview } from "@/components/community/community-post-discussion";
import { RoomGuidanceCard } from "@/components/community/room-guidance-card";
import { VisualPlacementBackground } from "@/components/visual-media";
import {
  BCN_UPDATES_CHANNEL_SLUG,
  BCN_UPDATES_MEMBER_ROUTE
} from "@/config/community";
import { getBcnCategoryLabel } from "@/lib/bcn-intelligence-sources";
import { getCommunityRoomGuidance } from "@/lib/community/room-guidance";
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
  getCommunityFeedPage
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

function sourceNameForPost(post: {
  intelligenceSourceName: string | null;
  sourceDomain: string | null;
}) {
  return post.intelligenceSourceName ?? post.sourceDomain ?? "BCN source";
}

function signalPublishedTime(post: {
  intelligencePublishedAt: string | null;
  createdAt: string;
}) {
  return post.intelligencePublishedAt ?? post.createdAt;
}

function isWithinHours(dateValue: string, hours: number) {
  const value = new Date(dateValue).getTime();
  if (Number.isNaN(value)) {
    return false;
  }

  return Date.now() - value <= hours * 60 * 60 * 1000;
}

function buildFilterHref(params: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
  }

  const query = next.toString();
  return query ? `${BCN_UPDATES_MEMBER_ROUTE}?${query}` : BCN_UPDATES_MEMBER_ROUTE;
}

const QUICK_FILTERS: Array<{
  label: string;
  updates: Record<string, string | null>;
}> = [
  { label: "All", updates: { filter: null, category: null } },
  { label: "Within 24h", updates: { filter: "24h", category: null } },
  { label: "Economy", updates: { filter: null, category: "economy" } },
  { label: "AI", updates: { filter: null, category: "ai" } },
  { label: "Hiring", updates: { filter: null, category: "hiring" } },
  { label: "Regulation", updates: { filter: null, category: "regulation" } },
  { label: "Marketing", updates: { filter: null, category: "marketing" } },
  { label: "UK Business", updates: { filter: null, category: "uk-business" } },
  { label: "Global Markets", updates: { filter: null, category: "global-markets" } }
];

export default async function BcnUpdatesPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const params = await searchParams;
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const tiers = allowedResourceTiers(effectiveTier);

  await ensureCommunityChannels();

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
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const resolvedValue = firstValue(value);
    if (resolvedValue) {
      urlParams.set(key, resolvedValue);
    }
  }
  const activeFilter = firstValue(params.filter) || "all";
  const activeCategory = getBcnCategoryLabel(firstValue(params.category)) || "";
  const activeSource = firstValue(params.source);
  const activeSort = firstValue(params.sort) || "relevant";
  const rankedPosts = sortBcnSignals(feed.posts);
  const sourceOptions = Array.from(
    new Map(
      rankedPosts.map((post) => [
        post.intelligenceSourceId ?? post.sourceDomain ?? sourceNameForPost(post),
        sourceNameForPost(post)
      ])
    ).entries()
  ).filter(([, label]) => Boolean(label));
  const filteredPosts = rankedPosts
    .filter((post) => {
      if (activeFilter === "24h" && !isWithinHours(signalPublishedTime(post), 24)) {
        return false;
      }

      if (
        activeCategory &&
        post.intelligencePrimaryCategory !== activeCategory &&
        !post.intelligenceSecondaryCategories.includes(activeCategory) &&
        !getVisibleCommunityTags(post.tags).some((tag) => getBcnCategoryLabel(tag) === activeCategory)
      ) {
        return false;
      }

      if (
        activeSource &&
        activeSource !== post.intelligenceSourceId &&
        activeSource !== post.sourceDomain &&
        activeSource !== sourceNameForPost(post)
      ) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      if (activeSort === "newest") {
        return signalPublishedTime(right).localeCompare(signalPublishedTime(left));
      }

      return 0;
    });
  const selectedChannel = feed.selectedChannel;
  const discussionReadyCount = filteredPosts.filter((post) => post.commentCount > 0).length;
  const latestSignal = filteredPosts[0] ?? rankedPosts[0] ?? null;
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
  const roomGuidance = getCommunityRoomGuidance(BCN_UPDATES_CHANNEL_SLUG);
  const recentlyRefreshedAt =
    rankedPosts
      .map((post) => signalPublishedTime(post))
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  return (
    <div className="member-page-stack bcn-overflow-safe max-w-full overflow-x-hidden px-0">
      <Card className="relative overflow-hidden border-gold/28 bg-gradient-to-br from-gold/10 via-card/88 to-card/72">
        <VisualPlacementBackground placement={intelligenceHeroPlacement} tone="editorial" />
        <CardHeader className="relative z-[1] space-y-4 px-4 sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="whitespace-normal border-gold/25 bg-gold/10 text-gold">
              <Sparkles size={12} className="mr-1" />
              Curated member intelligence
            </Badge>
            <MembershipTierBadge tier={selectedChannel.accessTier} />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-silver">
              Morning signal board
            </p>
            <CardTitle className="font-display text-2xl sm:text-3xl">BCN Intelligence</CardTitle>
            <CardDescription className="max-w-4xl text-base leading-relaxed">
              Start here before the wider news cycle. BCN Intelligence is built to give founders and operators the fastest read on what matters this morning, why it matters commercially, and what deserves a member conversation underneath.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="relative z-[1] grid gap-3 px-4 sm:px-7 md:grid-cols-3">
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

      {roomGuidance ? (
        <RoomGuidanceCard
          guidance={roomGuidance}
          roomSlug={BCN_UPDATES_CHANNEL_SLUG}
          ctaHref={latestSignal ? buildCommunityPostPath(latestSignal.id, BCN_UPDATES_CHANNEL_SLUG) : undefined}
          ctaLabel={latestSignal ? "Comment on latest signal" : undefined}
          showCta={Boolean(latestSignal)}
        />
      ) : null}

      <div className="grid max-w-full gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <Card className="border-silver/18 bg-card/68">
            <CardHeader className="px-4 sm:px-7">
              <CardTitle className="text-xl sm:text-2xl">Signal board</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-relaxed">
                Ranked for business-owner usefulness first, with source detail, BCN interpretation, and member discussion kept together.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-7">
              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map(({ label, updates }) => {
                  const isActive =
                    (label === "All" && activeFilter === "all" && !activeCategory) ||
                    (label === "Within 24h" && activeFilter === "24h") ||
                    (typeof updates.category === "string" &&
                      activeCategory === getBcnCategoryLabel(updates.category));

                  return (
                    <Link
                      key={label}
                      href={buildFilterHref(urlParams, updates)}
                      className={
                        isActive
                          ? "min-h-9 rounded-full border border-gold/35 bg-gold/12 px-3 py-1.5 text-sm text-gold"
                          : "min-h-9 rounded-full border border-silver/14 bg-background/16 px-3 py-1.5 text-sm text-muted transition-colors hover:border-silver/26 hover:text-foreground"
                      }
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildFilterHref(urlParams, { sort: "relevant" })}
                  className={
                    activeSort === "relevant"
                      ? "min-h-9 rounded-full border border-gold/35 bg-gold/12 px-3 py-1.5 text-sm text-gold"
                      : "min-h-9 rounded-full border border-silver/14 bg-background/16 px-3 py-1.5 text-sm text-muted transition-colors hover:border-silver/26 hover:text-foreground"
                  }
                >
                  Most relevant
                </Link>
                <Link
                  href={buildFilterHref(urlParams, { sort: "newest" })}
                  className={
                    activeSort === "newest"
                      ? "min-h-9 rounded-full border border-gold/35 bg-gold/12 px-3 py-1.5 text-sm text-gold"
                      : "min-h-9 rounded-full border border-silver/14 bg-background/16 px-3 py-1.5 text-sm text-muted transition-colors hover:border-silver/26 hover:text-foreground"
                  }
                >
                  Newest
                </Link>
                {sourceOptions.slice(0, 6).map(([sourceId, label]) => (
                  <Link
                    key={sourceId}
                    href={buildFilterHref(urlParams, { source: sourceId })}
                    className={
                      activeSource === sourceId
                        ? "min-h-9 rounded-full border border-gold/35 bg-gold/12 px-3 py-1.5 text-sm text-gold"
                        : "min-h-9 rounded-full border border-silver/14 bg-background/16 px-3 py-1.5 text-sm text-muted transition-colors hover:border-silver/26 hover:text-foreground"
                    }
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {latestSignal ? (
            <Card className="overflow-hidden border-gold/32 bg-gradient-to-br from-gold/12 via-card/82 to-card/74 shadow-gold-soft">
              <CardHeader className="space-y-4 px-4 sm:px-7">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="whitespace-normal border-gold/28 bg-gold/10 text-gold">
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
                  <CardTitle className="max-w-4xl text-2xl leading-tight sm:text-3xl">
                    {latestSignal.title}
                  </CardTitle>
                  <CardDescription className="max-w-4xl text-sm leading-relaxed text-foreground/80">
                    {latestSignal.intelligenceShortSummary ??
                      latestSignalPreview?.articleDetail ??
                      latestSignalPreview?.keyDetail ??
                      "Selected because it has a direct operator angle for founders, leaders, and owner-led teams."}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 sm:px-7 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-3">
                  {latestSignalPreview ? (
                    <CommunitySourcePreview
                      title={latestSignal.title}
                      sourceAttribution={latestSignalPreview.source}
                      previewImageUrl={latestSignal.previewImageUrl}
                      sourceUrl={latestSignal.sourceUrl}
                      sourceDomain={latestSignal.sourceDomain}
                      sourceName={latestSignal.intelligenceSourceName}
                      category={latestSignal.intelligencePrimaryCategory}
                    />
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-silver/14 bg-background/16 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Key detail</p>
                      <p className="mt-2 text-sm leading-7 text-foreground/88">
                        {latestSignal.intelligenceKeyDetail ??
                          latestSignalPreview?.keyDetail ??
                          latestSignalPreview?.whatHappened}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-silver/14 bg-background/16 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Why this matters</p>
                      <p className="mt-2 text-sm leading-7 text-foreground/88">
                        {latestSignal.intelligenceWhyThisMatters ??
                          latestSignalPreview?.whyThisMatters ??
                          "Worth discussing when the signal changes pricing, demand, staffing, execution, or strategic timing."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-silver/14 bg-background/16 px-4 py-4 md:col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-silver">What to watch next</p>
                      <p className="mt-2 text-sm leading-7 text-foreground/88">
                        {latestSignal.intelligenceWhatToWatchNext ??
                          latestSignalPreview?.whatToWatchNext ??
                          "Watch for whether the next updates show a wider operating shift rather than a single headline."}
                      </p>
                    </div>
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
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gold transition-colors hover:text-gold/80"
                  >
                    Open full signal
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {filteredPosts.length ? (
            <CommunityPostFeedList
              posts={filteredPosts}
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
              title="No signals found for this filter yet"
              description="Clear the filter or check again after the next intelligence refresh."
            />
          )}
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          <Card className="border-silver/16 bg-card/62">
            <CardHeader className="px-4 sm:px-7">
              <CardTitle className="inline-flex items-center gap-2 text-xl">
                <Workflow size={16} className="text-silver" />
                How this space works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 text-sm text-muted sm:px-7">
              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                BCN Intelligence is curated centrally, so members do not open top-level posts here.
              </div>
              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                Comments and replies stay enabled so each update can still become a useful member discussion.
              </div>
              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                Community remains the place for normal member-started rooms and broader conversation.
              </div>
              {session.user.role === "ADMIN" ? (
                <Link
                  href="/admin/intelligence"
                  className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-gold/24 bg-gold/10 px-4 py-3 text-sm font-medium text-gold transition-colors hover:border-gold/38"
                >
                  Refresh intelligence
                  <RefreshCw size={14} />
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-silver/16 bg-card/62">
            <CardHeader className="px-4 sm:px-7">
              <CardTitle className="inline-flex items-center gap-2 text-xl">
                <Sparkles size={16} className="text-silver" />
                Signal board
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 sm:px-7">
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

              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Sources monitored</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sourceOptions.slice(0, 5).map(([sourceId, label]) => (
                    <Badge
                      key={sourceId}
                      variant="outline"
                      className="border-silver/16 bg-silver/10 normal-case tracking-normal text-silver"
                    >
                      {label}
                    </Badge>
                  ))}
                  {!sourceOptions.length ? (
                    <span className="text-sm text-muted">Sources appear after the first refresh.</span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-muted">
                  Recently refreshed {recentlyRefreshedAt ? formatDate(recentlyRefreshedAt) : "after the next scheduled run"}.
                </p>
              </div>

              {filteredPosts.slice(0, 3).map((post) => (
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

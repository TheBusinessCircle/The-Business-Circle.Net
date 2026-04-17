import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Lock,
  MessageSquareText,
  MessagesSquare,
  Sparkles
} from "lucide-react";
import { MembershipTier } from "@prisma/client";
import type { CommunityFeedPageModel, CommunityRecentPostModel, PlatformEventModel } from "@/types";
import { ConversationComposer } from "@/components/community/conversation-composer";
import { CommunityPostFeedList } from "@/components/community/community-post-feed-list";
import { EventCard } from "@/components/events/event-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { authorName, buildCommunityPostPreview } from "@/lib/community-helpers";
import {
  buildCommunityChannelPath,
  buildCommunityFeedPostPath,
  buildCommunityPostPath
} from "@/lib/community-paths";
import {
  countActiveItems,
  countUniqueContributors,
  getFreshnessSignal,
  getSuggestedConversationPrompts,
  isActivityCurrent,
  rankPostsByMomentum
} from "@/lib/community-rhythm";
import { formatDate } from "@/lib/utils";

type CommunityFeedProps = {
  feed: CommunityFeedPageModel;
  upcomingEvents: PlatformEventModel[];
  membershipTier: MembershipTier;
  currentUserName?: string | null;
  initialExpandedPostId?: string | null;
  featuredConnectionWin?: CommunityRecentPostModel | null;
};

function FeedActivitySnapshot({
  channelSlug,
  posts
}: {
  channelSlug: string;
  posts: CommunityFeedPageModel["posts"];
}) {
  if (posts.length < 2) {
    return null;
  }

  const rankedPosts = rankPostsByMomentum(posts);
  const worthYourTime = rankedPosts[0] ?? null;
  const recentMovement = posts.filter((post) => post.id !== worthYourTime?.id).slice(0, 2);
  const activeNowCount = countActiveItems(posts.map((post) => ({ createdAt: post.createdAt })));

  if (!worthYourTime) {
    return null;
  }

  return (
    <Card className="border-silver/16 bg-card/62">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Worth your time</p>
          {activeNowCount ? (
            <Badge variant="outline" className="border-silver/18 bg-silver/10 text-silver">
              {activeNowCount} active now
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-xl">Useful movement in this room</CardTitle>
        <CardDescription>
          A quick read on what looks worth your time without turning the feed into noise.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Link
          href={buildCommunityFeedPostPath(channelSlug, worthYourTime.id)}
          className="rounded-2xl border border-silver/14 bg-background/20 px-4 py-4 transition-colors hover:border-silver/28 hover:bg-background/30"
        >
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Worth your time</p>
          <p className="mt-3 text-lg font-semibold text-foreground">{worthYourTime.title}</p>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
            {buildCommunityPostPreview(worthYourTime.content, worthYourTime.tags) ||
              "Open the discussion to read the full post."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span>{authorName(worthYourTime.user)}</span>
            <span>{worthYourTime.commentCount} comment{worthYourTime.commentCount === 1 ? "" : "s"}</span>
            <span>{worthYourTime.likeCount} like{worthYourTime.likeCount === 1 ? "" : "s"}</span>
          </div>
        </Link>

        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Recent movement</p>
          {recentMovement.map((post) => (
            <Link
              key={post.id}
              href={buildCommunityFeedPostPath(channelSlug, post.id)}
              className="block rounded-xl border border-silver/14 bg-background/18 px-4 py-3 transition-colors hover:border-silver/26 hover:bg-background/28"
            >
              <p className="text-sm font-medium text-foreground">{post.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                <span>{post.commentCount} comment{post.commentCount === 1 ? "" : "s"}</span>
                <span>{post.likeCount} like{post.likeCount === 1 ? "" : "s"}</span>
                <span className="text-silver">{formatDate(post.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CommunityFeed({
  feed,
  upcomingEvents,
  membershipTier,
  currentUserName,
  initialExpandedPostId,
  featuredConnectionWin
}: CommunityFeedProps) {
  if (!feed.selectedChannel) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Community rooms are not available yet"
        description="Admins can configure the discussion rooms from the control panel, then the feed will appear here."
      />
    );
  }

  const selectedChannel = feed.selectedChannel;
  const roomPromptSuggestions = getSuggestedConversationPrompts({
    membershipTier,
    channelSlug: selectedChannel.slug,
    limit: 3
  });
  const activeRoomCount = countActiveItems(feed.channels);
  const isSelectedRoomActive = isActivityCurrent(selectedChannel.lastActivityAt);
  const rankedPosts = rankPostsByMomentum(feed.posts);
  const topThread = rankedPosts[0] ?? null;
  const recentlyHappening = rankedPosts.slice(0, 3);
  const contributingMemberCount = countUniqueContributors(feed.posts);
  const bestPlaceToStart = feed.posts.length
    ? {
        title: "Read the strongest thread first",
        description:
          "Start with the discussion marked worth your time, then reply where you can add something useful.",
        href: buildCommunityFeedPostPath(selectedChannel.slug, topThread?.id ?? feed.posts[0].id),
        label: "Open current thread"
      }
    : roomPromptSuggestions[0]
      ? {
          title: "Use a prompt to start the room cleanly",
          description:
            "If you have something useful to contribute, begin with a prompt that fits the conversation style here.",
          href: buildCommunityChannelPath(selectedChannel.slug),
          label: "Start a conversation"
        }
      : {
          title: "Settle into the room first",
          description:
            "Scan the room description, then add a clear post when you have a useful question, lesson, or decision to share.",
          href: buildCommunityChannelPath(selectedChannel.slug),
          label: "Stay in this room"
        };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Card className="border-silver/22 bg-gradient-to-br from-silver/12 via-card/84 to-card/72">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Selected room</p>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-3xl">{selectedChannel.name}</CardTitle>
                  <MembershipTierBadge tier={selectedChannel.accessTier} />
                  {selectedChannel.isPrivate ? (
                    <Badge variant="outline" className="border-silver/18 bg-silver/10 text-silver">
                      <Lock size={11} className="mr-1" />
                      Private area
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="max-w-3xl text-base">
                  {selectedChannel.description || selectedChannel.topic || "Business discussion room"}
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-silver/18 text-silver">
                  {selectedChannel.postCount} {selectedChannel.postCount === 1 ? "post" : "posts"}
                </Badge>
                {activeRoomCount ? (
                  <Badge variant="outline" className="border-silver/18 bg-silver/10 text-silver">
                    {activeRoomCount} room{activeRoomCount === 1 ? "" : "s"} active now
                  </Badge>
                ) : null}
                {contributingMemberCount ? (
                  <Badge variant="outline" className="border-silver/18 text-silver">
                    {contributingMemberCount} member{contributingMemberCount === 1 ? "" : "s"} contributing
                  </Badge>
                ) : null}
                {isSelectedRoomActive ? (
                  <Badge variant="outline" className="border-gold/24 bg-gold/10 text-gold">
                    Active right now
                  </Badge>
                ) : null}
                {selectedChannel.lastActivityAt ? (
                  <Badge variant="outline" className="border-silver/18 text-silver">
                    Active {formatDate(selectedChannel.lastActivityAt)}
                  </Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
        </Card>

        <ConversationComposer
          channelName={selectedChannel.name}
          channelSlug={selectedChannel.slug}
          currentUserName={currentUserName}
          prompts={roomPromptSuggestions}
        />

        <FeedActivitySnapshot channelSlug={selectedChannel.slug} posts={feed.posts} />

        {feed.posts.length ? (
          <CommunityPostFeedList
            posts={feed.posts}
            channelSlug={selectedChannel.slug}
            initialExpandedPostId={initialExpandedPostId}
          />
        ) : (
          <EmptyState
            icon={MessagesSquare}
            title="This room is quiet so far"
            description="Start with a clear question, lesson, or decision so the first replies have something useful to build on."
          />
        )}
      </div>

      <div className="space-y-5">
        <Card className="border-silver/16 bg-card/62">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles size={16} className="text-silver" />
              Best place to start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted">
            <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Recommended for you</p>
              <p className="mt-3 text-base font-semibold text-foreground">{bestPlaceToStart.title}</p>
              <p className="mt-2 text-sm text-muted">{bestPlaceToStart.description}</p>
              <Link
                href={bestPlaceToStart.href}
                className="mt-4 inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
              >
                {bestPlaceToStart.label}
              </Link>
            </div>

            <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Next step</p>
              <p className="mt-3 text-sm text-muted">
                Keep titles clear, reply where you can add real context, and let the strongest discussions stay easy to revisit later.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-silver/16 bg-card/62">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ActivitySignal />
              Recently happening
            </CardTitle>
            <CardDescription>
              A cleaner read on active now, members contributing, and the threads carrying the best signal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Active now</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{activeRoomCount || 0}</p>
              </div>
              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Members contributing</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{contributingMemberCount}</p>
              </div>
            </div>

            {recentlyHappening.length ? (
              recentlyHappening.map((post) => (
                <Link
                  key={post.id}
                  href={buildCommunityFeedPostPath(selectedChannel.slug, post.id)}
                  className="block rounded-xl border border-silver/14 bg-background/18 px-4 py-3 transition-colors hover:border-silver/26 hover:bg-background/28"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{post.title}</p>
                    <span className="text-xs text-muted">
                      {getFreshnessSignal(post.createdAt, {
                        withinDayLabel: "Active today",
                        withinWeekLabel: "Updated this week",
                        fallbackPrefix: "Updated"
                      }).label}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>{post.commentCount} comment{post.commentCount === 1 ? "" : "s"}</span>
                    <span>{post.likeCount} like{post.likeCount === 1 ? "" : "s"}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-silver/14 bg-background/14 px-3 py-3 text-xs text-muted">
                New room activity will appear here as members start contributing.
              </p>
            )}
          </CardContent>
        </Card>

        {featuredConnectionWin ? (
          <Card className="border-silver/16 bg-card/62">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle2 size={16} className="text-silver" />
                Recent win
              </CardTitle>
              <CardDescription>
                A quiet example of something useful that moved because a good connection or conversation happened here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-silver/14 bg-background/18 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full border border-silver/15 bg-silver/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">
                    {featuredConnectionWin.channel.name}
                  </span>
                  <span className="text-xs text-muted">
                    {
                      getFreshnessSignal(featuredConnectionWin.createdAt, {
                        withinDayLabel: "Shared today",
                        withinWeekLabel: "Updated this week",
                        fallbackPrefix: "Shared"
                      }).label
                    }
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">{featuredConnectionWin.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {buildCommunityPostPreview(featuredConnectionWin.content, featuredConnectionWin.tags)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>{authorName(featuredConnectionWin.user)}</span>
                  <span>{formatDate(featuredConnectionWin.createdAt)}</span>
                </div>
                <Link
                  href={buildCommunityPostPath(featuredConnectionWin.id)}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-silver transition-colors hover:text-foreground"
                >
                  Read the full win
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-silver/16 bg-card/62">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarDays size={16} className="text-silver" />
              Upcoming events
            </CardTitle>
            <CardDescription>
              Relevant member sessions and live conversations across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.length ? (
              upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} variant="compact" />
              ))
            ) : (
              <p className="text-sm text-muted">No upcoming events are scheduled yet.</p>
            )}
            <Link href="/events">
              <Button variant="outline" className="w-full border-silver/16 hover:border-silver/28">
                View all events
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActivitySignal() {
  return <Sparkles size={16} className="text-silver" />;
}

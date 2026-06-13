import Link from "next/link";
import {
  CalendarDays,
  Lock,
  MessageSquareText,
  MessagesSquare,
  Sparkles
} from "lucide-react";
import { MembershipTier } from "@prisma/client";
import type { CommunityFeedPageModel, PlatformEventModel } from "@/types";
import { ConversationComposer } from "@/components/community/conversation-composer";
import { CommunityPostFeedList } from "@/components/community/community-post-feed-list";
import { RoomGuidanceCard } from "@/components/community/room-guidance-card";
import { EventCard } from "@/components/events/event-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import {
  buildCommunityChannelPath,
  buildCommunityFeedPostPath
} from "@/lib/community-paths";
import { getCommunityRoomGuidance } from "@/lib/community/room-guidance";
import {
  countActiveItems,
  countUniqueContributors,
  getFreshnessSignal,
  getSuggestedConversationPrompts,
  rankPostsByMomentum
} from "@/lib/community-rhythm";

type CommunityFeedProps = {
  feed: CommunityFeedPageModel;
  upcomingEvents: PlatformEventModel[];
  membershipTier: MembershipTier;
  currentUserName?: string | null;
  currentUserImage?: string | null;
  currentUserId: string;
  viewerCanContinuePrivately: boolean;
  initialExpandedPostId?: string | null;
  viewerIsAdmin?: boolean;
};

const ADMIN_PROMPTS = [
  "Ask members what they are working on this week",
  "Invite members to share one thing they want feedback on",
  "Start a weekly wins thread",
  "Start a what are you building thread",
  "Ask for one useful connection members would like"
];

export function CommunityFeed({
  feed,
  upcomingEvents,
  membershipTier,
  currentUserName,
  currentUserImage,
  currentUserId,
  viewerCanContinuePrivately,
  initialExpandedPostId,
  viewerIsAdmin = false
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
  const showComposer = selectedChannel.allowMemberPosts;
  const isEarlyRoom = !selectedChannel.isAutomatedFeed && selectedChannel.postCount <= 2;
  const showAdminStarterSuggestions = viewerIsAdmin && showComposer && isEarlyRoom;
  const roomGuidance = getCommunityRoomGuidance(selectedChannel.slug);
  const roomPromptSuggestions = getSuggestedConversationPrompts({
    membershipTier,
    channelSlug: selectedChannel.slug,
    limit: 3
  });
  const activeRoomCount = countActiveItems(feed.channels);
  const rankedPosts = rankPostsByMomentum(feed.posts);
  const topThread = rankedPosts[0] ?? null;
  const recentlyHappening = rankedPosts.slice(0, 3);
  const contributingMemberCount = countUniqueContributors(feed.posts);
  const helperLine =
    roomGuidance?.shortIntro ??
    `${selectedChannel.name} is for useful member conversations in this room.`;
  const emptyState = roomGuidance?.emptyState ?? {
    title: "This room is quiet so far",
    description: "Start with a clear question, lesson, or decision."
  };
  const bestPlaceToStart = topThread
    ? {
        title: topThread.title,
        detail: `${topThread.commentCount} comment${topThread.commentCount === 1 ? "" : "s"} and ${topThread.likeCount} like${topThread.likeCount === 1 ? "" : "s"}`,
        href: buildCommunityFeedPostPath(selectedChannel.slug, topThread.id),
        label: "Open"
      }
    : roomPromptSuggestions[0]
      ? {
          title: roomPromptSuggestions[0].title,
          detail: selectedChannel.name,
          href: buildCommunityChannelPath(selectedChannel.slug),
          label: "Start"
        }
      : {
          title: selectedChannel.name,
          detail: "Pick up the first useful conversation here.",
          href: buildCommunityChannelPath(selectedChannel.slug),
          label: "Stay here"
        };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <main className="min-w-0 space-y-4">
        {showComposer ? (
          <ConversationComposer
            id="start-community-post"
            channelName={selectedChannel.name}
            channelSlug={selectedChannel.slug}
            channels={feed.channels}
            currentUserName={currentUserName}
            currentUserImage={currentUserImage}
            prompts={roomPromptSuggestions}
          />
        ) : (
          <Card className="rounded-xl border-silver/18 bg-card/66">
            <CardContent className="flex items-start gap-3 p-4">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-silver/18 bg-silver/10 text-silver">
                <Lock size={14} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{selectedChannel.name}</p>
                  <MembershipTierBadge tier={selectedChannel.accessTier} />
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Top-level posts are managed here, but comments and replies stay open on existing discussions.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2 px-1">
          <p className="text-sm leading-relaxed text-muted">{helperLine}</p>
          {roomGuidance ? (
            <RoomGuidanceCard
              guidance={roomGuidance}
              roomSlug={`feed:${selectedChannel.slug}`}
              defaultCollapsed
              compact
              showCta={false}
            />
          ) : null}
        </div>

        {isEarlyRoom ? (
          <p className="rounded-lg border border-gold/18 bg-gold/10 px-3 py-2 text-sm text-gold/90">
            This room is early. The first few posts shape the standard for everyone who joins next.
          </p>
        ) : null}

        {feed.posts.length ? (
          <CommunityPostFeedList
            posts={feed.posts}
            channelSlug={selectedChannel.slug}
            channelName={selectedChannel.name}
            currentUserId={currentUserId}
            viewerCanContinuePrivately={viewerCanContinuePrivately}
            initialExpandedPostId={initialExpandedPostId}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-silver/18 bg-card/48 px-4 py-5">
            <div className="flex items-start gap-3">
              <MessagesSquare size={18} className="mt-0.5 shrink-0 text-silver" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{emptyState.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{emptyState.description}</p>
                {showComposer ? (
                  <a href="#start-community-post" className="mt-3 inline-flex">
                    <Button size="sm" variant="outline">
                      Post here
                    </Button>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>

      <aside className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start">
        <Card className="rounded-xl border-silver/16 bg-card/60">
          <CardHeader className="px-4 py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles size={15} className="text-silver" />
              Best place to start
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <Link
              href={bestPlaceToStart.href}
              className="block rounded-lg border border-silver/14 bg-background/18 px-3 py-3 transition-colors hover:border-silver/26 hover:bg-background/28"
            >
              <p className="text-sm font-medium text-foreground">{bestPlaceToStart.title}</p>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
                <span>{bestPlaceToStart.detail}</span>
                <span className="text-silver">{bestPlaceToStart.label}</span>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-silver/16 bg-card/60">
          <CardHeader className="px-4 py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles size={15} className="text-silver" />
              Recently happening
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-silver/14 bg-background/18 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Active now</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{activeRoomCount}</p>
              </div>
              <div className="rounded-lg border border-silver/14 bg-background/18 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Members</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{contributingMemberCount}</p>
              </div>
            </div>

            {recentlyHappening.length ? (
              recentlyHappening.map((post) => (
                <Link
                  key={post.id}
                  href={buildCommunityFeedPostPath(selectedChannel.slug, post.id)}
                  className="block rounded-lg border border-silver/14 bg-background/18 px-3 py-3 transition-colors hover:border-silver/26 hover:bg-background/28"
                >
                  <p className="line-clamp-2 text-sm font-medium text-foreground">{post.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>
                      {
                        getFreshnessSignal(post.createdAt, {
                          withinDayLabel: "Active today",
                          withinWeekLabel: "This week",
                          fallbackPrefix: "Updated"
                        }).label
                      }
                    </span>
                    <span>{post.commentCount} comments</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-silver/14 bg-background/14 px-3 py-3 text-sm text-muted">
                New room activity will appear here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-silver/16 bg-card/60">
          <CardHeader className="px-4 py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays size={15} className="text-silver" />
              Upcoming events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            {upcomingEvents.length ? (
              upcomingEvents.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} variant="compact" />
              ))
            ) : (
              <p className="text-sm text-muted">No upcoming events are scheduled yet.</p>
            )}
            <Link href="/events">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-silver/16 hover:border-silver/28"
              >
                View events
              </Button>
            </Link>
          </CardContent>
        </Card>

        {showAdminStarterSuggestions ? (
          <Card className="rounded-xl border-gold/18 bg-card/54">
            <CardContent className="p-4">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <MessageSquareText size={15} className="text-gold" />
                    Admin prompts
                  </span>
                  <span className="rounded-lg border border-gold/24 bg-gold/10 px-3 py-1.5 text-xs text-gold">
                    Open prompts
                  </span>
                </summary>
                <div className="mt-3 space-y-2">
                  {ADMIN_PROMPTS.map((suggestion) => (
                    <p
                      key={suggestion}
                      className="rounded-lg border border-silver/14 bg-background/18 px-3 py-2 text-sm leading-relaxed text-muted"
                    >
                      {suggestion}
                    </p>
                  ))}
                  <a href="#start-community-post" className="inline-flex w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-gold/24 text-gold hover:border-gold/40"
                    >
                      Start a prompt
                    </Button>
                  </a>
                </div>
              </details>
            </CardContent>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}

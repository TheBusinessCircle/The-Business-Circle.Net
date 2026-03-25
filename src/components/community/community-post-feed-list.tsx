"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { CommunityPostDetailModel, CommunityPostSummaryModel } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CommunityPostBody,
  CommunityPostCommentsSection,
  CommunityPostEngagementBar,
  CommunityPostTags
} from "@/components/community/community-post-discussion";
import { CommunityUserSignals } from "@/components/community/community-user-signals";
import {
  authorName,
  buildCommunityPostPreview,
  postKindBadge
} from "@/lib/community-helpers";
import {
  buildCommunityFeedPostPath,
  buildCommunityPostPath
} from "@/lib/community-paths";
import { buildMemberProfilePath } from "@/lib/member-paths";
import { cn, formatDate } from "@/lib/utils";

type CommunityPostFeedListProps = {
  posts: CommunityPostSummaryModel[];
  channelSlug: string;
  initialExpandedPostId?: string | null;
};

export function CommunityPostFeedList({
  posts,
  channelSlug,
  initialExpandedPostId
}: CommunityPostFeedListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryExpandedPostId = searchParams.get("post");
  const validExpandedPostId =
    (queryExpandedPostId || initialExpandedPostId) &&
    posts.some((post) => post.id === (queryExpandedPostId || initialExpandedPostId))
      ? (queryExpandedPostId || initialExpandedPostId || null)
      : null;

  const [expandedPostId, setExpandedPostId] = useState<string | null>(validExpandedPostId);
  const [detailsById, setDetailsById] = useState<Record<string, CommunityPostDetailModel>>({});
  const [loadingByPostId, setLoadingByPostId] = useState<Record<string, boolean>>({});
  const [errorByPostId, setErrorByPostId] = useState<Record<string, string>>({});
  const requestControllersRef = useRef<Record<string, AbortController>>({});

  useEffect(() => {
    setExpandedPostId((current) => (current === validExpandedPostId ? current : validExpandedPostId));
  }, [validExpandedPostId]);

  const syncExpandedStateToUrl = useCallback(
    (postId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (postId) {
        params.set("post", postId);
      } else {
        params.delete("post");
      }

      const query = params.toString();
      const nextPath = query ? `${pathname}?${query}` : pathname;
      router.replace(nextPath, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const loadPostDetail = useCallback(
    async (postId: string) => {
      if (detailsById[postId] || loadingByPostId[postId]) {
        return;
      }

      requestControllersRef.current[postId]?.abort();
      const controller = new AbortController();
      requestControllersRef.current[postId] = controller;

      setLoadingByPostId((current) => ({
        ...current,
        [postId]: true
      }));
      setErrorByPostId((current) => {
        const next = { ...current };
        delete next[postId];
        return next;
      });

      try {
        const response = await fetch(`/api/community/posts/${postId}`, {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("post-detail-unavailable");
        }

        const payload = (await response.json()) as {
          post: CommunityPostDetailModel;
        };

        setDetailsById((current) => ({
          ...current,
          [postId]: payload.post
        }));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setErrorByPostId((current) => ({
          ...current,
          [postId]: "We could not load this discussion right now."
        }));
      } finally {
        delete requestControllersRef.current[postId];
        setLoadingByPostId((current) => {
          const next = { ...current };
          delete next[postId];
          return next;
        });
      }
    },
    [detailsById, loadingByPostId]
  );

  useEffect(() => {
    if (expandedPostId) {
      void loadPostDetail(expandedPostId);
    }
  }, [expandedPostId, loadPostDetail]);

  useEffect(
    () => () => {
      Object.values(requestControllersRef.current).forEach((controller) => controller.abort());
    },
    []
  );

  return (
    <div className="space-y-5">
      {posts.map((post) => {
        const isExpanded = expandedPostId === post.id;
        const detail = detailsById[post.id];
        const displayName = authorName(post.user);
        const preview = buildCommunityPostPreview(post.content, post.tags);
        const feedReturnPath = buildCommunityFeedPostPath(channelSlug, post.id);
        const detailPath = buildCommunityPostPath(post.id);
        const engagementPost = detail ?? post;

        return (
          <Card
            key={post.id}
            className={cn(
              "border-silver/14 bg-card/68 shadow-panel-soft transition-all duration-200",
              "hover:border-silver/24 hover:bg-card/74",
              isExpanded ? "border-silver/26" : ""
            )}
          >
            <CardHeader className="space-y-4">
              <div className="flex items-start gap-3">
                <Link
                  href={buildMemberProfilePath(post.user.id)}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl transition-colors hover:text-foreground"
                >
                  <Avatar name={displayName} image={post.user.image} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-medium text-foreground">{displayName}</p>
                      <MembershipTierBadge tier={post.user.membershipTier} className="shrink-0" />
                      <FoundingBadge tier={post.user.foundingTier} />
                      {postKindBadge(post.kind, post.tags)}
                    </div>
                    <CommunityUserSignals user={post.user} />
                    <p className="mt-1 text-xs text-muted">{formatDate(post.createdAt)}</p>
                  </div>
                </Link>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextPostId = isExpanded ? null : post.id;
                  setExpandedPostId(nextPostId);
                  syncExpandedStateToUrl(nextPostId);
                }}
                className={cn(
                  "group block w-full rounded-2xl border border-transparent px-1 py-1 text-left transition-all duration-200",
                  "cursor-pointer hover:border-silver/16 hover:bg-background/16"
                )}
                aria-expanded={isExpanded}
                aria-controls={`community-post-panel-${post.id}`}
              >
                <div className="space-y-3">
                  <CardTitle className="text-2xl leading-tight">{post.title}</CardTitle>
                  <p className="line-clamp-3 text-sm leading-7 text-foreground/85">{preview}</p>
                  <div className="flex items-center justify-between gap-3 text-sm text-muted">
                    <span>{isExpanded ? "Collapse inline view" : "Read inline"}</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </button>

              {!isExpanded ? <CommunityPostTags tags={post.tags} /> : null}
            </CardHeader>

            <CardContent className="space-y-5">
              {!isExpanded ? (
                <CommunityPostEngagementBar
                  post={post}
                  discussionHref={detailPath}
                  discussionLabel="Open full discussion"
                  onReplyClick={() => {
                    setExpandedPostId(post.id);
                    syncExpandedStateToUrl(post.id);
                  }}
                  replyLabel="Reply inline"
                />
              ) : null}

              {isExpanded ? (
                <div
                  id={`community-post-panel-${post.id}`}
                  className="space-y-5 border-t border-silver/12 pt-5 transition-[opacity,transform] duration-200"
                >
                  {detail ? (
                    <>
                      <CommunityPostBody post={detail} />
                      <CommunityPostEngagementBar
                        post={engagementPost}
                        discussionHref={detailPath}
                        discussionLabel="Open full discussion"
                        onReplyClick={() => {
                          document.getElementById("discussion-reply")?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                          });
                        }}
                        replyLabel="Reply below"
                      />
                    </>
                  ) : (
                    <CommunityPostEngagementBar
                      post={engagementPost}
                      discussionHref={detailPath}
                      discussionLabel="Open full discussion"
                      onReplyClick={() => {
                        document.getElementById(`community-post-panel-${post.id}`)?.scrollIntoView({
                          behavior: "smooth",
                          block: "start"
                        });
                      }}
                      replyLabel="Reply below"
                    />
                  )}

                  {loadingByPostId[post.id] ? (
                    <div className="space-y-4 border-t border-silver/12 pt-5">
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <Loader2 size={14} className="animate-spin" />
                        Loading discussion
                      </div>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-11/12" />
                      <Skeleton className="h-24 w-full rounded-2xl" />
                    </div>
                  ) : detail ? (
                    <CommunityPostCommentsSection post={detail} returnPath={feedReturnPath} />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-silver/14 bg-background/10 p-4 text-sm text-muted">
                      <p>{errorByPostId[post.id] ?? "This discussion could not be opened right now."}</p>
                      <button
                        type="button"
                        onClick={() => {
                          void loadPostDetail(post.id);
                        }}
                        className="mt-3 text-sm font-medium text-gold transition-colors hover:text-gold/80"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Filter,
  MessageCircle,
  MessageSquareText,
  ShieldAlert,
  Trash2
} from "lucide-react";
import {
  CommunityCommentRemoveForm,
  CommunityPostRemoveForm,
  CommunityRefreshActions
} from "@/components/admin/community-safety-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import {
  listCommunityChannelsForAdmin,
  listCommunityCommentsForAdmin,
  listCommunityPostsForAdmin,
  type CommunityAdminOrder
} from "@/server/community/community-safety-admin.service";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Community Safety",
  description:
    "Admin-only tools for launch refresh, community post moderation and community comment moderation.",
  path: "/admin/community"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseOrder(value: string): CommunityAdminOrder {
  return value === "oldest" ? "oldest" : "newest";
}

export default async function AdminCommunitySafetyPage({ searchParams }: PageProps) {
  await requireAdmin();

  const params = await searchParams;
  const postQuery = firstValue(params.postQ).trim();
  const commentQuery = firstValue(params.commentQ).trim();
  const channelId = firstValue(params.channel).trim();
  const postOrder = parseOrder(firstValue(params.postOrder));
  const commentOrder = parseOrder(firstValue(params.commentOrder));

  const [channels, posts, comments] = await Promise.all([
    listCommunityChannelsForAdmin(),
    listCommunityPostsForAdmin({
      query: postQuery,
      channelId,
      order: postOrder
    }),
    listCommunityCommentsForAdmin({
      query: commentQuery,
      channelId,
      order: commentOrder
    })
  ]);

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
                <ShieldAlert size={12} className="mr-1" />
                Admin Only
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Community Safety</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                Review, refresh and remove community posts or comments across the full member
                environment without exposing these controls outside the admin panel.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-silver/35 bg-silver/10 text-silver">
                {posts.total} posts in filter
              </Badge>
              <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                {comments.total} comments in filter
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-red-500/35 bg-red-500/10">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <AlertTriangle size={18} />
            Community Refresh
          </CardTitle>
          <CardDescription>
            Launch Refresh. Use this to clear testing conversations before opening the community
            properly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border border-red-500/30 bg-background/35 p-4">
            <p className="text-sm font-medium text-red-100">
              This is a destructive launch-cleanup tool. Use only when preparing the community for
              a clean launch or when removing unsafe content.
            </p>
          </div>
          <CommunityRefreshActions />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Filter size={16} />
            Ongoing Moderation
          </CardTitle>
          <CardDescription>
            Review and remove posts or comments across the full community environment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="grid gap-4 lg:grid-cols-[1fr_1fr_220px_170px_170px_auto]">
            <div className="space-y-2">
              <Label htmlFor="postQ">Search posts</Label>
              <Input
                id="postQ"
                name="postQ"
                defaultValue={postQuery}
                placeholder="Author, title, post, room"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commentQ">Search comments</Label>
              <Input
                id="commentQ"
                name="commentQ"
                defaultValue={commentQuery}
                placeholder="Comment, author, post, room"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Community section</Label>
              <Select id="channel" name="channel" defaultValue={channelId}>
                <option value="">All sections</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postOrder">Post order</Label>
              <Select id="postOrder" name="postOrder" defaultValue={postOrder}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commentOrder">Comment order</Label>
              <Select id="commentOrder" name="commentOrder" defaultValue={commentOrder}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" variant="outline" size="sm">
                Apply
              </Button>
              <Link href="/admin/community">
                <Button type="button" variant="ghost" size="sm">
                  Reset
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <MessageSquareText size={17} />
            All Posts
          </CardTitle>
          <CardDescription>
            Showing up to {posts.limit} active community posts for the current filter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {posts.items.length ? (
            posts.items.map((post) => (
              <article key={post.id} className="rounded-2xl border border-border/80 bg-background/30 p-4">
                <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-gold/30 bg-gold/10 text-gold">
                        {post.status}
                      </Badge>
                      <Badge variant="outline" className="text-muted normal-case tracking-normal">
                        {post.channelName}
                      </Badge>
                      <Badge variant="outline" className="text-muted normal-case tracking-normal">
                        {post.commentCount} comments
                      </Badge>
                      <Badge variant="outline" className="text-muted normal-case tracking-normal">
                        {post.kind.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-display text-lg text-foreground">
                        {post.title || post.preview}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{post.preview}</p>
                    </div>

                    <dl className="grid gap-2 text-xs text-muted sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-foreground">Author</dt>
                        <dd>{post.authorName}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground">Email</dt>
                        <dd className="break-all">{post.authorEmail ?? "Not available"}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground">Section</dt>
                        <dd>{post.channelTopic || post.channelSlug}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground">Created</dt>
                        <dd>{formatDate(post.createdAt)}</dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap gap-2">
                      <Link href={post.href} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="outline" size="sm">
                          View related area
                        </Button>
                      </Link>
                      <Link href={post.channelHref} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="sm">
                          Open section
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3">
                    <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-red-100">
                      <Trash2 size={13} />
                      Remove post
                    </p>
                    <CommunityPostRemoveForm postId={post.id} />
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              icon={MessageSquareText}
              title="No posts match this filter"
              description="Adjust the search or section filter to review active community posts."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <MessageCircle size={17} />
            All Comments
          </CardTitle>
          <CardDescription>
            Showing up to {comments.limit} active community comments for the current filter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {comments.items.length ? (
            comments.items.map((comment) => (
              <article key={comment.id} className="rounded-2xl border border-border/80 bg-background/30 p-4">
                <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-gold/30 bg-gold/10 text-gold">
                        Active
                      </Badge>
                      <Badge variant="outline" className="text-muted normal-case tracking-normal">
                        {comment.channelName}
                      </Badge>
                      <Badge variant="outline" className="text-muted normal-case tracking-normal">
                        Parent post
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-display text-lg text-foreground">{comment.preview}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        On: {comment.postTitle || comment.postPreview}
                      </p>
                    </div>

                    <dl className="grid gap-2 text-xs text-muted sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-foreground">Author</dt>
                        <dd>{comment.authorName}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground">Email</dt>
                        <dd className="break-all">{comment.authorEmail ?? "Not available"}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground">Section</dt>
                        <dd>{comment.channelTopic || comment.channelSlug}</dd>
                      </div>
                      <div>
                        <dt className="text-foreground">Created</dt>
                        <dd>{formatDate(comment.createdAt)}</dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap gap-2">
                      <Link href={comment.href} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="outline" size="sm">
                          View related area
                        </Button>
                      </Link>
                      <Link href={comment.channelHref} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="sm">
                          Open section
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3">
                    <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-red-100">
                      <Trash2 size={13} />
                      Remove comment
                    </p>
                    <CommunityCommentRemoveForm commentId={comment.id} />
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              icon={MessageCircle}
              title="No comments match this filter"
              description="Adjust the search or section filter to review active community comments."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

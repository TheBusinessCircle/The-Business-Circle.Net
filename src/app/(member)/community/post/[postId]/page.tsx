import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MoveLeft, NotebookText } from "lucide-react";
import type { MembershipTier } from "@prisma/client";
import { authorName, postKindBadge } from "@/lib/community-helpers";
import { roleToTier } from "@/lib/permissions";
import { buildCommunityChannelPath, buildCommunityPostPath } from "@/lib/community-paths";
import { buildMemberProfilePath } from "@/lib/member-paths";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { CommunityUserSignals } from "@/components/community/community-user-signals";
import { CommunityPostDiscussion } from "@/components/community/community-post-discussion";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FoundingBadge } from "@/components/ui/founding-badge";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { formatDate } from "@/lib/utils";
import { getCommunityPostDetail } from "@/server/community";

type PageProps = {
  params: Promise<{ postId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Community discussion",
  description: "Member discussion thread inside Business Circle community.",
  path: "/community/post",
  noIndex: true
});

export const dynamic = "force-dynamic";

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
    "comment-invalid": "Please add a little more detail before posting that comment.",
    "comment-blocked": "Please rewrite that before posting. We block profanity and abusive language to keep the community useful for everyone.",
    "comment-forbidden": "That comment is no longer available in this discussion.",
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

function roomTierLabel(tier: MembershipTier) {
  if (tier === "CORE") {
    return "Core room";
  }

  if (tier === "INNER_CIRCLE") {
    return "Inner Circle room";
  }

  return "Foundation room";
}

export default async function CommunityPostPage({ params, searchParams }: PageProps) {
  const session = await requireUser();
  const { postId } = await params;
  const resolvedSearchParams = await searchParams;
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const post = await getCommunityPostDetail({
    postId,
    viewerUserId: session.user.id,
    viewerTier: effectiveTier
  });

  if (!post) {
    redirect("/community?error=post-forbidden");
  }

  const feedback = feedbackMessage({
    notice: firstValue(resolvedSearchParams.notice),
    error: firstValue(resolvedSearchParams.error)
  });
  const returnPath = buildCommunityPostPath(post.id);
  const channelPath = buildCommunityChannelPath(post.channel.slug);
  const displayName = authorName(post.user);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={channelPath}
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        >
          <MoveLeft size={14} />
          Back to community
        </Link>
      </div>

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
              className={feedback.type === "error" ? "text-sm text-red-100" : "text-sm text-gold"}
            >
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden border-gold/35 bg-gradient-to-br from-gold/10 via-card/82 to-card/70">
          <CardHeader className="space-y-4">
            <Link
              href={buildMemberProfilePath(post.user.id)}
              className="flex items-start gap-3 rounded-2xl transition-colors hover:text-foreground"
            >
              <Avatar name={displayName} image={post.user.image} className="h-12 w-12" />
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

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="normal-case tracking-normal text-muted">
                {post.channel.name}
              </Badge>
              <Badge variant="outline" className="normal-case tracking-normal text-muted">
                {roomTierLabel(post.channel.accessTier)}
              </Badge>
            </div>

            <div className="space-y-2">
              <CardTitle className="max-w-4xl text-4xl leading-tight">{post.title}</CardTitle>
              <CardDescription className="max-w-3xl text-base">
                A focused discussion view for deeper reading and better replies.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <CommunityPostDiscussion
              post={post}
              returnPath={returnPath}
              currentUserId={session.user.id}
              viewerCanContinuePrivately={Boolean(session.user.emailVerified)}
            />
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <NotebookText size={16} />
                Discussion context
              </CardTitle>
              <CardDescription>
                Keep replies clear, useful, and easy for the next person to follow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted">
              <div className="rounded-2xl border border-border/70 bg-background/20 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Room</p>
                <p className="mt-2 text-sm font-medium text-foreground">{post.channel.name}</p>
                <p className="mt-2 leading-relaxed">
                  {post.channel.description || post.channel.topic || "Member discussion area."}
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/20 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Navigation</p>
                <div className="mt-3 space-y-2">
                  <Link
                    href={channelPath}
                    className="block rounded-xl border border-border/70 bg-background/20 px-3 py-2 text-sm text-foreground transition-colors hover:border-gold/35"
                  >
                    Return to {post.channel.name}
                  </Link>
                  <Link
                    href="/community"
                    className="block rounded-xl border border-border/70 bg-background/20 px-3 py-2 text-sm text-foreground transition-colors hover:border-gold/35"
                  >
                    View all community rooms
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

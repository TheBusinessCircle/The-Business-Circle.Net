import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { AlertTriangle, Filter, MessageSquare, Sparkles, Trash2 } from "lucide-react";
import {
  deleteModerationMessageAction,
  runCommunityPromptCheckAction
} from "@/actions/admin/community-moderation.actions";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Community Moderation",
  description:
    "Moderate member chat messages with searchable channel filters and direct admin delete controls.",
  path: "/admin/community"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "message-deleted": "Message removed from the community feed.",
    "prompt-published": "A quiet-time founder prompt was published.",
    "prompt-skipped": "No prompt was published because the current safeguards decided to skip it."
  };

  const errorMap: Record<string, string> = {
    invalid: "The moderation action payload was invalid.",
    "not-found": "This message no longer exists or was already deleted."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function buildReturnPath(input: {
  query: string;
  channelId: string;
  includeDeleted: boolean;
}): string {
  const url = new URL("/admin/community", "http://localhost");

  if (input.query) {
    url.searchParams.set("q", input.query);
  }
  if (input.channelId) {
    url.searchParams.set("channel", input.channelId);
  }
  if (input.includeDeleted) {
    url.searchParams.set("includeDeleted", "1");
  }

  return `${url.pathname}${url.search}`;
}

export default async function AdminCommunityModerationPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const channelId = firstValue(params.channel);
  const includeDeleted = firstValue(params.includeDeleted) === "1";

  const where: Prisma.MessageWhereInput = {
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(channelId ? { channelId } : {}),
    ...(query
      ? {
          OR: [
            {
              content: {
                contains: query,
                mode: "insensitive"
              }
            },
            {
              user: {
                OR: [
                  {
                    name: {
                      contains: query,
                      mode: "insensitive"
                    }
                  },
                  {
                    email: {
                      contains: query,
                      mode: "insensitive"
                    }
                  }
                ]
              }
            },
            {
              channel: {
                OR: [
                  {
                    name: {
                      contains: query,
                      mode: "insensitive"
                    }
                  },
                  {
                    slug: {
                      contains: query,
                      mode: "insensitive"
                    }
                  }
                ]
              }
            }
          ]
        }
      : {})
  };

  const [channels, messages, totalVisibleCount, deletedCount] = await Promise.all([
    db.channel.findMany({
      where: {
        isArchived: false
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true
      }
    }),
    db.message.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      take: 120,
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        parentMessageId: true,
        channel: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            membershipTier: true
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      }
    }),
    db.message.count({
      where
    }),
    db.message.count({
      where: {
        deletedAt: {
          not: null
        }
      }
    })
  ]);

  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const returnPath = buildReturnPath({ query, channelId, includeDeleted });

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
                <MessageSquare size={12} className="mr-1" />
                Community Moderation
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Message Moderation</CardTitle>
              <CardDescription className="mt-2 text-base">
                Review community activity and remove problematic messages without joining member chat.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-silver/35 bg-silver/10 text-silver">
                {totalVisibleCount} visible in filter
              </Badge>
              <Badge variant="outline" className="border-border text-muted">
                {deletedCount} deleted total
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Sparkles size={16} />
            Quiet-Time Prompt Check
          </CardTitle>
          <CardDescription>
            Run the same guarded inactivity check used by the automation route. It will only publish if the safeguards allow it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={runCommunityPromptCheckAction}>
            <input type="hidden" name="returnPath" value={returnPath} />
            <Button type="submit" variant="outline">
              Run Quiet-Time Check
            </Button>
          </form>
        </CardContent>
      </Card>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/40 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-200" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Filter size={16} />
            Filter Activity
          </CardTitle>
          <CardDescription>
            Search by message content, member identity, or channel. Include deleted messages when auditing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="grid gap-4 md:grid-cols-[1fr_260px_auto]">
            <div className="space-y-2">
              <Label htmlFor="q">Search</Label>
              <Input id="q" name="q" defaultValue={query} placeholder="Message, member email, or channel" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select id="channel" name="channel" defaultValue={channelId}>
                <option value="">All channels</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name} (#{channel.slug})
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col justify-end gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  name="includeDeleted"
                  value="1"
                  defaultChecked={includeDeleted}
                  className="h-4 w-4 rounded border-border bg-background"
                />
                Include deleted
              </label>
              <div className="flex gap-2">
                <Button type="submit" variant="outline" size="sm">
                  Apply
                </Button>
                <Link href="/admin/community">
                  <Button type="button" variant="ghost" size="sm">
                    Reset
                  </Button>
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
          <CardDescription>
            Showing up to 120 newest messages for the current filter set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length ? (
            messages.map((message) => {
              const displayName = message.user.name || message.user.email;
              const isDeleted = Boolean(message.deletedAt);

              return (
                <article key={message.id} className="rounded-xl border border-border/80 bg-background/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{displayName}</p>
                      <p className="text-xs text-muted">{message.user.email}</p>
                      <div className="flex flex-wrap gap-2">
                        <MembershipTierBadge tier={message.user.membershipTier} />
                        <Badge variant="outline" className="text-muted normal-case tracking-normal">
                          #{message.channel.slug}
                        </Badge>
                        {message.parentMessageId ? (
                          <Badge variant="outline" className="text-muted normal-case tracking-normal">
                            Reply
                          </Badge>
                        ) : null}
                        {message._count.replies > 0 ? (
                          <Badge variant="outline" className="text-muted normal-case tracking-normal">
                            {message._count.replies} replies
                          </Badge>
                        ) : null}
                        {isDeleted ? <Badge variant="danger">Deleted</Badge> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/community?channel=${message.channel.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="outline" size="sm">
                          Open Channel
                        </Button>
                      </Link>
                      {!isDeleted ? (
                        <form action={deleteModerationMessageAction}>
                          <input type="hidden" name="messageId" value={message.id} />
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <Button type="submit" variant="danger" size="sm">
                            <Trash2 size={13} className="mr-1" />
                            Delete
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-sm text-foreground">
                    {message.content}
                  </p>

                  <p className="mt-2 text-xs text-muted">
                    Posted {formatDate(message.createdAt)}
                    {isDeleted ? ` • Deleted ${formatDate(message.deletedAt as Date)}` : ""}
                    {!isDeleted && message.updatedAt.getTime() !== message.createdAt.getTime()
                      ? ` • Updated ${formatDate(message.updatedAt)}`
                      : ""}
                  </p>
                </article>
              );
            })
          ) : (
            <EmptyState
              icon={AlertTriangle}
              title="No messages match this filter"
              description="Adjust filters or clear search to review recent community activity."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

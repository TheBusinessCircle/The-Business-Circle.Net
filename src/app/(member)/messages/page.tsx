import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Search, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MessagesRealtimeRefresh } from "@/components/messages";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { getDirectMessageNavCounts, listDirectMessageRequests, listInboxThreads } from "@/server/messages";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Messages",
  description: "Private business conversations that begin in community and continue with consent.",
  path: "/messages",
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
    "request-sent": "Your private chat request has been sent.",
    "chat-archived": "This conversation has been archived.",
    "chat-restored": "This conversation is active again.",
    "user-blocked": "That member has been blocked from private chat.",
    "report-submitted": "Your report has been submitted for review."
  };

  const errorMap: Record<string, string> = {
    "thread-not-found": "That private conversation is no longer available.",
    "thread-update-failed": "We could not update that conversation right now."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function MessagesPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const view = firstValue(params.view) === "archived" ? "archived" : "active";

  const [threads, counts, pendingRequests] = await Promise.all([
    listInboxThreads({
      userId: session.user.id,
      query,
      includeArchived: view === "archived"
    }),
    getDirectMessageNavCounts(session.user.id),
    listDirectMessageRequests({
      userId: session.user.id,
      direction: "received",
      status: "PENDING"
    })
  ]);

  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });

  return (
    <div className="space-y-6">
      <MessagesRealtimeRefresh userId={session.user.id} />

      <Card className="border-gold/30 bg-gradient-to-br from-gold/10 via-card/78 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                <ShieldCheck size={12} className="mr-1" />
                Private conversations
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Messages</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                Private chat extends a real community interaction. It is built for useful follow-through, collaboration, and the work that happens after a strong public exchange.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-silver/16 bg-silver/10 text-silver">
                {counts.unreadCount} unread
              </Badge>
              <Link href="/messages/requests">
                <Button variant="outline" size="sm">
                  Requests
                  {pendingRequests.length ? (
                    <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] text-gold">
                      {pendingRequests.length}
                    </span>
                  ) : null}
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/35 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-100" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>
            Search conversations, review unread private threads, or switch to archived chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input name="q" defaultValue={query} className="pl-9" placeholder="Search member, company, or conversation" />
            </div>

            <input type="hidden" name="view" value={view} />
            <Button type="submit" variant="outline">
              Search
            </Button>

            <div className="flex gap-2">
              <Link href={view === "active" ? "/messages?view=archived" : "/messages"}>
                <Button type="button" variant="ghost">
                  {view === "active" ? "View archived" : "View active"}
                </Button>
              </Link>
            </div>
          </form>

          <div className="space-y-3">
            {threads.length ? (
              threads.map((thread) => (
                <Link key={thread.id} href={`/messages/${thread.id}`} className="block">
                  <article className="rounded-[24px] border border-silver/14 bg-background/18 px-5 py-4 transition-colors hover:border-silver/24 hover:bg-background/28">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-medium text-foreground">
                            {thread.otherMember.name ?? thread.otherMember.email}
                          </p>
                          {thread.unreadCount ? (
                            <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
                              {thread.unreadCount} unread
                            </Badge>
                          ) : null}
                          {thread.isMuted ? <Badge variant="outline" className="text-muted">Muted</Badge> : null}
                          {thread.isArchived ? <Badge variant="outline" className="text-muted">Archived</Badge> : null}
                        </div>
                        <p className="text-sm text-muted">
                          {thread.otherMember.companyName || thread.otherMember.headline || "Member"}
                        </p>
                        <p className="text-sm leading-7 text-foreground/88">
                          {thread.lastMessagePreview || "Open the thread to continue the conversation."}
                        </p>
                      </div>

                      <div className="space-y-2 text-right text-xs text-muted">
                        <p>{thread.lastMessageAt ? formatDate(thread.lastMessageAt) : "No replies yet"}</p>
                        {thread.origin?.postTitle ? (
                          <p className="max-w-[220px]">
                            From: {thread.origin.postTitle}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </Link>
              ))
            ) : (
              <EmptyState
                icon={Inbox}
                title={view === "archived" ? "No archived conversations" : "No private conversations yet"}
                description={
                  view === "archived"
                    ? "Archived private chats will appear here when you move them out of the main inbox."
                    : "Private chat opens after a useful community interaction. When a request is accepted, the thread will appear here."
                }
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

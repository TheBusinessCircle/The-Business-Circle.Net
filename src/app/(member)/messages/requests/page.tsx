import type { Metadata } from "next";
import { Flag, MessageSquareLock } from "lucide-react";
import { respondToDirectMessageRequestAction, reportDirectMessageAction } from "@/actions/messages/messages.actions";
import { MessagesRealtimeRefresh } from "@/components/messages";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { listDirectMessageRequests } from "@/server/messages";

export const metadata: Metadata = createPageMetadata({
  title: "Private chat requests",
  description: "Review incoming private chat requests and decide which conversations continue beyond community.",
  path: "/messages/requests",
  noIndex: true
});

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "request-accepted": "Private chat has been opened.",
    "request-declined": "The request has been declined.",
    "request-blocked": "The sender has been blocked from private chat.",
    "report-submitted": "Your report has been submitted."
  };

  const errorMap: Record<string, string> = {
    "request-response-failed": "We could not update that request right now.",
    "report-failed": "We could not submit that report."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

export default async function MessageRequestsPage({ searchParams }: PageProps) {
  const session = await requireUser();
  const params = await searchParams;

  const [receivedRequests, sentRequests] = await Promise.all([
    listDirectMessageRequests({
      userId: session.user.id,
      direction: "received"
    }),
    listDirectMessageRequests({
      userId: session.user.id,
      direction: "sent"
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
        <CardHeader>
          <Badge variant="outline" className="w-fit border-gold/35 bg-gold/12 text-gold">
            <MessageSquareLock size={12} className="mr-1" />
            Private chat requests
          </Badge>
          <CardTitle className="mt-3 font-display text-3xl">Requests</CardTitle>
          <CardDescription className="mt-2 max-w-3xl text-base">
            Private chat should feel like a natural continuation of a useful public exchange. Review each request with that standard in mind.
          </CardDescription>
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
          <CardTitle>Incoming requests</CardTitle>
          <CardDescription>
            Accept, decline, block, or report. Private conversations only open after you choose to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {receivedRequests.length ? (
            receivedRequests.map((request) => (
              <article key={request.id} className="rounded-[24px] border border-silver/14 bg-background/18 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-medium text-foreground">
                        {request.requester.name ?? request.requester.email}
                      </p>
                      <Badge variant="outline" className="text-muted">
                        {request.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted">
                      {request.requester.companyName || request.requester.headline || "Member"}
                    </p>
                    {request.origin?.postTitle ? (
                      <p className="text-sm text-muted">
                        Community origin: {request.origin.postTitle}
                      </p>
                    ) : null}
                    {request.introMessage ? (
                      <p className="rounded-2xl border border-silver/14 bg-background/22 px-4 py-3 text-sm leading-7 text-foreground/90">
                        {request.introMessage}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted">Sent {formatDate(request.createdAt)}</p>
                  </div>

                  {request.status === "PENDING" ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={respondToDirectMessageRequestAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="action" value="accept" />
                        <input type="hidden" name="returnPath" value="/messages/requests" />
                        <Button type="submit">Accept request</Button>
                      </form>
                      <form action={respondToDirectMessageRequestAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="action" value="decline" />
                        <input type="hidden" name="returnPath" value="/messages/requests" />
                        <Button type="submit" variant="outline">Decline request</Button>
                      </form>
                      <form action={respondToDirectMessageRequestAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="action" value="block" />
                        <input type="hidden" name="returnPath" value="/messages/requests" />
                        <Button type="submit" variant="ghost">Block user</Button>
                      </form>
                    </div>
                  ) : request.threadId ? (
                    <a href={`/messages/${request.threadId}`}>
                      <Button variant="outline">Open conversation</Button>
                    </a>
                  ) : null}
                </div>

                {request.status === "PENDING" ? (
                  <details className="mt-4 rounded-2xl border border-silver/14 bg-background/14 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">
                      Report sender
                    </summary>
                    <form action={reportDirectMessageAction} className="mt-4 space-y-3">
                      <input type="hidden" name="reportedUserId" value={request.requester.id} />
                      <input type="hidden" name="returnPath" value="/messages/requests" />
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`reason-${request.id}`}>Reason</Label>
                          <Select id={`reason-${request.id}`} name="reason" defaultValue="OTHER">
                            <option value="SPAM">Spam</option>
                            <option value="ABUSE">Abuse</option>
                            <option value="HARASSMENT">Harassment</option>
                            <option value="OTHER">Other</option>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`detail-${request.id}`}>Detail</Label>
                          <Input id={`detail-${request.id}`} name="detail" placeholder="What should the team know?" />
                        </div>
                      </div>
                      <Button type="submit" variant="outline">
                        <Flag size={14} className="mr-2" />
                        Submit report
                      </Button>
                    </form>
                  </details>
                ) : null}
              </article>
            ))
          ) : (
            <EmptyState
              icon={MessageSquareLock}
              title="No incoming requests"
              description="When a member asks to continue a community conversation privately, it will appear here."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requests you sent</CardTitle>
          <CardDescription>
            Review what is still pending and reopen any private thread that has already been accepted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sentRequests.length ? (
            sentRequests.map((request) => (
              <article key={request.id} className="rounded-[22px] border border-silver/14 bg-background/18 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {request.recipient.name ?? request.recipient.email}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {request.status.replaceAll("_", " ")} · {formatDate(request.createdAt)}
                    </p>
                  </div>

                  {request.threadId ? (
                    <a href={`/messages/${request.threadId}`}>
                      <Button variant="outline" size="sm">
                        Open thread
                      </Button>
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted">No private chat requests sent yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
